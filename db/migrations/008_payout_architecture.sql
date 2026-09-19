-- Provider-independent payout records for seller earnings.
-- This is an internal ledger/state model; it does not move money.
-- Actual transfers must be performed by an authorized payment provider
-- under the final marketplace/payment architecture.

CREATE TABLE IF NOT EXISTS seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    currency CHAR(3) NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    status TEXT NOT NULL DEFAULT 'eligible' CHECK (
        status IN ('eligible','pending','processing','paid','failed','cancelled','on_hold')
    ),
    provider TEXT,
    provider_payout_id TEXT,
    failure_code TEXT,
    failure_reason TEXT,
    requested_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_payout_id),
    CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR status <> 'paid')
);

CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(status);

CREATE TABLE IF NOT EXISTS seller_payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES seller_payouts(id) ON DELETE RESTRICT,
    commission_ledger_id UUID NOT NULL UNIQUE REFERENCES commission_ledger(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_payout_items_payout ON seller_payout_items(payout_id);

CREATE OR REPLACE FUNCTION commerce_seller_payout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seller_payouts_updated_at ON seller_payouts;
CREATE TRIGGER trg_seller_payouts_updated_at
BEFORE UPDATE ON seller_payouts
FOR EACH ROW EXECUTE FUNCTION commerce_seller_payout_updated_at();

-- A payout item may only use the seller's currently earned, unpaid commission.
-- The amount must equal the remaining seller payout recorded by the commission
-- ledger. This keeps the provider-independent payout layer auditable.
CREATE OR REPLACE FUNCTION commerce_validate_seller_payout_item()
RETURNS TRIGGER AS $$
DECLARE
    ledger_seller UUID;
    ledger_amount BIGINT;
    already_allocated BIGINT;
BEGIN
    SELECT seller_id, seller_payout_paise
      INTO ledger_seller, ledger_amount
      FROM commission_ledger
     WHERE id = NEW.commission_ledger_id
       AND status = 'earned';

    IF ledger_seller IS NULL THEN
        RAISE EXCEPTION 'Commission ledger entry is not earned or does not exist' USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(SUM(amount_paise),0)
      INTO already_allocated
      FROM seller_payout_items
     WHERE commission_ledger_id = NEW.commission_ledger_id;

    IF NEW.amount_paise + already_allocated > ledger_amount THEN
        RAISE EXCEPTION 'Payout allocation exceeds seller earnings' USING ERRCODE = '23514';
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
FOR EACH ROW EXECUTE FUNCTION commerce_validate_seller_payout_item();

-- Keep the payout header total equal to its line allocations.
CREATE OR REPLACE FUNCTION commerce_validate_seller_payout_total()
RETURNS TRIGGER AS $$
DECLARE
    allocated BIGINT;
BEGIN
    SELECT COALESCE(SUM(amount_paise),0)
      INTO allocated
      FROM seller_payout_items
     WHERE payout_id = NEW.payout_id;

    IF allocated > (SELECT amount_paise FROM seller_payouts WHERE id = NEW.payout_id) THEN
        RAISE EXCEPTION 'Payout item total exceeds payout amount' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_seller_payout_total ON seller_payout_items;
CREATE TRIGGER trg_validate_seller_payout_total
AFTER INSERT OR UPDATE ON seller_payout_items
FOR EACH ROW EXECUTE FUNCTION commerce_validate_seller_payout_total();
