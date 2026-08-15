-- ORIGYN marketplace foundation
-- General marketplace model with technology as the flagship category.
-- Run this migration before wiring the frontend to the new product APIs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    product_type TEXT NOT NULL CHECK (product_type IN ('physical', 'digital', 'software', 'ai_model', 'dataset', 'api', 'service', 'other')),
    price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    stock INTEGER,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    product_type TEXT,
    rate_percent NUMERIC(5,2) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (category_id, product_type)
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded')),
    total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
    commission_rate_percent NUMERIC(5,2) NOT NULL CHECK (commission_rate_percent >= 0 AND commission_rate_percent <= 100),
    commission_paise BIGINT NOT NULL CHECK (commission_paise >= 0),
    seller_payout_paise BIGINT NOT NULL CHECK (seller_payout_paise >= 0)
);

CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    access_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_customer ON entitlements(customer_id);

-- Initial top-level marketplace categories.
INSERT INTO categories (name, slug, is_featured) VALUES
    ('Technology', 'technology', TRUE),
    ('Fashion', 'fashion', FALSE),
    ('Home & Living', 'home-living', FALSE),
    ('Gaming', 'gaming', FALSE),
    ('Books & Education', 'books-education', FALSE),
    ('Beauty & Personal Care', 'beauty-personal-care', FALSE),
    ('Sports & Fitness', 'sports-fitness', FALSE),
    ('Automotive', 'automotive', FALSE),
    ('Toys & Hobbies', 'toys-hobbies', FALSE),
    ('Jewellery & Accessories', 'jewellery-accessories', FALSE),
    ('Pet Supplies', 'pet-supplies', FALSE),
    ('Kitchen & Appliances', 'kitchen-appliances', FALSE),
    ('Art & Collectibles', 'art-collectibles', FALSE),
    ('Garden & Outdoor', 'garden-outdoor', FALSE),
    ('Other', 'other', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- Initial commission defaults. These are starting policy values, not a legal/tax determination.
INSERT INTO commission_rules (category_id, rate_percent)
SELECT id, rate FROM (VALUES
    ('technology', 8.00),
    ('fashion', 12.00),
    ('home-living', 10.00),
    ('gaming', 10.00),
    ('books-education', 8.00),
    ('beauty-personal-care', 12.00),
    ('sports-fitness', 10.00),
    ('automotive', 8.00),
    ('toys-hobbies', 12.00),
    ('jewellery-accessories', 15.00),
    ('pet-supplies', 10.00),
    ('kitchen-appliances', 10.00),
    ('art-collectibles', 12.00),
    ('garden-outdoor', 10.00),
    ('other', 10.00)
) AS seed(slug, rate)
JOIN categories c ON c.slug = seed.slug
ON CONFLICT DO NOTHING;
