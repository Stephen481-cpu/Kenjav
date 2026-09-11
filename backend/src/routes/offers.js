const express = require('express');
const { pool } = require('../db');
const { offerJSON } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM offers WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    res.json(rows[0] ? offerJSON(rows[0]) : null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load offers.' });
  }
});

module.exports = router;
