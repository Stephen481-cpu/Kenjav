# KENJAV— Complete Customer + Admin + Wholesale System

This is the consolidated KENJAV project. It contains the existing customer storefront, admin backend/panel, PostgreSQL/Aiven integration, M-Pesa integration, and the complete wholesale/shopkeeper portal in one project.

## Structure

```text
Kenjav/
├── frontend/      # Customer storefront + existing admin UI
├── backend/       # Shared Express API + PostgreSQL + M-Pesa + wholesale APIs
├── wholesale/     # Shopkeeper/admin wholesale portal
├── README.md
├── ROADMAP.md
├── WHOLESALE_INTEGRATION.md
└── WHOLESALE_PORTAL_SETUP.md
```

## Databases

PostgreSQL only.

The wholesale tables live in the same PostgreSQL/Aiven database as the main KENJAV system.

## Run locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Customer frontend

```bash
cd frontend
npm install
npm run dev
```

### Wholesale portal

```bash
cd wholesale
npm install
npm run dev
```

Set the required environment variables from the `.env.example`/documentation files. Never commit `.env` files or production credentials.

For M-Pesa, set a long random `MPESA_CALLBACK_SECRET` and append it to the
configured callback URL as `?token=<that-secret>`. For example:
`https://api.example.com/api/mpesa/callback?token=your-long-random-secret`.
The backend rejects callback requests that do not supply this token.

## Main wholesale portal

Shopkeepers have:

- Login
- Dashboard
- Wholesale products
- Cart and wholesale ordering
- Order history/status
- Payment submission/history
- Credit/debt view
- Notifications
- Profile
- Settings/password change

Administrators have wholesale management for shopkeepers, products, orders, payment requests and reports.

## Important

Run `backend/schema.js` after configuring `DATABASE_URL` to apply the PostgreSQL schema to the Aiven database. Do not create a second database for wholesale.

Wholesale payment requests are currently recorded for admin confirmation. Automatic M-Pesa STK Push for wholesale payments is a separate integration step.
