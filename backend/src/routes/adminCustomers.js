const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        customer_phone AS id,
        (ARRAY_AGG(customer_name ORDER BY created_at DESC))[1] AS name,
        customer_phone AS phone,
        (ARRAY_AGG(customer_email ORDER BY created_at DESC))[1] AS email,
        COUNT(*)::INTEGER AS order_count,
        COALESCE(SUM(total_kes),0)::INTEGER AS total_spent_kes,
        MAX(created_at) AS last_order_at
      FROM orders
      WHERE marketing_opt_in = TRUE
      GROUP BY customer_phone
      ORDER BY last_order_at DESC
    `);
    res.json(rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      order_count: Number(c.order_count),
      total_spent_kes: Number(c.total_spent_kes),
      last_order_at: c.last_order_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load customers.' });
  }
});

module.exports = router;
