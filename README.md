# Meka – ML Toys Theme

Shopify theme for ML Toys (`ml-toys-store.myshopify.com`), based on Dawn.

## Branches and themes

| Branch | Theme in Shopify | Purpose |
|---|---|---|
| `main` | `meka-mltoys/main` (#189906026817) | Source of truth. Will become the live branch once everything is sorted. |
| `meka-dev` | `meka-mltoys/meka-dev` (#189496164673) | Testing. Pushes here update the dev theme through Shopify's GitHub sync. |
| (live) | `meka-mltoys/live` (#186299777345) | The published store theme. |

Shopify's GitHub sync updates the connected theme when a branch is pushed, so no CLI push is needed for normal deploys.

## Workflow
1. Pull `main` into `meka-dev` (or a feature branch). Never commit new work straight to `main`.
2. Make changes and push the branch. Test on the dev theme.
3. Open a PR into `main` and merge once it checks out.

To make `main` match the live store (settings and JSON included), pull the live theme:
```bash
shopify theme pull --store=ml-toys-store.myshopify.com --theme=186299777345
```
Commit the result, open a PR into `main`, then merge `main` into `meka-dev`.

## Local development
1. Log in:
   ```bash
   shopify auth login
   ```
2. Always pass the store explicitly. The CLI's default store may be a different one:
   ```bash
   shopify theme list --store=ml-toys-store.myshopify.com
   shopify theme dev --store=ml-toys-store.myshopify.com
   ```
3. For code-only pushes to a test theme, leave out settings and templates:
   ```bash
   shopify theme push --store=ml-toys-store.myshopify.com --theme=<id> --ignore "config/settings_data.json" --ignore "templates/*.json"
   ```

## Packing slip template
The Shopify packing slip template is version controlled here: [`docs/packing-slip.liquid`](docs/packing-slip.liquid).

**This file is NOT part of the theme and is not deployed by the theme sync or `shopify theme push`.** After changing it, copy the contents into Shopify Admin by hand:
**Settings > Shipping and delivery > Packing slips > Edit template** (paste over the existing template, then save).

Keep the repo copy and the Admin copy in sync. The template reads the `_option_names` and `Safety Notice` line item properties set by the theme, and contains a SKU-to-option-name lookup table that needs a twice-monthly refresh (see the Store Maintenance Task List).
