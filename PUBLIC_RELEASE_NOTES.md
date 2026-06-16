# Public Release Notes

This ZIP was prepared for GitHub public-repo cleanup.

## Changes made

- Replaced/fixed `README.md` live-link formatting.
- Fixed README screenshot paths to `assets/screenshots/...`.
- Added `.gitignore` for `node_modules`, `.env`, build folders, logs, and editor files.
- Removed obvious temporary `console.log()` debug lines from shared/client scripts.
- Fixed the legacy `orders.html` logout typo before moving it to `legacy/`.
- Removed an old reset-password testing comment.
- Moved old standalone `products.html/products.js/orders.html/orders.js` to `legacy/` because the current public demo uses `dashboard.html` as the unified Seller Hub.

## Notes

- The repository still contains a Supabase `sb_publishable_...` browser key. This is expected for a frontend Supabase app. Do not add any `service_role` key.
- This cleanup does not audit live Supabase RLS policies. Before going public, confirm your Supabase project policies are safe for public frontend access.
