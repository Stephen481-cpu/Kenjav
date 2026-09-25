const express = require('express');
const { pool } = require('../../db');
const { wholesaleAuth, shopkeeperOnly } = require('../../middleware/wholesaleAuth');
const { initiateSTKPush } = require('../../services/mpesa');

const router = express.Router();
router.use(wholesaleAuth, shopkeeperOnly);

async function balance(id) {
  // 'processing' payments (an M-Pesa STK push that was sent but not yet
  // confirmed) are counted alongside 'confirmed' ones here so this always
  // matches the balance used by /orders and /payment-requests below -
  // otherwise the dashboard shows a higher debt than what those endpoints
  // actually check against, and shopkeepers see a confusing "cannot exceed
  // your outstanding debt of KES X" for an amount lower than their balance.
  const { rows } = await pool.query(`
    SELECT
      COALESCE((SELECT SUM(amount_kes) FROM purchases WHERE shopkeeper_id = $1), 0)
      + COALESCE((SELECT SUM(amount_kes) FROM manual_sales WHERE shopkeeper_id = $1), 0) AS purchases,
      COALESCE((SELECT SUM(total_kes) FROM wholesale_orders WHERE shopkeeper_id = $1 AND status IN ('pending', 'approved', 'processing', 'ready')), 0) AS active_order_total,
      COALESCE((SELECT SUM(amount_kes) FROM payments WHERE shopkeeper_id = $1 AND COALESCE(status, 'confirmed') IN ('confirmed', 'processing')), 0) AS payments
  `, [id]);
  const purchases = Number(rows[0].purchases);
  const activeOrderTotal = Number(rows[0].active_order_total);
  const payments = Number(rows[0].payments);
  return { purchases, active_order_total: activeOrderTotal, payments, balance: purchases + activeOrderTotal - payments };
}

