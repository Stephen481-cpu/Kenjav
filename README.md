# KENJAV-M — Complete Customer + Admin + Wholesale System

This is the consolidated KENJAV-M project. It contains the existing customer storefront, admin backend/panel, PostgreSQL/Aiven integration, M-Pesa integration, and the complete wholesale/shopkeeper portal in one project.

## Structure

```text
Kenjav-M/
├── frontend/      # Customer storefront + existing admin UI
├── backend/       # Shared Express API + PostgreSQL + M-Pesa + wholesale APIs
├── wholesale/     # Shopkeeper/admin wholesale portal
├── README.md
├── ROADMAP.md
├── WHOLESALE_INTEGRATION.md
└── WHOLESALE_PORTAL_SETUP.md
```

## Databases

PostgreSQL only. MongoDB/Mongoose is not used.

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
