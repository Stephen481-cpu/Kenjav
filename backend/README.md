# KENJAV Backend — PostgreSQL version

This version replaces MongoDB/Mongoose with PostgreSQL while keeping the existing Express API paths used by the KENJAV frontend.

## 1. Create the PostgreSQL database

Create a database named `kenjav` (or use the database name supplied by your hosted PostgreSQL provider).

Run `schema.sql` against that database.

## 2. Configure environment variables

Copy `.env.example` to `.env` and set your real values.

The most important variable is:

`DATABASE_URL=postgresql://username:password@host:5432/kenjav?sslmode=require`

Do not commit `.env` to GitHub.

## 3. Install dependencies

```bash
npm install
```

## 4. Seed the database

```bash
npm run seed
```

## 5. Start the API

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## API compatibility

The existing routes are retained:

- `GET /api/products`
- `GET /api/offers`
- `POST /api/orders`
- `POST /api/orders/:code/pay`
- `GET /api/orders/:code`
- `POST /api/mpesa/callback`
- `POST /api/admin/login`
- `/api/admin/products`
- `/api/admin/offers`
- `/api/admin/orders`
- `/api/admin/customers`

The frontend should therefore continue using the same API URL.

## PostgreSQL tables

- `products`
- `offers`
- `orders`
- `order_items`

Order items are now stored in a separate relational table and linked to `orders` with a foreign key.
