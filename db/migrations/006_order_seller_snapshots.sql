-- Origyn historical seller snapshot.
-- Captures the seller state at checkout so later seller-profile edits do not
-- rewrite the seller identity/details associated with an existing transaction.
-- Sensitive tax identifiers (PAN/GSTIN) are intentionally excluded from this
-- customer-facing transaction snapshot; restricted invoice/tax records should
-- own tax-document data when invoicing is implemented.

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS seller_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_order_items_seller
    ON order_items(seller_id);

CREATE OR REPLACE FUNCTION commerce_set_order_item_seller_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    seller_row RECORD;
BEGIN
    -- Seller identity is immutable for a historical order item.
    IF TG_OP = 'UPDATE' THEN
        NEW.seller_id = OLD.seller_id;
        NEW.seller_snapshot = OLD.seller_snapshot;
        RETURN NEW;
    END IF;

    SELECT
        u.id AS seller_user_id,
        u.name AS seller_user_name,
        sp.id AS seller_profile_id,
        sp.seller_type,
        sp.legal_name,
        sp.display_name,
        sp.country_code,
        sp.principal_address,
        sp.website_url,
        sp.customer_care_email,
        sp.customer_care_phone,
        sp.grievance_officer_name,
        sp.grievance_officer_email,
        sp.grievance_officer_phone
    INTO seller_row
    FROM users u
    LEFT JOIN seller_profiles sp ON sp.user_id = u.id
    WHERE u.id = NEW.seller_id;

    IF seller_row.seller_user_id IS NULL THEN
        RAISE EXCEPTION 'Seller user % does not exist', NEW.seller_id
            USING ERRCODE = '23503';
    END IF;

    NEW.seller_snapshot = jsonb_build_object(
        'seller_user_id', seller_row.seller_user_id,
        'seller_user_name', seller_row.seller_user_name,
        'seller_profile_id', seller_row.seller_profile_id,
        'seller_type', seller_row.seller_type,
        'legal_name', seller_row.legal_name,
        'display_name', seller_row.display_name,
        'country_code', seller_row.country_code,
        'principal_address', seller_row.principal_address,
        'website_url', seller_row.website_url,
        'customer_care_email', seller_row.customer_care_email,
        'customer_care_phone', seller_row.customer_care_phone,
        'grievance_officer_name', seller_row.grievance_officer_name,
        'grievance_officer_email', seller_row.grievance_officer_email,
        'grievance_officer_phone', seller_row.grievance_officer_phone
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_seller_snapshot ON order_items;
CREATE TRIGGER trg_order_items_seller_snapshot
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION commerce_set_order_item_seller_snapshot();
