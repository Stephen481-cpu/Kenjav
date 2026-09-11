const express = require('express');
const { pool } = require('../db');
const { productJSON } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY sort_order ASC, id ASC'
    );
    res.json(rows.map(productJSON));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

module.exports = router;
