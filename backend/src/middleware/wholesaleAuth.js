const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function wholesaleAuth(req, res, next) {
  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Missing authorization token.',
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('Wholesale authentication error: JWT_SECRET is not configured.');

    return res.status(500).json({
      error: 'Server authentication is not configured.',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (
      payload.role !== 'shopkeeper' ||
      !payload.shopkeeperId
    ) {
      return res.status(401).json({
        error: 'Invalid wholesale authentication token.',
      });
    }

    const { rows } = await pool.query(
      `SELECT id, is_active
       FROM shopkeepers
       WHERE id = $1`,
      [payload.shopkeeperId]
    );

    if (!rows.length) {
      return res.status(401).json({
        error:
          'Account no longer exists. Please contact KENJAV.',
      });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({
        error: 'This shopkeeper account is inactive.',
      });
    }

    req.wholesaleUser = payload;

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.warn(
        `Wholesale session expired for shopkeeper ${err?.decoded?.shopkeeperId || 'unknown'}`
      );

      return res.status(401).json({
        error: 'Your wholesale session has expired. Please log in again.',
        code: 'JWT_EXPIRED',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      console.warn(
        'Wholesale authentication rejected an invalid JWT.'
      );

      return res.status(401).json({
        error: 'Invalid wholesale session. Please log in again.',
        code: 'JWT_INVALID',
      });
    }

    console.error(
      'Wholesale authentication error:',
      err
    );

    return res.status(401).json({
      error: 'Invalid or expired session. Please log in again.',
      code: 'AUTH_ERROR',
    });
  }
}

function shopkeeperOnly(req, res, next) {
  if (req.wholesaleUser?.role !== 'shopkeeper') {
    return res.status(403).json({
      error: 'Shopkeeper access required.',
    });
  }

  return next();
}

module.exports = {
  wholesaleAuth,
  shopkeeperOnly,
};