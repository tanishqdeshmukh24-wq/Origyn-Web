Store API integration is implemented on `store-api-integration`.

Implementation:
- shared `origyn-api.js` client
- published products from Ninad API
- price conversion from paise to INR
- dynamic Store cards and ecosystem cards
- real product detail endpoint
- existing UI/search/filter/sort/modal preserved
- local cart and saved-product behavior preserved for now

Do not merge to master until the local smoke test in `STORE_API_INTEGRATION_TEST.md` passes.
