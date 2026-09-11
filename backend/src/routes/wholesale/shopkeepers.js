const express = require('express');
const { pool } = require('../../db');
const { hashPassword } = require('./auth');

const router = express.Router();

function creditStatus(balanceKes, limitKes) {
  if (!limitKes || limitKes <= 0) return { label: 'No Limit Set', color: 'neutral' };
  if (balanceKes >= limitKes) return { label: 'Over Limit', color: 'red' };
  if (balanceKes < limitKes * 0.5) return { label: 'Good Standing', color: 'green' };
  return { label: 'Approaching Limit', color: 'yellow' };
}

async function computeStats(id) {
  const { rows } = await pool.query(`
    SELECT
      COALESCE((SELECT SUM(amount_kes) FROM purchases WHERE shopkeeper_id=$1),0) total_purchases_kes,
      COALESCE((SELECT SUM(amount_kes) FROM payments WHERE shopkeeper_id=$1 AND COALESCE(status,'confirmed')='confirmed'),0) total_payments_kes,
      COALESCE((SELECT SUM(quantity) FROM purchases WHERE shopkeeper_id=$1),0) total_quantity,
      (SELECT COUNT(*) FROM purchases WHERE shopkeeper_id=$1) order_count,
      (SELECT date FROM purchases WHERE shopkeeper_id=$1 ORDER BY date DESC LIMIT 1) last_purchase_at,
      (SELECT date FROM payments WHERE shopkeeper_id=$1 ORDER BY date DESC LIMIT 1) last_payment_at`, [id]);
  const r=rows[0]; const purchases=Number(r.total_purchases_kes), payments=Number(r.total_payments_kes);
  return { total_purchases_kes:purchases,total_payments_kes:payments,balance_kes:purchases-payments,total_quantity:Number(r.total_quantity),order_count:Number(r.order_count),last_purchase_at:r.last_purchase_at,last_payment_at:r.last_payment_at };
}
function mapShopkeeper(r) {
  return {
    id: String(r.id),
    name: r.name,
    phone: r.phone,
    location: r.location,
    credit_limit_kes: Number(r.credit_limit_kes),
    is_active: r.is_active,
    deactivation_reason: r.deactivation_reason || null,
    deactivated_at: r.deactivated_at || null,
    joined_at: r.joined_at,
    updated_at: r.updated_at,
    has_login: !!r.password_hash
  };
}

router.get('/', async (req,res)=>{ try { const {rows}=await pool.query('SELECT * FROM shopkeepers ORDER BY name'); const out=[]; for(const r of rows){const s=await computeStats(r.id); out.push({...mapShopkeeper(r),...s,credit_status:creditStatus(s.balance_kes,Number(r.credit_limit_kes))});} res.json(out);} catch(e){console.error(e);res.status(500).json({error:'Failed to load shopkeepers.'});} });

router.post('/', async (req,res)=>{ const {name,phone,location,credit_limit_kes,password}=req.body||{}; if(!name||!phone) return res.status(400).json({error:'name and phone are required.'});
  try { const {rows}=await pool.query(`INSERT INTO shopkeepers(name,phone,location,credit_limit_kes,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *`,[String(name).trim(),String(phone).trim(),location||'',Number(credit_limit_kes)||0,password?hashPassword(password):null]); res.status(201).json(mapShopkeeper(rows[0])); }
  catch(e){console.error(e); if(e.code==='23505') return res.status(409).json({error:'A shopkeeper with that phone already exists.'}); res.status(500).json({error:'Failed to create shopkeeper.'});}
});

