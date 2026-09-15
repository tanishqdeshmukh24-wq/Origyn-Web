# Origyn Core Platform + Publisher + Product API

This document is the integration contract for Ninad's backend. It intentionally does **not** own cart, wishlist, reviews, orders, checkout or payments.

## Setup

1. Install Node.js and PostgreSQL.
2. `npm install`
3. Create `.env` from `.env.example`; never commit the real `.env`.
4. Run `db/schema.sql` once for the existing marketplace foundation.
5. Run `db/migrations/001_core_platform_publisher_products.sql`.
6. `npm run check`
7. `npm run dev` (or `npm start`).

The API defaults to `http://localhost:5000`.

## Authentication

Send authenticated requests with:

`Authorization: Bearer <token>`

Endpoints:

- `POST /api/auth/register` — `{ email, password, name, role: "customer" | "publisher", publisher?: {...} }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Passwords are bcrypt-hashed. Login creates a server-recorded session. Logout revokes that session. A stolen/old JWT is rejected after its session is revoked or expires.

## Publishers

- `GET /api/publishers/:id`
- `GET /api/publishers/:id/products` — public, published products only
- `PATCH /api/publishers/me/profile` — publisher only
- `GET /api/me/products?status=draft|published|archived` — publisher's management view

`verified` and `origyn_member` are server-owned publisher fields; public self-registration cannot grant either flag.

## Product create/update body

```json
{
  "name": "VisionAI Pro",
  "description": "Computer vision software for teams.",
  "product_type": "software",
  "category_slug": "technology",
  "price": 2499,
  "currency": "INR",
  "metadata": { "version": "1.0" },
  "images": [
    { "url": "https://cdn.example.com/product/hero.webp", "alt_text": "VisionAI dashboard", "is_primary": true }
  ],
  "options": [
    { "name": "Edition", "values": ["Starter", "Pro"] }
  ],
  "variants": [
    { "sku": "VISION-PRO", "name": "Pro", "price": 3999, "stock_mode": "unlimited", "option_values": { "Edition": "Pro" } }
  ],
  "inventory": { "stock_mode": "unlimited", "is_available": true },
  "delivery": { "method": "account", "fulfilment_note": "Access is activated after purchase" },
  "policies": { "refund_policy": "standard", "seller_rights_confirmed": true }
}
```

For physical shipping, use `delivery.method = "shipping"` and add:

```json
{
  "shipping": {
    "ships_from": "Pune, Maharashtra",
    "processing_time": "1-2",
    "config": { "domestic": true }
  }
}
```

Images are stored as URLs plus ordering/primary metadata. Image binaries belong in object/CDN storage; this API deliberately does not put binary blobs in PostgreSQL.

Options are flexible (`Size`, `Color`, `Model`, `Storage`, `Edition`, custom names). Variant `option_values` records a concrete combination without hardcoding option types.

## Product lifecycle

- `POST /api/products` — publisher/admin; creates **draft** only
- `PATCH /api/products/:id` — owner/admin; edits product and supplied child configuration
- `POST /api/products/:id/publish` — owner/admin; re-validates the stored product, then publishes
- `POST /api/products/:id/archive` — owner/admin
- `DELETE /api/products/:id` — owner/admin; only non-published products. Published products must be archived.

The frontend cannot set official published status during create/update. Public store endpoints return published products only.

## Store/discovery

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/categories`

`GET /api/products` query parameters:

- `q` — name/description search (PostgreSQL `ILIKE`, intentionally simple v1)
- `category` — category slug or UUID
- `product_type`
- `publisher_id`
- `ecosystem_status=origyn_owned|origyn_member|external`
- `verified_publisher=true`
- `page` (default 1)
- `limit` (default 20, max 100)

Response:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```

A product response includes category, publisher verification/member metadata, images, flexible options, variants, inventory, delivery, shipping (when applicable), and policies.

## Authorization contract for other developers

Do not infer publisher ownership from UI state. The API checks the authenticated user's publisher ID against `products.publisher_id` on mutation. Customers cannot create/edit/publish/archive products. Publisher verification and Origyn membership are returned by the API and must be treated as server truth.

Commerce modules should consume published product IDs, `price_paise`, `currency`, inventory/variant data and delivery method through this API/database contract. They should not duplicate product ownership or publication logic.

## Ecosystem metadata

`products.ecosystem_status` values:

- `origyn_owned`
- `origyn_member`
- `external`

Publisher registration defaults to external unless server-side membership data says otherwise. Only an admin-level backend operation should promote ecosystem status or publisher verification/membership.

## Remaining limitations

- Image upload to S3/R2/Cloudinary is not included; URL metadata is ready for whichever object-storage provider is selected.
- Search is `ILIKE`, not typo-tolerant/fuzzy search yet.
- Email verification, password-reset email, MFA and OAuth are not implemented.
- Admin verification/membership management endpoints are intentionally not exposed until the team defines admin identity/governance.
- Existing frontend still needs a thin integration layer to call these APIs instead of local draft-only behavior. The frontend itself was not redesigned or rewritten.
