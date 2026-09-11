# KENJAV Wholesale Portal

This is the shopkeeper-only portal. Shopkeepers create their own accounts here. The admin does **not** log in here; admin management remains in the existing KENJAV Admin panel at `/admin` on the main website.

Set `VITE_API_URL` to the single Render backend URL.


The portal includes reusable catalogue components for product cards, product images, a wholesale cart drawer, floating cart button, and order confirmation modal. Shopkeepers create their own accounts and place wholesale orders from the Products page.


## Shopkeeper ordering flow

The Wholesale Portal is shopkeeper-only. There is no admin login in this app. A shopkeeper can create an account, sign in, browse the wholesale catalogue, add products to a cart, adjust quantities using each product's minimum order quantity, review the cart, and place a wholesale order. Orders are stored in the same PostgreSQL database used by the existing KENJAV Admin Panel. Admins manage the resulting wholesale orders from the existing Admin Panel.

Reusable UI components live in `src/components/` and include the product image/card, cart drawer, floating cart button, and order confirmation modal.
