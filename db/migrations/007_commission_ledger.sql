-- Auditable commission records for marketplace transactions.
-- One ledger row is created per order item at checkout, preserving the
-- commission policy and monetary calculation used for that transaction.
-- Status moves from pending to earned only after successful payment capture.
-- Historical rows are retained; no financial record is deleted.

CREATE TABLE IF NOT EXISTS commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    currency CHAR(3) NOT NULL,
    gross_paise BIGINT NOT NULL CHECK (gross_paise >= 0),
    commission_rate_percent NUMERIC(5,2) NOT NULL CHECK (commission_rate_percent >= 0 AND commission_rate_percent <= 100),
    commission_paise BIGINT NOT NULL CHECK (commission_paise >= 0),
    seller_payout_paise BIGINT NOT NULL CHECK (seller_payout_paise >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','earned','cancelled','refunded','partially_refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    earned_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (commission_paise + seller_payout_paise = gross_paise),
    CHECK ((status = 'earned' AND earned_at IS NOT NULL) OR status <> 'earned')
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_order ON commission_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_seller ON commission_ledger(seller_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_status ON commission_ledger(status);

CREATE OR REPLACE FUNCTION commerce_commission_ledger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_ledger_updated_at ON commission_ledger;
CREATE TRIGGER trg_commission_ledger_updated_at
BEFORE UPDATE ON commission_ledger
FOR EACH ROW EXECUTE FUNCTION commerce_commission_ledger_updated_at();

-- Create the ledger entry from the authoritative order-item calculation.
-- ON CONFLICT makes this safe for migration reruns and protects against
-- duplicate financial records if the application retries an insert.
CREATE OR REPLACE FUNCTION commerce_create_commission_ledger()
RETURNS TRIGGER AS $$
DECLARE
    order_currency CHAR(3);
BEGIN
    SELECT currency INTO order_currency FROM orders WHERE id = NEW.order_id;
    IF order_currency IS NULL THEN
        RAISE EXCEPTION 'Order % does not have a currency', NEW.order_id USING ERRCODE = '23503';
    END IF;

    INSERT INTO commission_ledger(
        order_id, order_item_id, seller_id, currency,
        gross_paise, commission_rate_percent, commission_paise, seller_payout_paise
    ) VALUES (
        NEW.order_id, NEW.id, NEW.seller_id, order_currency,
        NEW.unit_price_paise * NEW.quantity,
        NEW.commission_rate_percent, NEW.commission_paise, NEW.seller_payout_paise
    ) ON CONFLICT (order_item_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_commission_ledger ON order_items;
CREATE TRIGGER trg_order_items_commission_ledger
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION commerce_create_commission_ledger();

-- Payment capture is the point at which the commission becomes earned.
CREATE OR REPLACE FUNCTION commerce_mark_commission_earned()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'captured' AND OLD.status IS DISTINCT FROM 'captured' THEN
        UPDATE commission_ledger
        SET status='earned', earned_at=COALESCE(earned_at,NOW()), updated_at=NOW()
        WHERE order_id=NEW.order_id AND status='pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_commission_earned ON payments;
CREATE TRIGGER trg_payment_commission_earned
AFTER UPDATE OF status ON payments
FOR EACH ROW EXECUTE FUNCTION commerce_mark_commission_earned();

-- Backfill historical order items once, preserving the original stored
-- commission calculation rather than recomputing policy rates.
INSERT INTO commission_ledger(
    order_id, order_item_id, seller_id, currency,
    gross_paise, commission_rate_percent, commission_paise, seller_payout_paise,
    status, earned_at
)
SELECT
    oi.order_id, oi.id, oi.seller_id, o.currency,
    oi.unit_price_paise * oi.quantity,
    oi.commission_rate_percent, oi.commission_paise, oi.seller_payout_paise,
    CASE WHEN o.payment_status='paid' THEN 'earned' ELSE 'pending' END,
    CASE WHEN o.payment_status='paid' THEN COALESCE(o.updated_at, NOW()) ELSE NULL END
FROM order_items oi
JOIN orders o ON o.id=oi.order_id
LEFT JOIN commission_ledger cl ON cl.order_item_id=oi.id
WHERE cl.id IS NULL
ON CONFLICT (order_item_id) DO NOTHING;
