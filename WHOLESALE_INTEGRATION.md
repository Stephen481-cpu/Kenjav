# KENJAV Wholesale Integration Guide

This guide explains how to add the existing `kenjav-wholesale-postgresql` system to the existing `Kenjav-M` project.

## Target structure

```text
Kenjav-M/
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── db.js
│   │   ├── middleware/
│   │   │   └── adminAuth.js
│   │   └── routes/
│   │       └── wholesale/
│   │           ├── shopkeepers.js
│   │           └── reports.js
│   └── schema.sql
│
├── frontend/
│
└── wholesale/
    ├── src/
    ├── package.json
    └── .env
```

## 1. Back up Kenjav-M

Before changing anything:

```bash
git status
git add .
git commit -m "Backup before wholesale integration"
git push
```

## 2. Copy the wholesale frontend

From the wholesale package, copy:

```text
wholesale/
```

into the root of `Kenjav-M`.

You should have:

```text
Kenjav-M/
├── backend/
├── frontend/
└── wholesale/
```

## 3. Copy the backend routes

From:

```text
backend-new-files/routes/wholesale/
```

copy:

```text
shopkeepers.js
reports.js
```

to:

```text
Kenjav-M/backend/src/routes/wholesale/
```

Create the `wholesale` directory if it does not exist.

## 4. Do NOT replace `db.js`

Your current KENJAV-M backend already uses PostgreSQL.

Keep:

```text
backend/src/db.js
```

The wholesale routes should use that same connection.

## 5. Add the wholesale database tables

Run the wholesale schema against the same Aiven PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS shopkeepers (...);
CREATE TABLE IF NOT EXISTS purchases (...);
CREATE TABLE IF NOT EXISTS payments (...);
```

The complete schema is in:

```text
backend-new-files/schema.sql
```

Do not delete the existing KENJAV-M tables.

You are adding the wholesale tables, not replacing:

```text
products
offers
orders
order_items
```

## 6. Register the routes

In:

```text
backend/src/app.js
```

add:

```js
const wholesaleShopkeepersRouter =
  require('./routes/wholesale/shopkeepers');

const wholesaleReportsRouter =
  require('./routes/wholesale/reports');
```

Then, after the existing admin routes, add:

```js
app.use(
  '/api/wholesale/shopkeepers',
  adminAuth,
  wholesaleShopkeepersRouter
);

app.use(
  '/api/wholesale/reports',
  adminAuth,
  wholesaleReportsRouter
);
```

The existing:

```js
const { adminAuth } = require('./middleware/adminAuth');
```

is reused.

## 7. Important route detail

The wholesale frontend currently calls:

```text
/api/admin/login
/api/wholesale/shopkeepers
/api/wholesale/reports/daily
```

This is intentional.

The login comes from the existing KENJAV-M admin authentication, while wholesale data comes from the new wholesale routes.

## 8. Configure the wholesale frontend

Create:

```text
Kenjav-M/wholesale/.env
```

For local development:

```env
VITE_API_URL=http://localhost:4000
```

For production:

```env
VITE_API_URL=https://your-kenjav-backend.onrender.com
```

Use your actual deployed backend URL.

## 9. Install dependencies

### Backend

From:

```bash
cd backend
npm install
```

The backend should already contain:

```json
"pg": "^8.23.0"
```

No MongoDB/Mongoose dependency should be added.

### Wholesale

```bash
cd ../wholesale
npm install
```

## 10. Start the systems

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Terminal 3:

```bash
cd wholesale
npm run dev
```

## 11. Test the backend first

Check:

```text
GET /api/health
```

It should report PostgreSQL.

Then test the wholesale endpoints after logging in:

```text
GET /api/wholesale/shopkeepers
GET /api/wholesale/reports/daily
```

## 12. Do not create another backend

The recommended setup is:

```text
KENJAV-M frontend ───────┐
                         │
Wholesale frontend ──────┤
                         v
                  One Express backend
                         |
                         v
                  One PostgreSQL DB
                         |
                         v
                       Aiven
```

Do not run a second Express backend for wholesale unless you later have a strong reason to split the services.

## 13. Do not create another PostgreSQL database

Use the existing Aiven PostgreSQL service.

The database becomes:

```text
products
offers
orders
order_items
shopkeepers
purchases
payments
```

This makes reporting and future inventory integration much easier.

## 14. First test

Create a shopkeeper:

```text
Name: Test Shop
Phone: 0712345678
Location: Rongai
Credit limit: 10000
```

Record a purchase.

Example:

```text
Product: Mandazi
Quantity: 100
Amount: 1000
```

Record a payment:

```text
Amount: 500
```

The expected balance is:

```text
KES 500
```

Then verify the daily report.

## 15. Production deployment

Deploy:

```text
frontend → Vercel
wholesale → Vercel
backend → Render
database → Aiven
```

Both frontends point to the same backend.

Example:

```env
VITE_API_URL=https://your-backend.onrender.com
```

The backend uses:

```env
DATABASE_URL=your-aiven-service-uri
DATABASE_SSL=true
```

## 16. Recommended next step

Do the integration in this order:

```text
1. Back up Kenjav-M
2. Add wholesale tables to Aiven
3. Add wholesale routes
4. Register routes in app.js
5. Start backend
6. Test wholesale API
7. Add wholesale frontend
8. Connect VITE_API_URL
9. Test login
10. Test shopkeeper
11. Test purchase
12. Test payment
13. Test report
14. Deploy
```

Do not modify the M-Pesa code while doing the first wholesale integration. Get the wholesale database and API working first, then connect inventory, credit rules and payments in later phases.
