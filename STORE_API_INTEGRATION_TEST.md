# Store API integration test

1. Start Ninad's backend on `http://localhost:5000`.
2. Open `store.html` from this branch through the normal frontend dev server.
3. Confirm the Store loads published products from `GET /api/products?limit=100`.
4. Confirm `Origyn Test Product` appears at ₹2,499.
5. Confirm search, category filters, sorting, product modal, similar products, local cart, and local saved state still work.
6. Confirm refreshing the Store reloads products from the backend rather than the 12 demo products.

The Store API layer currently uses only public product endpoints. Authenticated wishlist/checkout/payment integration remains for the dedicated commerce integration phase.
