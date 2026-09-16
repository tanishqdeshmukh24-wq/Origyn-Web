-- Auditable commission records for marketplace transactions.
-- One ledger row is created per order item at checkout, preserving the
-- commission policy and monetary calculation used for that transaction.
-- Status moves from pending to earned only after successful payment capture.
-- Cancelled rows remain as history and are never deleted.

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