router.get('/me', async (req, res) => {
  try {
    const id = req.wholesaleUser.shopkeeperId;
    const shopkeeper = await pool.query('SELECT id, name, phone, location, credit_limit_kes, is_active, joined_at FROM shopkeepers WHERE id = $1', [id]);
    if (!shopkeeper.rowCount) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ ...shopkeeper.rows[0], id: String(id), credit_limit_kes: Number(shopkeeper.rows[0].credit_limit_kes), ...await balance(id) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const id = req.wholesaleUser.shopkeeperId;
    const [currentBalance, recentOrders, recentPayments] = await Promise.all([
      balance(id),
      pool.query('SELECT id, product_name, quantity, amount_kes, notes, date FROM purchases WHERE shopkeeper_id = $1 ORDER BY date DESC LIMIT 8', [id]),
      pool.query('SELECT id, amount_kes, notes, method, reference, status, date FROM payments WHERE shopkeeper_id = $1 ORDER BY date DESC LIMIT 8', [id])
    ]);
    return res.json({ ...currentBalance, recent_purchases: recentOrders.rows, recent_payments: recentPayments.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT wp.id, wp.product_id, COALESCE(p.name, wp.product_name) AS name,
        COALESCE(p.description, '') AS description, COALESCE(p.image_url, '') AS image_url,
        wp.wholesale_price_kes, wp.min_order_quantity, wp.stock_quantity, wp.minimum_stock, wp.is_active,
        CASE WHEN wp.stock_quantity <= 0 THEN 'out_of_stock'
          WHEN wp.stock_quantity <= wp.minimum_stock THEN 'low_stock'
          ELSE 'in_stock' END AS stock_status
      FROM wholesale_products wp
      LEFT JOIN products p ON p.id = wp.product_id
      WHERE wp.is_active = TRUE
      ORDER BY COALESCE(p.name, wp.product_name)
    `);
    return res.json(rows.map((product) => ({
      ...product,
      id: String(product.id),
      product_id: product.product_id ? String(product.product_id) : null,
      wholesale_price_kes: Number(product.wholesale_price_kes),
      min_order_quantity: Number(product.min_order_quantity),
      stock_quantity: Number(product.stock_quantity),
      minimum_stock: Number(product.minimum_stock)
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load wholesale products.' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT o.*, COALESCE(json_agg(json_build_object('id', i.id, 'product_id', i.product_id, 'product_name', i.product_name, 'quantity', i.quantity, 'unit_price_kes', i.unit_price_kes, 'line_total_kes', i.line_total_kes) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items FROM wholesale_orders o LEFT JOIN wholesale_order_items i ON i.order_id = o.id WHERE o.shopkeeper_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`, [req.wholesaleUser.shopkeeperId]);
    return res.json(rows.map((order) => ({ ...order, id: String(order.id), total_kes: Number(order.total_kes), items: order.items.map((item) => ({ ...item, id: String(item.id), quantity: Number(item.quantity), unit_price_kes: Number(item.unit_price_kes), line_total_kes: Number(item.line_total_kes) })) })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load orders.' });
  }
});

router.post('/orders', async (req, res) => {
  const shopkeeperId = req.wholesaleUser.shopkeeperId;
  const { items, notes } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Add at least one product.' });

  const requestedQuantities = new Map();
  for (const item of items) {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Each order item needs a valid product and whole-number quantity.' });
    }
    requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
const { rows: products } = await client.query(
  `SELECT wp.*,
          COALESCE(p.name, wp.product_name) AS resolved_product_name
   FROM wholesale_products wp
   LEFT JOIN products p ON p.id = wp.product_id
   WHERE wp.id = ANY($1::bigint[])
     AND wp.is_active = TRUE
   ORDER BY wp.id
   FOR UPDATE OF wp`,
  [[...requestedQuantities.keys()]]
);
    const productsById = new Map(products.map((product) => [Number(product.id), product]));
    const cleanItems = [];
    let total = 0;

    const pendingReservations = await client.query(
      `SELECT i.wholesale_product_id, COALESCE(SUM(i.quantity), 0) AS reserved_quantity
       FROM wholesale_order_items i
       JOIN wholesale_orders o ON o.id = i.order_id
       WHERE o.status = 'pending'
         AND i.wholesale_product_id = ANY($1::bigint[])
       GROUP BY i.wholesale_product_id`,
      [[...requestedQuantities.keys()]]
    );
    const reservedByProduct = new Map(
      pendingReservations.rows.map((row) => [Number(row.wholesale_product_id), Number(row.reserved_quantity)])
    );

    for (const [productId, quantity] of requestedQuantities) {
      const product = productsById.get(productId);
      if (!product) throw new Error('One or more products are unavailable. Refresh the catalogue and try again.');
      if (quantity < Number(product.min_order_quantity)) throw new Error(`The minimum order for ${product.resolved_product_name} is ${product.min_order_quantity}.`);
      const availableStock = Number(product.stock_quantity) - (reservedByProduct.get(productId) || 0);
      if (availableStock < quantity) throw new Error(`${product.resolved_product_name} has only ${Math.max(availableStock, 0)} available to order.`);
      const lineTotal = quantity * Number(product.wholesale_price_kes);
      total += lineTotal;
      cleanItems.push({ product, quantity, lineTotal });
    }

    const { rows: creditRows } = await client.query(
      `SELECT
         s.credit_limit_kes,
         COALESCE((SELECT SUM(amount_kes) FROM purchases WHERE shopkeeper_id = s.id), 0)
         + COALESCE((SELECT SUM(amount_kes) FROM manual_sales WHERE shopkeeper_id = s.id), 0)
         + COALESCE((SELECT SUM(total_kes) FROM wholesale_orders WHERE shopkeeper_id = s.id AND status IN ('pending', 'approved', 'processing', 'ready')), 0)
         - COALESCE((SELECT SUM(amount_kes) FROM payments WHERE shopkeeper_id = s.id AND COALESCE(status, 'confirmed') IN ('confirmed', 'processing')), 0)
         AS balance
       FROM shopkeepers s
       WHERE s.id = $1
       FOR UPDATE`,
      [shopkeeperId]
    );
    const creditLimit = Number(creditRows[0]?.credit_limit_kes || 0);
    const currentBalance = Number(creditRows[0]?.balance || 0);
    if (creditLimit > 0 && currentBalance + total > creditLimit) throw new Error(`This order would exceed your credit limit by KES ${(currentBalance + total - creditLimit).toLocaleString()}.`);

    const { rows: orderRows } = await client.query(`INSERT INTO wholesale_orders(shopkeeper_id, status, total_kes, notes) VALUES($1, 'pending', $2, $3) RETURNING *`, [shopkeeperId, total, notes || null]);
    const order = orderRows[0];
    for (const item of cleanItems) {
      await client.query(`INSERT INTO wholesale_order_items(order_id, wholesale_product_id, product_id, product_name, quantity, unit_price_kes, line_total_kes) VALUES($1, $2, $3, $4, $5, $6, $7)`, [order.id, item.product.id, item.product.product_id, item.product.resolved_product_name, item.quantity, item.product.wholesale_price_kes, item.lineTotal]);
    }
    await client.query('COMMIT');
    await pool.query('INSERT INTO wholesale_notifications(shopkeeper_id, title, message) VALUES($1, $2, $3)', [shopkeeperId, 'Order received', `Wholesale order #${order.id} was received and is awaiting approval.`]);
    return res.status(201).json({ ...order, id: String(order.id), total_kes: Number(order.total_kes) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(400).json({ error: error.message || 'Failed to place order.' });
  } finally {
    client.release();
  }
});

router.post('/payment-requests', async (req, res) => {
  const amount=Number(req.body?.amount_kes), method=String(req.body?.method||'mpesa').trim().toLowerCase();
  const reference=String(req.body?.reference||'').trim()||null, notes=String(req.body?.notes||'').trim()||null;
  if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Enter a valid payment amount.'});
  if(!['mpesa','cash','bank','other'].includes(method))return res.status(400).json({error:'Invalid payment method.'});
  try{
    const id=req.wholesaleUser.shopkeeperId;
    const {rows}=await pool.query(`SELECT s.phone,GREATEST(0,COALESCE((SELECT SUM(amount_kes) FROM purchases WHERE shopkeeper_id=s.id),0)+COALESCE((SELECT SUM(amount_kes) FROM manual_sales WHERE shopkeeper_id=s.id),0)+COALESCE((SELECT SUM(total_kes) FROM wholesale_orders WHERE shopkeeper_id=s.id AND status IN ('pending','approved','processing','ready')),0)-COALESCE((SELECT SUM(amount_kes) FROM payments WHERE shopkeeper_id=s.id AND COALESCE(status,'confirmed') IN ('confirmed','processing')),0)) AS balance FROM shopkeepers s WHERE s.id=$1`,[id]);
    if(!rows.length)return res.status(404).json({error:'Account not found.'});
    const balance=Number(rows[0].balance); if(balance<=0)return res.status(400).json({error:'You have no outstanding debt.'}); if(amount>balance+0.005)return res.status(400).json({error:`Payment cannot exceed your outstanding debt of KES ${balance.toLocaleString()}.`});
    if(method==='mpesa'){
      const result=await initiateSTKPush({phone:rows[0].phone,amount,accountReference:`KENJAV-${id}`,description:'KENJAV wholesale debt payment'});
      const payment=await pool.query(`INSERT INTO payments(shopkeeper_id,amount_kes,method,reference,notes,status,mpesa_checkout_request_id,mpesa_merchant_request_id,mpesa_phone) VALUES($1,$2,'mpesa',$3,$4,'processing',$5,$6,$7) RETURNING *`,[id,amount,reference,notes,result.CheckoutRequestID||null,result.MerchantRequestID||null,rows[0].phone]);
      return res.status(201).json({...payment.rows[0],message:'STK push sent. Check your phone and enter your M-Pesa PIN.'});
    }
    const payment=await pool.query(`INSERT INTO payments(shopkeeper_id,amount_kes,method,reference,notes,status) VALUES($1,$2,$3,$4,$5,'pending') RETURNING *`,[id,amount,method,reference,notes]);
    return res.status(201).json({...payment.rows[0],message:'Payment submitted for confirmation.'});
  }catch(error){console.error(error);return res.status(500).json({error:error.message||'Failed to submit payment.'});}
});

router.get('/payments', async (req, res) => {
  try { return res.json((await pool.query('SELECT * FROM payments WHERE shopkeeper_id = $1 ORDER BY date DESC', [req.wholesaleUser.shopkeeperId])).rows); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to load payments.' }); }
});

router.get('/purchases', async (req, res) => {
  try { return res.json((await pool.query('SELECT * FROM purchases WHERE shopkeeper_id = $1 ORDER BY date DESC', [req.wholesaleUser.shopkeeperId])).rows); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to load purchases.' }); }
});

router.get('/notifications', async (req, res) => {
  try { return res.json((await pool.query('SELECT * FROM wholesale_notifications WHERE shopkeeper_id = $1 ORDER BY created_at DESC LIMIT 50', [req.wholesaleUser.shopkeeperId])).rows); }
  catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to load notifications.' }); }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE wholesale_notifications SET is_read = TRUE WHERE id = $1 AND shopkeeper_id = $2 RETURNING *', [req.params.id, req.wholesaleUser.shopkeeperId]);
    if (!rows.length) return res.status(404).json({ error: 'Notification not found.' });
    return res.json(rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.put('/profile', async (req, res) => {
  const { name, phone, location } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
  try {
    const { rows } = await pool.query('UPDATE shopkeepers SET name = $1, phone = $2, location = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, phone, location, credit_limit_kes, is_active', [name.trim(), phone.trim(), location || '', req.wholesaleUser.shopkeeperId]);
    return res.json(rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;