-- Origyn seller/business contract
-- Establishes a seller profile without replacing products.seller_id.
-- products.seller_id remains the authoritative commerce seller reference.
-- Run after 001_core_platform_publisher_products.sql.

CREATE TABLE IF NOT EXISTS seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    seller_type TEXT NOT NULL DEFAULT 'external'
        CHECK (seller_type IN ('origyn', 'external')),
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'IN',
    principal_address TEXT,
    website_url TEXT,
    customer_care_email TEXT,
    customer_care_phone TEXT,
    grievance_officer_name TEXT,
    grievance_officer_email TEXT,
    grievance_officer_phone TEXT,
    gstin TEXT,
    pan TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'suspended', 'rejected')),
    verified_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        verification_status <> 'verified'
        OR verified_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_type
    ON seller_profiles(seller_type);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_active
    ON seller_profiles(active);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification
    ON seller_profiles(verification_status);

DROP TRIGGER IF EXISTS trg_seller_profiles_updated_at ON seller_profiles;
CREATE TRIGGER trg_seller_profiles_updated_at
BEFORE UPDATE ON seller_profiles
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Prevent an external seller from being attached to an Origyn-owned product,
-- while still allowing Origyn member products to have an independent seller.
CREATE OR REPLACE FUNCTION validate_product_seller_contract()
RETURNS TRIGGER AS $$
DECLARE
    seller_kind TEXT;
BEGIN
    SELECT seller_type
    INTO seller_kind
    FROM seller_profiles
    WHERE user_id = NEW.seller_id
      AND active = TRUE;

    IF seller_kind IS NULL THEN
        RAISE EXCEPTION 'Product seller must have an active seller profile';
    END IF;

    IF NEW.ecosystem_status = 'origyn_owned' AND seller_kind <> 'origyn' THEN
        RAISE EXCEPTION 'Origyn-owned products must use an Origyn seller profile';
    END IF;

    IF NEW.ecosystem_status <> 'origyn_owned' AND seller_kind = 'origyn' THEN
        RAISE EXCEPTION 'External/member products must not use the Origyn seller profile';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_product_seller_contract ON products;
CREATE TRIGGER trg_validate_product_seller_contract
BEFORE INSERT OR UPDATE OF seller_id, ecosystem_status ON products
FOR EACH ROW EXECUTE FUNCTION validate_product_seller_contract();

-- Seller profile changes can affect the validity of products linked to that seller.
CREATE OR REPLACE FUNCTION validate_seller_profile_product_contract()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.seller_type <> OLD.seller_type OR NEW.active <> OLD.active THEN
        IF EXISTS (
            SELECT 1
            FROM products p
            WHERE p.seller_id = NEW.user_id
              AND p.ecosystem_status = 'origyn_owned'
              AND (NEW.seller_type <> 'origyn' OR NEW.active = FALSE)
        ) THEN
            RAISE EXCEPTION 'Cannot deactivate/change an Origyn seller profile while it owns Origyn products';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM products p
            WHERE p.seller_id = NEW.user_id
              AND p.ecosystem_status <> 'origyn_owned'
              AND (NEW.seller_type = 'origyn' OR NEW.active = FALSE)
        ) THEN
            RAISE EXCEPTION 'Cannot deactivate/change an external seller profile while it owns external/member products';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_seller_profile_product_contract ON seller_profiles;
CREATE TRIGGER trg_validate_seller_profile_product_contract
BEFORE UPDATE OF seller_type, active ON seller_profiles
FOR EACH ROW EXECUTE FUNCTION validate_seller_profile_product_contract();
