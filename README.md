# Meka – ML Toys Theme (Dev)

### 🧱 Local Development
1. Log in:
   ```bash
   shopify auth login
   shopify config set store=ml-toys-dev.myshopify.com

### 🧾 Packing slip template
The Shopify packing slip template is version controlled here: [`docs/packing-slip.liquid`](docs/packing-slip.liquid).

**This file is NOT part of the theme and is not deployed by the theme sync or `shopify theme push`.** After changing it, copy the contents into Shopify Admin by hand:
**Settings > Shipping and delivery > Packing slips > Edit template** (paste over the existing template, then save).

Keep the repo copy and the Admin copy in sync. The template matches the `_option_names` and `Safety Notice` line item properties set by the theme, and contains a SKU-to-option-name lookup table that needs the twice-monthly refresh (see the Store Maintenance Task List).
