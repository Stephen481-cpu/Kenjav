# KENJAV Wholesale Portal Setup

## Shopkeeper access

Give shopkeepers the Wholesale Portal Vercel URL. They choose **Create an account**, enter their details, and receive a shopkeeper session immediately. Their account is stored in the same PostgreSQL database used by the KENJAV Admin panel.

## Admin access

Admins continue to use the existing KENJAV main website Admin panel. The main Admin panel now contains a **Wholesale** section for shopkeepers, wholesale products, wholesale orders, payment requests, and reports. There is no admin login inside the Wholesale Portal.

## Vercel environment variable (both frontends)

```env
VITE_API_URL=https://YOUR-RENDER-BACKEND.onrender.com
```

## Render environment

Use both Vercel origins in `FRONTEND_URLS`, comma-separated:

```env
FRONTEND_URLS=https://YOUR-MAIN-SITE.vercel.app,https://YOUR-WHOLESALE-SITE.vercel.app
```

The backend and Aiven PostgreSQL database are shared.
