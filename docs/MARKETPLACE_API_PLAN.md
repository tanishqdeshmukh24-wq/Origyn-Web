# Origyn Marketplace API Plan

## Product model
Origyn is a general marketplace. Technology is the flagship category, but sellers can publish any legitimate product using the `Other` category when needed.

The frontend should never talk directly to PostgreSQL. Both the Store and Publisher frontends will communicate with the same backend API.

```text
Store frontend ─────┐
                    ├──> Origyn API ───> PostgreSQL
Publisher frontend ─┘
```

## Core resources

- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` — seller publishing flow
- `PATCH /api/products/:id` — seller/admin management
- `GET /api/sellers/:id/products`
- `POST /api/orders`
- `GET /api/orders/:id`
- `GET /api/me/products` — purchased/owned products
- `GET /api/me/entitlements` — digital/software/AI access

Authentication should be added before production seller/customer actions are exposed.

## Product types

The product model supports:

- physical
- digital
- software
- ai_model
- dataset
- api
- service
- other

This lets the same marketplace support a laptop, a shirt, an AI model, a dataset, or a developer API without creating separate marketplaces.

## Ownership / entitlement

A successful purchase creates an order item. For products that grant ongoing digital access, the backend creates an entitlement linking:

`customer -> product -> order item`

Examples:

- physical product: order + fulfillment/tracking
- downloadable AI model: order + active entitlement + download access
- hosted AI/API: order + active entitlement + account/API access
- software: order + active entitlement + license/download access

## Commission

Commission is stored on the order item at the time of purchase so historical orders do not change if Origyn later changes category rates.

Initial planning defaults in `db/schema.sql` are deliberately adjustable. They are product/business-policy starting points, not legal, tax, or payment-provider advice.

## Migration note

The old `/api/technologies` endpoint and `technologies` table are legacy compatibility code. Do not build new frontend features around them. The next implementation phase should migrate to the generic `products` model.
