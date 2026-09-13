const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function wholesaleAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Missing authorization token.'
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured.');

    return res.status(500).json({
      error: 'Server authentication is not configured.'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!['admin', 'shopkeeper'].includes(payload.role)) {
      throw new Error('Invalid role.');
    }

    /*
      Admin users do not need a shopkeeper database check.
    */
    if (payload.role === 'admin') {
      req.wholesaleUser = payload;
      return next();
    }

    /*
      Shopkeeper tokens are checked against PostgreSQL on every
      authenticated request.

      This means an admin can deactivate an account immediately,
      even if the shopkeeper still has an unexpired JWT.
    */
    const shopkeeperId = Number(payload.shopkeeperId);

    if (!Number.isSafeInteger(shopkeeperId) || shopkeeperId < 1) {
      return res.status(401).json({
        error: 'Invalid shopkeeper session.'
      });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        name,
        phone,
        location,
        credit_limit_kes,
        is_active
      FROM shopkeepers
      WHERE id = $1
      LIMIT 1
      `,
      [shopkeeperId]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'Shopkeeper account no longer exists.'
      });
    }

    const shopkeeper = rows[0];

    if (!shopkeeper.is_active) {
      return res.status(403).json({
        error: 'Your shopkeeper account is inactive. Please contact KENJAV.'
      });
    }

    /*
      Keep the verified JWT payload while also attaching the current
      database record for routes that need current account information.
    */
    req.wholesaleUser = {
      ...payload,
      shopkeeperId: String(shopkeeper.id),
      shopkeeper: {
        id: String(shopkeeper.id),
        name: shopkeeper.name,
        phone: shopkeeper.phone,
        location: shopkeeper.location,
        credit_limit_kes: Number(shopkeeper.credit_limit_kes),
        is_active: shopkeeper.is_active
      }
    };

    return next();
  } catch (err) {
    console.error('Wholesale authentication error:', err.message);

    return res.status(401).json({
      error: 'Invalid or expired session. Please log in again.'
    });
  }
}

function shopkeeperOnly(req, res, next) {
  if (req.wholesaleUser?.role !== 'shopkeeper') {
    return res.status(403).json({
      error: 'Shopkeeper access required.'
    });
  }

  next();
}

module.exports = {
  wholesaleAuth,
  shopkeeperOnly
};