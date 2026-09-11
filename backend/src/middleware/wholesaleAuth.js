const jwt = require('jsonwebtoken');

function wholesaleAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'shopkeeper'].includes(payload.role)) throw new Error('Invalid role');
    req.wholesaleUser = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function shopkeeperOnly(req, res, next) {
  if (req.wholesaleUser?.role !== 'shopkeeper') return res.status(403).json({ error: 'Shopkeeper access required.' });
  next();
}

module.exports = { wholesaleAuth, shopkeeperOnly };
