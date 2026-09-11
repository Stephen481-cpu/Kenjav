# KENJAV fixes applied — 10 September 2026

This version was reviewed from the uploaded KENJAV project ZIP.

## Fixed

- Fixed `LegalPage.jsx` accidental Markdown code fences that can break Vite/Rollup parsing.
- Fixed the legal page named exports so `PrivacyPolicy` and `TermsOfService` match `App.jsx` imports.
- Made the main Admin navigation responsive on small screens.
- Made the Wholesale Management navigation responsive on small screens.
- Added global horizontal-overflow protection to the main frontend.
- Added a proper Manual Sales screen to the admin Wholesale section.
- Manual Sales product name is a **text** input, not a numeric input.
- Manual Sales date uses a real date input and preserves the selected date in Kenya time.
- Manual Sales can optionally select a catalogue product; stock is checked and deducted safely.
- Manual Sales create an inventory movement when a catalogue product is selected.
- Manual Sales are added to the selected shopkeeper's ledger.
- Fixed shopkeeper deactivation so the admin is required to provide a deactivation reason.
- Fixed Kenya date handling in wholesale daily/monthly reports.
- Fixed wholesale order status transitions so an order cannot skip stock deduction or be changed after completion.
- Fixed stock return when an approved/processing/ready order is cancelled.
- Removed the incorrect unique `source_order_id` index that could cause multi-item wholesale orders to record only the first purchase item.
- Added `minimum_stock` and the inventory movement table to the canonical PostgreSQL schema.
- Fixed the unused inventory route's PostgreSQL pool import.
- Added safer wrapping for wholesale portal rows/buttons on mobile.

## Important database step

The existing database may already have the old unique index on `purchases.source_order_id`.

Run the updated:

`backend/stock_tracking.sql`

against the existing PostgreSQL database once. It now removes the incorrect unique index and creates a normal index.

## Vercel

The repository should not contain `node_modules`, `dist`, or `.env` files. Vercel should install dependencies itself.

Frontend Vercel settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
