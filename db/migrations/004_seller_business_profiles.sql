-- Origyn seller/business contract
-- Establishes seller metadata without replacing products.seller_id.
-- products.seller_id remains the authoritative commerce seller reference.
-- Run after 001_core_platform_publisher_products.sql.
--
-- IMPORTANT: seller/product ownership rules are enforced by application
-- workflows for now, because existing products may predate seller profiles.
-- This migration deliberately does not add a trigger that would invalidate
-- legacy products until their seller profiles have been onboarded.

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
