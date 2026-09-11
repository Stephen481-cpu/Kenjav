const express = require('express');
const cors = require('cors');

const aiAssistantRouter = require('./routes/aiAssistant');
const productsRouter = require('./routes/products');
const offersRouter = require('./routes/offers');
const ordersRouter = require('./routes/orders');
const mpesaCallbackRouter = require('./routes/mpesaCallback');
const adminAuthRouter = require('./routes/adminAuth');
const adminProductsRouter = require('./routes/adminProducts');
const adminOffersRouter = require('./routes/adminOffers');
const adminOrdersRouter = require('./routes/adminOrders');
const adminCustomersRouter = require('./routes/adminCustomers');
const { adminAuth } = require('./middleware/adminAuth');
const wholesaleAuthRouter = require('./routes/wholesale/auth').router;
const wholesaleShopkeepersRouter = require('./routes/wholesale/shopkeepers').router;
const wholesaleReportsRouter = require('./routes/wholesale/reports');
const wholesalePortalRouter = require('./routes/wholesale/portal');
const wholesaleAdminRouter = require('./routes/wholesale/admin');


const app = express();
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server/no-origin requests and local development.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'kenjav-backend', database: 'postgresql' }));

app.use('/api/products', productsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/mpesa', mpesaCallbackRouter);
app.use('/api/ai', aiAssistantRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/admin/products', adminAuth, adminProductsRouter);
app.use('/api/admin/offers', adminAuth, adminOffersRouter);
app.use('/api/admin/orders', adminAuth, adminOrdersRouter);
app.use('/api/admin/customers', adminAuth, adminCustomersRouter);

app.use('/api/wholesale/auth', wholesaleAuthRouter);
app.use('/api/wholesale/shopkeepers', adminAuth, wholesaleShopkeepersRouter);
app.use('/api/wholesale/reports', adminAuth, wholesaleReportsRouter);
app.use('/api/wholesale/admin', wholesaleAdminRouter);
app.use('/api/wholesale/portal', wholesalePortalRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
