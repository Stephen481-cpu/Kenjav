# KENJAV Mandazi Shop

Full-stack ordering site for KENJAV, a mandazi shop on Nyotu Road, Rongai, Nairobi.
"Freshness you can trust" — customers order for pickup or free delivery.

This is a real, deployable two-part project:

```
kenjav/
├── backend/    Express + MongoDB API (products, offers, orders)
└── frontend/   Vite + React storefront, order tracking, and admin panel
```

The two are fully decoupled — the frontend only talks to the backend over HTTP.
Deploy them separately (e.g. backend on Render/Railway, frontend on Vercel/Netlify),
or both on the same host if you prefer.

---

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

- `MONGODB_URI` — your MongoDB connection string (see below for getting one free).
- `JWT_SECRET` — a long random string (generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- `ADMIN_PASSWORD` — the password you (the shop owner) will use to log into `/admin`.
- `FRONTEND_URL` — your frontend's URL, for CORS.

### Getting a free MongoDB database
1. Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) and sign up free.
2. Create a free (M0) cluster.
3. Under "Database Access", create a database user with a password.
4. Under "Network Access", allow access from anywhere (0.0.0.0/0) for development.
5. Click "Connect" on your cluster → "Drivers" → copy the connection string. It looks like:
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/kenjav?retryWrites=true&w=majority`
6. Paste that as `MONGODB_URI` in `.env` (replace `<password>` with your actual database user password).

Then load the starting menu:

```bash
npm run seed      # adds the KENJAV menu + the "Buy 6 Get 1 Free" offer
npm run dev       # starts the API on http://localhost:4000
```

There's no separate migration step — MongoDB creates collections automatically the first time something is written to them, so `npm run seed` is all you need before first run.

Check it's alive: `curl http://localhost:4000/api/health` → `{"ok":true,...}`

### Data model
- **products** — menu items. `is_featured` controls whether an item shows in
  "Today's Specials". `is_active` controls whether it's visible on the site at all.
  `category` groups items for the menu filter chips (Mandazi, Ngumu, Fried Treats,
  Savory, Sweets & Bakes). `image_url` is optional — paste a link to a real photo
  and it replaces the generated icon on the site automatically.
