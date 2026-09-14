const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function wholesaleAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'shopkeeper' || !payload.shopkeeperId) throw new Error('Invalid role');
    const { rows } = await pool.query('SELECT id, is_active FROM shopkeepers WHERE id=$1', [payload.shopkeeperId]);
    if (!rows.length) return res.status(401).json({ error: 'Account no longer exists. Please contact KENJAV.' });
    if (!rows[0].is_active) return res.status(403).json({ error: 'This shopkeeper account is inactive.' });
    req.wholesaleUser = payload;
    next();
  } catch (err) {
    console.error('Wholesale authentication error:', err);
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function shopkeeperOnly(req, res, next) {
  if (req.wholesaleUser?.role !== 'shopkeeper') return res.status(403).json({ error: 'Shopkeeper access required.' });
  next();
}

module.exports = { wholesaleAuth, shopkeeperOnly };
