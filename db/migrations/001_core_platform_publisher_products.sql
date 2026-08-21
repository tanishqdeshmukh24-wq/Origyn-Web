-- Origyn core platform + publisher/product migration
-- Safe to run after db/schema.sql. No order, cart, wishlist, review or payment tables are changed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('customer', 'publisher', 'seller', 'admin'));
END $$;

CREATE TABLE IF NOT EXISTS publishers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    bio TEXT,
    website_url TEXT,
    logo_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    origyn_member BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(token_hash) WHERE revoked_at IS NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS publisher_id UUID REFERENCES publishers(id) ON DELETE RESTRICT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ecosystem_status TEXT NOT NULL DEFAULT 'external';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'products'::regclass AND conname = 'products_ecosystem_status_check'
    ) THEN
        ALTER TABLE products DROP CONSTRAINT products_ecosystem_status_check;
    END IF;
    ALTER TABLE products ADD CONSTRAINT products_ecosystem_status_check
        CHECK (ecosystem_status IN ('origyn_owned', 'origyn_member', 'external'));
END $$;

CREATE INDEX IF NOT EXISTS idx_products_publisher ON products(publisher_id);
CREATE INDEX IF NOT EXISTS idx_products_ecosystem ON products(ecosystem_status);
CREATE INDEX IF NOT EXISTS idx_products_published_created ON products(status, created_at DESC);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, position)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, position);

CREATE TABLE IF NOT EXISTS product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    UNIQUE(product_id, name),
    UNIQUE(product_id, position)
);

CREATE TABLE IF NOT EXISTS product_option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    UNIQUE(option_id, value),
    UNIQUE(option_id, position)
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku TEXT,
    name TEXT,
    price_paise BIGINT CHECK (price_paise >= 0),
    stock_mode TEXT NOT NULL DEFAULT 'limited' CHECK (stock_mode IN ('limited', 'unlimited')),
    stock_quantity INTEGER CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    option_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    UNIQUE(product_id, position)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variant_sku
    ON product_variants(product_id, sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    stock_mode TEXT NOT NULL DEFAULT 'limited' CHECK (stock_mode IN ('limited', 'unlimited')),
    stock_quantity INTEGER CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('shipping', 'download', 'account', 'api', 'service')),
    fulfilment_note TEXT
);

CREATE TABLE IF NOT EXISTS product_shipping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    ships_from TEXT,
    processing_time TEXT,
    shipping_config JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS product_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    refund_policy TEXT NOT NULL DEFAULT 'standard' CHECK (refund_policy IN ('standard', 'no-refund', 'custom')),
    seller_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    custom_policy TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id, position);
CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id, position);

-- Keep the existing products.stock column synchronized for legacy consumers.
-- Variant-aware inventory remains authoritative in product_inventory/product_variants.
CREATE OR REPLACE FUNCTION sync_product_stock_from_inventory()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock = CASE
        WHEN NEW.stock_mode = 'unlimited' THEN NULL
        ELSE NEW.stock_quantity
    END,
    updated_at = NOW()
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_stock_from_inventory ON product_inventory;
CREATE TRIGGER trg_sync_product_stock_from_inventory
AFTER INSERT OR UPDATE OF stock_mode, stock_quantity ON product_inventory
FOR EACH ROW EXECUTE FUNCTION sync_product_stock_from_inventory();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_publishers_updated_at ON publishers;
CREATE TRIGGER trg_publishers_updated_at BEFORE UPDATE ON publishers
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
