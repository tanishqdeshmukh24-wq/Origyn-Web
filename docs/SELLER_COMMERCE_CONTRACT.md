# Origyn Seller-of-Record & Commerce Contract

## Purpose

Origyn is a hybrid technology marketplace. A product can be supplied by a publisher and sold either by an independent seller or by Origyn itself. Commerce must therefore resolve seller identity per product and preserve that identity on each order item.

## Core identities

### Publisher

`products.publisher_id` identifies the publisher/supplier associated with the product. A publisher can be an Origyn member or an external publisher.

### Seller

`products.seller_id` identifies the commerce seller for the product. The seller is the party associated with the commercial sale and payout record for that product.

`seller_profiles.seller_type` is currently:

- `origyn` — Origyn is the seller for the product.
- `external` — an independent seller is the seller for the product.

## Product ownership contract

| ecosystem_status | seller_type | Meaning |
|---|---|---|
| `origyn_owned` | `origyn` | Origyn supplies/owns and sells the product. |
| `origyn_member` | `external` | An Origyn-member publisher supplies the product, while an independent seller is the commerce seller. |
| `external` | `external` | An external publisher/supplier product sold by an independent seller. |

The current database contract intentionally rejects an external seller for an `origyn_owned` product and rejects the Origyn seller profile for member/external products. This is an implementation invariant, not a determination of legal ownership or tax treatment.

## Seller-of-record rule

For an order item:

```text
order_item.seller_id = product.seller_id at checkout
```

The customer-facing order must never accept a seller ID from the browser. The server resolves the seller from the authoritative product record.

The seller associated with an order item must remain historically attributable even if the product, publisher, or seller profile changes later. Order-item seller snapshots should therefore be added before production invoicing/payout implementation.

## Publisher vs seller

Do not assume:

```text
publisher_id == seller_id
```

They represent different responsibilities in Origyn's architecture.

Example:

```text
External publisher
       |
       v
    Product
       |
       +---- publisher_id -> Publisher
       |
       +---- seller_id    -> Independent Seller
                                  |
                                  v
                              Order Item
```

For an Origyn-owned product:

```text
Origyn publisher/supplier
       |
       v
    Product
       |
       +---- seller_id -> Origyn seller profile
```

## Commerce calculation

At checkout the server must:

1. Authenticate the customer.
2. Load the cart from the database.
3. Load each authoritative product and selected variant.
4. Require the product to be published and available.
5. Resolve the seller from the product record.
6. Resolve the applicable commission rule.
7. Calculate the authoritative unit price and line total.
8. Create the order item with seller ID and immutable commercial snapshots.
9. Reserve limited physical inventory where applicable.
10. Create the payment record.

The browser must not be trusted for seller ID, publisher ID, price, commission, payout, inventory, order total, payment status, or permissions.

## Commission

Commission is a platform policy value used for commerce calculation. Existing `commission_rules` are starting configuration values only and are **not** a legal, tax, or accounting determination.

For each order item:

```text
gross = unit_price × quantity
commission = gross × applicable_commission_rate
seller_payout = gross - commission
```

All monetary values are stored in integer paise. The final accounting/tax treatment must be confirmed by Origyn's accountant/tax professional before production payouts.

## Refund implications

Refunds must be tied to the original order/payment and must not recompute historical seller ownership from the current product record.

A product's seller or publisher may change in the catalog later; that must not rewrite the seller identity or monetary snapshots of an existing order.

## Product fulfilment

Seller ownership and fulfilment are separate concepts:

- physical → shipping/delivery
- digital → download/access entitlement
- software → account/license access
- AI model → license/API/download/access
- dataset → download/access/license
- API → API/license access
- service → service fulfilment

Do not force every seller/product through a physical shipping workflow.

## Required seller onboarding before production

Before an external seller can transact in production, Origyn should have a reviewed onboarding process covering, as applicable:

- seller identity/business information
- verification status
- customer-care contact
- grievance/contact information
- tax information required for the applicable seller
- payout information
- seller agreement
- product/content rights confirmation
- applicable refund/fulfilment obligations

The exact legal/tax fields and evidence requirements must be finalized with Origyn's Indian legal/tax advisors.

## Production payment gate

A real payment provider and seller payout flow must not be selected solely from the code architecture. Before production payment integration, Origyn must finalize:

1. marketplace vs inventory treatment for each product class;
2. seller-of-record and contractual responsibility;
3. GST/invoicing/TCS treatment with the tax advisor;
4. consumer/refund/cancellation obligations;
5. seller verification and payout requirements;
6. provider marketplace/split-payment capabilities and account structure;
7. privacy/data-processing requirements.

The current provider-independent payment architecture can continue to be developed while these decisions are finalized.