router.get('/:id', async(req,res)=>{const id=Number(req.params.id); if(!Number.isInteger(id)||id<1)return res.status(404).json({error:'Shopkeeper not found.'}); try{const s=await pool.query('SELECT * FROM shopkeepers WHERE id=$1',[id]); if(!s.rowCount)return res.status(404).json({error:'Shopkeeper not found.'}); const [pays, payments, stats]=await Promise.all([pool.query('SELECT * FROM purchases WHERE shopkeeper_id=$1 ORDER BY date DESC LIMIT 200',[id]),pool.query('SELECT * FROM payments WHERE shopkeeper_id=$1 ORDER BY date DESC LIMIT 200',[id]),computeStats(id)]); const shop=mapShopkeeper(s.rows[0]); res.json({...shop,...stats,credit_status:creditStatus(stats.balance_kes,shop.credit_limit_kes),purchases:pays.rows,payments:payments.rows});}catch(e){console.error(e);res.status(500).json({error:'Failed to load shopkeeper.'});}});
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const {
    name,
    phone,
    location,
    credit_limit_kes,
    is_active,
    password,
    deactivation_reason
  } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({
      error: 'name and phone are required.'
    });
  }

  const active = is_active !== false;
  const reason = String(deactivation_reason || '').trim();

  if (!active && !reason) {
    return res.status(400).json({
      error: 'A reason is required when deactivating a shopkeeper.'
    });
  }

  try {
    const fields = [
      'name=$1',
      'phone=$2',
      'location=$3',
      'credit_limit_kes=$4',
      'is_active=$5',
      'deactivation_reason=$6',
      'deactivated_at=$7',
      'updated_at=NOW()'
    ];

    const values = [
      String(name).trim(),
      String(phone).trim(),
      location || '',
      Number(credit_limit_kes) || 0,
      active,
      active ? null : reason,
      active ? null : new Date()
    ];

    if (password) {
      fields.push(`password_hash=$${values.length + 1}`);
      values.push(hashPassword(password));
    }

    values.push(id);

    const { rows } = await pool.query(
      `UPDATE shopkeepers
       SET ${fields.join(',')}
       WHERE id=$${values.length}
       RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Shopkeeper not found.'
      });
    }

    res.json(mapShopkeeper(rows[0]));
  } catch (e) {
    console.error(e);

    if (e.code === '23505') {
      return res.status(409).json({
        error: 'A shopkeeper with that phone already exists.'
      });
    }

    res.status(500).json({
      error: 'Failed to update shopkeeper.'
    });
  }
});
router.post('/:id/purchases', async (req, res) => {
  const id = Number(req.params.id);
  const {
    product_name,
    quantity,
    amount_kes,
    notes,
    sale_date,
    wholesale_product_id
  } = req.body || {};

  const cleanName = String(product_name || '').trim();
  const qty = Number(quantity);
  const amount = Number(amount_kes);
  const productId = wholesale_product_id ? Number(wholesale_product_id) : null;
  const dateValue = String(sale_date || '').trim();

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid shopkeeper.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: 'Product name is required.' });
  }
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive whole number.' });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Sale amount must be greater than zero.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return res.status(400).json({ error: 'Sale date must use YYYY-MM-DD.' });
  }
  if (productId !== null && (!Number.isInteger(productId) || productId < 1)) {
    return res.status(400).json({ error: 'Invalid wholesale product.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const keeper = await client.query(
      'SELECT id, is_active FROM shopkeepers WHERE id=$1 FOR UPDATE',
      [id]
    );
    if (!keeper.rowCount) throw new Error('Shopkeeper not found.');
    if (!keeper.rows[0].is_active) throw new Error('Cannot record a sale for an inactive shopkeeper.');

    let resolvedProductId = null;
    let resolvedName = cleanName;

    if (productId !== null) {
      const product = await client.query(
        `SELECT id, product_name, stock_quantity, is_active
         FROM wholesale_products
         WHERE id=$1
         FOR UPDATE`,
        [productId]
      );
      if (!product.rowCount) throw new Error('Wholesale product not found.');
      if (!product.rows[0].is_active) throw new Error('Selected wholesale product is inactive.');

      const stockBefore = Number(product.rows[0].stock_quantity);
      if (stockBefore < qty) {
        throw new Error(`Cannot record the sale. Only ${stockBefore} units are in stock.`);
      }

      const stockAfter = stockBefore - qty;
      resolvedProductId = product.rows[0].id;
      resolvedName = cleanName || product.rows[0].product_name;

      await client.query(
        `UPDATE wholesale_products SET stock_quantity=$1, updated_at=NOW() WHERE id=$2`,
        [stockAfter, resolvedProductId]
      );

      await client.query(
        `INSERT INTO inventory_movements
         (wholesale_product_id, movement_type, quantity, stock_before, stock_after, reference_type, notes)
         VALUES($1,'sale',$2,$3,$4,'manual_sale',$5)`,
        [resolvedProductId, qty, stockBefore, stockAfter, `Manual sale to shopkeeper #${id}.`]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO purchases
       (shopkeeper_id, product_name, quantity, amount_kes, notes, date)
       VALUES($1,$2,$3,$4,$5,(($6::date)::timestamp AT TIME ZONE 'Africa/Nairobi'))
       RETURNING *`,
      [id, resolvedName, qty, amount, notes || null, dateValue]
    );

    await client.query('COMMIT');
    return res.status(201).json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return res.status(400).json({ error: e.message || 'Failed to record purchase.' });
  } finally {
    client.release();
  }
});

router.post('/:id/payments', async(req,res)=>{const id=Number(req.params.id);const {amount_kes,notes,method='cash',reference}=req.body||{};if(Number(amount_kes)<=0)return res.status(400).json({error:'A positive amount is required.'});try{const {rows}=await pool.query('INSERT INTO payments(shopkeeper_id,amount_kes,notes,method,reference,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,Number(amount_kes),notes||null,method,reference||null,'confirmed']);res.status(201).json(rows[0]);}catch(e){console.error(e);res.status(500).json({error:'Failed to record payment.'});}});

module.exports={router,computeStats,creditStatus};
