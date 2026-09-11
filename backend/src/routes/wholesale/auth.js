const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../../db');

const router = express.Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, key] = String(stored || '').split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

function publicShopkeeper(row) {
  return {
    id: String(row.id), name: row.name, phone: row.phone, location: row.location,
    credit_limit_kes: Number(row.credit_limit_kes), is_active: row.is_active,
  };
}


router.post('/register', async (req, res) => {
  const { name, phone, location, password } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanLocation = String(location || '').trim();

  if (!cleanName || !cleanPhone || !password) {
    return res.status(400).json({ error: 'Name, phone and password are required.' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server is not configured. Set JWT_SECRET.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO shopkeepers(name, phone, location, credit_limit_kes, password_hash, is_active)
       VALUES($1, $2, $3, 0, $4, TRUE)
       RETURNING id, name, phone, location, credit_limit_kes, is_active, joined_at`,
      [cleanName, cleanPhone, cleanLocation, hashPassword(password)]
    );
    const shopkeeper = rows[0];
    const token = jwt.sign(
      { role: 'shopkeeper', shopkeeperId: String(shopkeeper.id), name: shopkeeper.name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    return res.status(201).json({
      token,
      role: 'shopkeeper',
      shopkeeper: publicShopkeeper(shopkeeper),
      message: 'Account created successfully.'
    });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A shopkeeper account with that phone already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required.' });
  try {
    const { rows } = await pool.query('SELECT * FROM shopkeepers WHERE phone = $1 LIMIT 1', [String(phone).trim()]);
    const shopkeeper = rows[0];
    if (!shopkeeper || !shopkeeper.password_hash || !shopkeeper.is_active || !verifyPassword(password, shopkeeper.password_hash)) {
      return res.status(401).json({ error: 'Incorrect phone/password or inactive account.' });
    }
    const token = jwt.sign({ role: 'shopkeeper', shopkeeperId: String(shopkeeper.id), name: shopkeeper.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: 'shopkeeper', shopkeeper: publicShopkeeper(shopkeeper) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Login failed.' });
  }
});

router.post('/change-password', require('../../middleware/wholesaleAuth').wholesaleAuth, require('../../middleware/wholesaleAuth').shopkeeperOnly, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password || String(new_password).length < 6) return res.status(400).json({ error: 'Current password and a new password of at least 6 characters are required.' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM shopkeepers WHERE id=$1', [req.wholesaleUser.shopkeeperId]);
    if (!rows[0] || !verifyPassword(current_password, rows[0].password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
    await pool.query('UPDATE shopkeepers SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hashPassword(new_password), req.wholesaleUser.shopkeeperId]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to change password.' }); }
});

module.exports = { router, hashPassword };
