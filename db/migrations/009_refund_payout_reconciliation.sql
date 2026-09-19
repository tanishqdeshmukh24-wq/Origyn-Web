-- Refund-aware seller earnings reconciliation.
-- This migration does not move money. It records how successful customer
-- refunds reduce seller earnings that are still payable, and creates a
-- recoverable seller balance only when the affected seller earnings were
-- already paid.

ALTER TABLE commission_ledger
    ADD COLUMN IF NOT EXISTS refunded_paise BIGINT NOT NULL DEFAULT 0 CHECK (refunded_paise >= 0);

ALTER TABLE commission_ledger
    ADD COLUMN IF NOT EXISTS recoverable_paise BIGINT NOT NULL DEFAULT 0 CHECK (recoverable_paise >= 0);

CREATE TABLE IF NOT EXISTS commission_refund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_ledger_id UUID NOT NULL REFERENCES commission_ledger(id) ON DELETE RESTRICT,
    refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (commission_ledger_id, refund_id)
);

CREATE INDEX IF NOT EXISTS idx_commission_refund_allocations_refund
    ON commission_refund_allocations(refund_id);
CREATE INDEX IF NOT EXISTS idx_commission_refund_allocations_ledger
    ON commission_refund_allocations(commission_ledger_id);

CREATE OR REPLACE FUNCTION commerce_reconcile_successful_refund()
RETURNS TRIGGER AS $$
DECLARE
    remaining_refund BIGINT := NEW.amount_paise;
    ledger_row RECORD;
    seller_share BIGINT;
    allocated BIGINT;
    allocation BIGINT;
    inserted_rows INTEGER;
    paid_before BIGINT;
    newly_recoverable BIGINT;
BEGIN
    IF NEW.status <> 'succeeded' OR OLD.status = 'succeeded' THEN
        RETURN NEW;
    END IF;

    FOR ledger_row IN
        SELECT cl.id, cl.seller_payout_paise, cl.refunded_paise,
               COALESCE(SUM(sra.amount_paise), 0) AS allocated_refunds
          FROM commission_ledger cl
          JOIN order_items oi ON oi.id = cl.order_item_id
          LEFT JOIN commission_refund_allocations sra
            ON sra.commission_ledger_id = cl.id
         WHERE cl.order_id = NEW.order_id
         GROUP BY cl.id, cl.seller_payout_paise, cl.refunded_paise, cl.created_at
         ORDER BY cl.created_at, cl.id
    LOOP
        EXIT WHEN remaining_refund <= 0;

        seller_share := ledger_row.seller_payout_paise;
        allocated := ledger_row.allocated_refunds;
        IF allocated >= seller_share THEN
            CONTINUE;
        END IF;

        allocation := LEAST(remaining_refund, seller_share - allocated);

        -- Only money already paid to the seller becomes a recoverable seller
        -- balance. If the payout has not been paid, the refund simply reduces
        -- the amount that may be paid later.
        SELECT COALESCE(SUM(sra.amount_paise), 0)
          INTO paid_before
          FROM seller_payout_items sra
          JOIN seller_payouts sp ON sp.id = sra.payout_id
         WHERE sra.commission_ledger_id = ledger_row.id
           AND sp.status = 'paid';

        INSERT INTO commission_refund_allocations(
            commission_ledger_id, refund_id, amount_paise
        ) VALUES (
            ledger_row.id, NEW.id, allocation
        ) ON CONFLICT (commission_ledger_id, refund_id) DO NOTHING;

        GET DIAGNOSTICS inserted_rows = ROW_COUNT;
        IF inserted_rows = 0 THEN
            CONTINUE;
        END IF;

        newly_recoverable := LEAST(allocation, GREATEST(paid_before - ledger_row.refunded_paise, 0));

        UPDATE commission_ledger
           SET refunded_paise = refunded_paise + allocation,
               recoverable_paise = recoverable_paise + newly_recoverable,
               status = CASE
                   WHEN refunded_paise + allocation >= seller_payout_paise THEN 'refunded'
                   ELSE 'partially_refunded'
               END,
               updated_at = NOW()
         WHERE id = ledger_row.id;

        remaining_refund := remaining_refund - allocation;
    END LOOP;

    -- Any refund amount beyond seller earnings belongs to other transaction
    -- components (for example platform commission/tax) and is intentionally
    -- not silently charged to the seller. Its accounting treatment belongs in
    -- the eventual tax/invoice reconciliation layer.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_successful_refund_payout_reconciliation ON refunds;
CREATE TRIGGER trg_successful_refund_payout_reconciliation
AFTER UPDATE OF status ON refunds
FOR EACH ROW EXECUTE FUNCTION commerce_reconcile_successful_refund();

-- Payouts must never include earnings already consumed by a successful refund.
CREATE OR REPLACE FUNCTION commerce_validate_seller_payout_item_v2()
RETURNS TRIGGER AS $$
DECLARE
    ledger_seller UUID;
    ledger_amount BIGINT;
    refunded BIGINT;
    allocated BIGINT;
BEGIN
    SELECT seller_id, seller_payout_paise, refunded_paise
      INTO ledger_seller, ledger_amount, refunded
      FROM commission_ledger
     WHERE id = NEW.commission_ledger_id
       AND status IN ('earned','partially_refunded');

    IF ledger_seller IS NULL THEN
        RAISE EXCEPTION 'Commission ledger entry is not payable' USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(SUM(amount_paise),0)
      INTO allocated
      FROM seller_payout_items
     WHERE commission_ledger_id = NEW.commission_ledger_id;

    IF NEW.amount_paise + allocated + refunded > ledger_amount THEN
        RAISE EXCEPTION 'Payout allocation exceeds remaining seller earnings after refunds' USING ERRCODE = '23514';
    END IF;

    IF ledger_seller <> (SELECT seller_id FROM seller_payouts WHERE id = NEW.payout_id) THEN
        RAISE EXCEPTION 'Payout seller does not match commission seller' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_seller_payout_item ON seller_payout_items;
CREATE TRIGGER trg_validate_seller_payout_item
BEFORE INSERT ON seller_payout_items
FOR EACH ROW EXECUTE FUNCTION commerce_validate_seller_payout_item_v2();
