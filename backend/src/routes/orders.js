const express = require('express');
const { randomUUID } = require('crypto');
const { pool } = require('../db');
const { generateOrderCode, isValidPhone } = require('../utils/orderCode');
const { initiateSTKPush } = require('../services/mpesa');
const { orderJSON } = require('../utils/serializers');
const { ORDER_SELECT } = require('../utils/orderQueries');

const router = express.Router();

async function getOrderByCode(code) {
  const { rows } = await pool.query(`${ORDER_SELECT} WHERE o.order_code=$1 GROUP BY o.id`, [code]);
  return rows[0] || null;
}

router.post('/', async (req, res) => {
  const { customer_name, customer_phone, customer_email, fulfillment_type, delivery_address, notes, items, payment_method, marketing_opt_in } = req.body || {};

  if (!customer_name || !String(customer_name).trim()) return res.status(400).json({ error: 'customer_name is required.' });
  if (!isValidPhone(customer_phone)) return res.status(400).json({ error: 'A valid customer_phone is required.' });
  if (!['pickup', 'delivery'].includes(fulfillment_type)) return res.status(400).json({ error: 'fulfillment_type must be "pickup" or "delivery".' });
  if (fulfillment_type === 'delivery' && (!delivery_address || !String(delivery_address).trim())) return res.status(400).json({ error: 'delivery_address is required for delivery orders.' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required.' });
  if (!['cash', 'mpesa'].includes(payment_method)) return res.status(400).json({ error: 'payment_method must be "cash" or "mpesa".' });

  const productIds = items.map((i) => i.product_id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: products } = await client.query(
      'SELECT * FROM products WHERE id = ANY($1::uuid[]) AND is_active = TRUE',
      [productIds]
    );
    const productMap = new Map(products.map((p) => [String(p.id), p]));
    const lineItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(String(item.product_id));
      const qty = Number(item.quantity);
      if (!product || !Number.isInteger(qty) || qty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'One or more items in the order are invalid.' });
      }
      const lineTotal = Number(product.price_kes) * qty;
      subtotal += lineTotal;
      lineItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price_kes: Number(product.price_kes),
        quantity: qty,
        line_total_kes: lineTotal,
      });
    }

    const deliveryFee = 0;
    const total = subtotal + deliveryFee;
    let order = null;

    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      const orderCode = generateOrderCode();
      try {
        const { rows } = await client.query(
          `INSERT INTO orders
          (id, order_code, customer_name, customer_phone, customer_email, fulfillment_type, delivery_address, notes,
           marketing_opt_in, subtotal_kes, delivery_fee_kes, total_kes, status, payment_method, payment_status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13,'pending')
          RETURNING *`,
          [randomUUID(), orderCode, String(customer_name).trim(), String(customer_phone).trim(), customer_email ? String(customer_email).trim() : null,
           fulfillment_type, fulfillment_type === 'delivery' ? String(delivery_address).trim() : null,
           notes ? String(notes).trim() : null, !!marketing_opt_in, subtotal, deliveryFee, total, payment_method]
        );
        order = rows[0];
        for (const item of lineItems) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name, unit_price_kes, quantity, line_total_kes)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [order.id, item.product_id, item.product_name, item.unit_price_kes, item.quantity, item.line_total_kes]
          );
        }
      } catch (err) {
        if (err.code === '23505') continue;
        throw err;
      }
    }

    if (!order) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Could not generate a unique order code. Please try again.' });
    }
    await client.query('COMMIT');

    const created = await getOrderByCode(order.order_code);
    res.status(201).json(orderJSON(created));
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(err);
    if (err.code === '22P02') return res.status(400).json({ error: 'One or more product IDs are invalid.' });
    res.status(500).json({ error: 'Failed to place order.' });
  } finally { client.release(); }
});

router.post('/:code/pay', async (req, res) => {
  try {
    const order = await getOrderByCode(req.params.code);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.payment_method !== 'mpesa') return res.status(400).json({ error: 'This order is not set up for M-Pesa payment.' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'This order has already been paid.' });

    const result = await initiateSTKPush({
      phone: order.customer_phone,
      amount: order.total_kes,
      accountReference: order.order_code,
      description: `KENJAV Order ${order.order_code}`,
    });

    await pool.query(
      `UPDATE orders SET payment_status='processing', mpesa_checkout_request_id=$1, mpesa_merchant_request_id=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3`,
      [result.CheckoutRequestID, result.MerchantRequestID, order.id]
    );

    res.json({ message: 'STK push sent. Check your phone to complete payment.', checkout_request_id: result.CheckoutRequestID });
  } catch (err) {
    console.error('M-Pesa STK push failed:', err.response ? err.response.data : err.message);
    res.status(502).json({ error: 'Could not start M-Pesa payment. Please try again.' });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const order = await getOrderByCode(req.params.code);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(orderJSON(order));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

module.exports = router;