- **offers** — the promotional banner at the top of the site (e.g. "HOT DEAL — Buy 6
  Get 1 Free"). Only one is ever active at a time.
- **orders** — placed orders, with their line items embedded directly in each
  order document. Prices are always looked up from `products` at order time on
  the server — the frontend can't set its own prices.

### API summary
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/products` | – | Active menu items |
| GET | `/api/offers` | – | The current active offer, or `null` |
| POST | `/api/orders` | – | Place an order |
| GET | `/api/orders/:code` | – | Track an order (e.g. `KJ-4821`) |
| POST | `/api/admin/login` | – | Get an admin token |
| GET/POST/PUT/DELETE | `/api/admin/products` | admin | Manage the menu |
| GET/POST/PUT/DELETE | `/api/admin/offers` | admin | Manage the promo banner |
| GET | `/api/admin/orders` | admin | See incoming orders |
| PATCH | `/api/admin/orders/:id/status` | admin | pending → preparing → ready → completed |

Admin routes need `Authorization: Bearer <token>` from the login response.

---

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

Set `VITE_API_URL` in `.env` to wherever the backend is running (e.g.
`http://localhost:4000` locally, or your deployed backend URL in production).

```bash
npm run dev      # http://localhost:5173
```

- `/` — the storefront (menu, cart, checkout)
- `/order/:code` — order tracking, e.g. `/order/KJ-4821` (this is the link a
  customer lands on right after checkout, and can revisit any time)
- `/admin` — the owner's dashboard (orders, products, offers)

Build for production with `npm run build` (outputs to `frontend/dist`).

---

## 3. What's in the storefront

- **Free delivery, always** — pickup and delivery are both KES 0 delivery fee;
  the customer just picks whichever is more convenient at checkout.
- **Floating cart** — always visible, bottom-right, so it's never more than one
  tap away; it bumps and shows a live subtotal the moment something's added.
- **Today's Specials** — pulled from whichever products you've marked
  "Today's Specials" in the admin.
- **Offer banner** — the dismissible "HOT DEAL" strip at the top, controlled
  from the admin's Offers tab. Leave it off (no active offer) and it simply
  doesn't show.
- **Order tracking** — after checkout, the customer is taken to a link with
  their order status (Pending → Preparing → Ready), which updates live as you
  change it from the admin panel.

## 4. Using the admin panel

Go to `/admin`, sign in with `ADMIN_PASSWORD`.

- **Orders** — see everything coming in, change status with one dropdown.
  Refreshes automatically every 10 seconds.
- **Products** — add, edit, hide, or delete menu items; toggle which ones
  appear in Today's Specials.
- **Offers** — write a new promo banner whenever you have one running, or
  switch it off. Only one can be live at a time.

---

## 5. Deployment (Render + Vercel)

This repo includes `render.yaml` and `frontend/vercel.json` so both platforms auto-configure themselves from the repo instead of you setting everything by hand.

**Backend (Render)**:
1. Push this repo to GitHub.
2. Render Dashboard → New → **Blueprint** → connect the repo. Render reads `render.yaml` and pre-fills the service.
3. It'll prompt you for the env vars marked "sync: false" in `render.yaml`: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, `FRONTEND_URL` (put a placeholder for now), `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_CALLBACK_URL` (put a placeholder for now too).
4. Deploy. Note the resulting URL (e.g. `https://kenjav-backend.onrender.com`).
5. Go back into that service's Environment settings and update `MPESA_CALLBACK_URL` to `<that URL>/api/mpesa/callback`, then save (it redeploys automatically).
6. Run `npm run seed` once against production - easiest way is Render's Shell tab on the service, or run it locally with `MONGODB_URI` temporarily pointed at the production database.

**Frontend (Vercel)**:
1. Vercel Dashboard → Add New → Project → import the same repo.
2. Set Root Directory to `frontend`. Vercel auto-detects Vite.
3. Add env var `VITE_API_URL` = your Render URL from above.
4. Deploy. You'll get a URL like `https://kenjav.vercel.app`.
5. Go back to Render and update `FRONTEND_URL` to this real Vercel URL (replacing the placeholder from step 3 above).

`frontend/vercel.json` is what makes routes like `/order/KJ-1234` and `/admin` work correctly on direct visits/refreshes instead of 404ing - Vercel doesn't know about client-side routes without it.

**Render's free tier sleeps after 15 minutes of inactivity** - the first request after that takes 30-50 seconds to wake up. Fine for testing; upgrade the plan later if that becomes a problem with real customers.

## 6. M-Pesa (Daraja) setup

Customers can pay by cash-on-collection or M-Pesa (STK Push). To enable M-Pesa:

1. Log into [developer.safaricom.co.ke](https://developer.safaricom.co.ke) → My Apps → create an app (if you haven't) → copy its **Consumer Key** and **Consumer Secret**.
2. For testing (sandbox), use these values as-is in `.env` — they're Safaricom's own public test credentials, not secrets:
   - `MPESA_SHORTCODE=174379`
   - `MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
   - Sandbox test phone number that always succeeds: `254708374149`
3. Set `MPESA_CALLBACK_URL` to your **deployed** backend's callback URL, e.g. `https://your-backend.onrender.com/api/mpesa/callback`. This must be a real public HTTPS URL — Safaricom's servers call it directly, so `http://localhost` never works here, even for local testing.
4. Once your business till/paybill is approved for production, switch `MPESA_ENV=production` and replace the shortcode/passkey/consumer key+secret with your real production values.

**Testing the callback locally before deploying**: tools like [ngrok](https://ngrok.com) can tunnel a public HTTPS URL to your local machine (`ngrok http 4000`), which you can use as a temporary `MPESA_CALLBACK_URL` for testing. Not required if you're testing directly against a deployed backend.

## 7. Deliberate scope decisions (worth knowing about)

- **M-Pesa payment is now wired in** (STK Push via Safaricom Daraja). Customers
  choose Cash or M-Pesa at checkout; M-Pesa orders get a phone prompt right
  after placing the order, and the order tracking page waits for and reflects
  the payment result live. See section 6 above for setup. The admin Orders
  tab shows each order's payment status so you know which M-Pesa orders are
  actually paid before preparing them.
- **Admin login is a single shared password**, not individual staff accounts.
  Fine for one shop owner; if you later need multiple staff logins with
  different permissions, that's a bigger (but doable) addition.
- **Product photos**: paste a link into a product's "Image URL" field in the
  admin panel and it replaces the generated icon on the site automatically.
  Leave it blank and the product just uses a generated icon in your brand
  colors instead — nothing breaks either way.
