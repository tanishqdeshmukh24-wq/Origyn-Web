-- Versioned seller agreement records and immutable acceptance history.
-- Legal/business wording is intentionally stored as data so approved terms can
-- be changed without rewriting historical acceptances.
-- Run after 004_seller_business_profiles.sql.

CREATE TABLE IF NOT EXISTS seller_agreement_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_key TEXT NOT NULL,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agreement_key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_seller_agreement
    ON seller_agreement_versions(agreement_key)
    WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS seller_agreement_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
    agreement_version_id UUID NOT NULL REFERENCES seller_agreement_versions(id) ON DELETE RESTRICT,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (seller_profile_id, agreement_version_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_agreement_acceptances_seller
    ON seller_agreement_acceptances(seller_profile_id);

CREATE INDEX IF NOT EXISTS idx_seller_agreement_acceptances_version
    ON seller_agreement_acceptances(agreement_version_id);
