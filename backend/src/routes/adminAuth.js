const express = require('express');
const jwt = require('jsonwebtoken');
const { timingSafeEqual } = require('crypto');

const router = express.Router();

function passwordsMatch(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  // Matches the same timingSafeEqual pattern already used for the M-Pesa
  // callback token, instead of a plain !== compare.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server is not configured. Set ADMIN_PASSWORD and JWT_SECRET.' });
  }
  if (!password || !passwordsMatch(password, process.env.ADMIN_PASSWORD)) return res.status(401).json({ error: 'Incorrect password.' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

module.exports = router;