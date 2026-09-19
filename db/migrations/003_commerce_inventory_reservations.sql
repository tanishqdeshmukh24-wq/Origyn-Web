-- Transactional inventory reservations for pending commerce orders.
-- Depends on 002_commerce.sql and the shared product catalog.
-- Reservations prevent concurrent checkouts from overselling limited stock before payment capture.

CREATE TABLE IF NOT EXISTS commerce_inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order
    ON commerce_inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_active
    ON commerce_inventory_reservations(product_id, variant_id, status, expires_at);

CREATE OR REPLACE FUNCTION commerce_inventory_reservation_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_reservations_updated_at ON commerce_inventory_reservations;
CREATE TRIGGER trg_inventory_reservations_updated_at
BEFORE UPDATE ON commerce_inventory_reservations
FOR EACH ROW EXECUTE FUNCTION commerce_inventory_reservation_touch_updated_at();
