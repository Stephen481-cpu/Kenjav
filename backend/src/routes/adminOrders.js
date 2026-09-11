const express = require('express');
const { pool } = require('../db');
const { orderJSON } = require('../utils/serializers');
const { ORDER_SELECT } = require('../utils/orderQueries');

const router = express.Router();
const VALID_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`${ORDER_SELECT} GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200`);
    res.json(rows.map(orderJSON));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  try {
    const { rows } = await pool.query(`UPDATE orders SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id`, [status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Order not found.' });
    const result = await pool.query(`${ORDER_SELECT} WHERE o.id=$1 GROUP BY o.id`, [req.params.id]);
    res.json(orderJSON(result.rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '22P02') return res.status(404).json({ error: 'Order not found.' });
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

module.exports = router;
