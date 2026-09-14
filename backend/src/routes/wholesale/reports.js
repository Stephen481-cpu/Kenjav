const express = require('express');
const { pool } = require('../../db');

const router = express.Router();

/*
=========================================================
HELPERS
=========================================================
*/

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(value);
}

function todayNairobi() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
}

/*
=========================================================
DAILY REPORT
=========================================================
GET /api/wholesale/reports/daily?date=YYYY-MM-DD
=========================================================
*/

router.get('/daily', async (req, res) => {
  try {
    const date =
      req.query.date ||
      todayNairobi();

    if (!validDate(date)) {
      return res.status(400).json({
        error: 'Invalid date. Use YYYY-MM-DD.'
      });
    }

    const daily = await pool.query(
      `
      SELECT
        COALESCE(
          (
            SELECT COALESCE(SUM(amount_kes), 0)
            FROM purchases
            WHERE (date AT TIME ZONE 'Africa/Nairobi')::date = $1::date
          ),
          0
        )
        + COALESCE(
          (
            SELECT COALESCE(SUM(amount_kes), 0)
            FROM manual_sales
            WHERE sale_date = $1::date
          ),
          0
        ) AS sales_kes,

        COALESCE(
          (
            SELECT SUM(amount_kes)
            FROM payments
            WHERE (date AT TIME ZONE 'Africa/Nairobi')::date = $1::date
              AND status = 'confirmed'
          ),
          0
        ) AS payments_kes,

        COALESCE(
          (
            SELECT SUM(amount_kes)
            FROM wholesale_expenses
            WHERE expense_date = $1::date
          ),
          0
        ) AS expenses_kes
      `,
      [date]
    );

    const row = daily.rows[0];

    const sales = Number(row.sales_kes);
    const payments = Number(row.payments_kes);
    const expensesTotal = Number(row.expenses_kes);

    const profit = sales - expensesTotal;

    const shopkeepers = await pool.query(`
      SELECT
        s.id,
        s.name,

        COALESCE(p.total_purchases, 0) + COALESCE(ms.total_manual_sales, 0) AS total_purchases,

        COALESCE(pay.total_payments, 0) AS total_payments,

        COALESCE(p.order_count, 0) + COALESCE(ms.manual_sale_count, 0) AS order_count

      FROM shopkeepers s

      LEFT JOIN (
        SELECT
          shopkeeper_id,
          SUM(amount_kes) AS total_purchases,
          COUNT(*) AS order_count
        FROM purchases
        GROUP BY shopkeeper_id
      ) p
        ON p.shopkeeper_id = s.id

      LEFT JOIN (
        SELECT
          shopkeeper_id,
          SUM(amount_kes) AS total_manual_sales,
          COUNT(*) AS manual_sale_count
        FROM manual_sales
        WHERE shopkeeper_id IS NOT NULL
        GROUP BY shopkeeper_id
      ) ms
        ON ms.shopkeeper_id = s.id

      LEFT JOIN (
        SELECT
          shopkeeper_id,
          SUM(amount_kes) AS total_payments
        FROM payments
        WHERE status = 'confirmed'
        GROUP BY shopkeeper_id
      ) pay
        ON pay.shopkeeper_id = s.id
    `);

    let totalDebt = 0;
    let bestShopkeeper = null;
    let largestDebtor = null;
    let mostLoyal = null;

    for (const s of shopkeepers.rows) {
      const totalPurchases =
        Number(s.total_purchases);

      const totalPayments =
        Number(s.total_payments);

      const balance =
        totalPurchases - totalPayments;

      const orderCount =
        Number(s.order_count);

      if (balance > 0) {
        totalDebt += balance;
      }

      if (
        totalPurchases > 0 &&
        (
          !bestShopkeeper ||
          totalPurchases > bestShopkeeper.value
        )
      ) {
        bestShopkeeper = {
          name: s.name,
          value: totalPurchases
        };
      }

      if (
        balance > 0 &&
        (
          !largestDebtor ||
          balance > largestDebtor.value
        )
      ) {
        largestDebtor = {
          name: s.name,
          value: balance
        };
      }

      if (
        orderCount > 0 &&
        (
          !mostLoyal ||
          orderCount > mostLoyal.value
        )
      ) {
        mostLoyal = {
          name: s.name,
          value: orderCount
        };
      }
    }

    const expenseRows = await pool.query(
      `
      SELECT
        id,
        amount_kes,
        category,
        description,
        expense_date,
        created_at
      FROM wholesale_expenses
      WHERE expense_date = $1::date
      ORDER BY created_at DESC, id DESC
      `,
      [date]
    );

    res.json({
      date,

      todays_sales_kes: sales,

      todays_payments_kes: payments,

      todays_expenses_kes: expensesTotal,

      todays_profit_kes: profit,

      total_debt_kes: totalDebt,

      best_shopkeeper: bestShopkeeper,

      largest_debtor: largestDebtor,

      most_loyal_customer: mostLoyal,

      expenses: expenseRows.rows.map(expense => ({
        ...expense,
        id: String(expense.id),
        amount_kes: Number(expense.amount_kes)
      }))
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to generate daily report.'
    });
  }
});


/*
=========================================================
MONTHLY REPORT
=========================================================
GET /api/wholesale/reports/monthly?month=YYYY-MM
=========================================================
*/

router.get('/monthly', async (req, res) => {
  try {
    const month =
      req.query.month ||
      todayNairobi().slice(0, 7);

    if (!validMonth(month)) {
      return res.status(400).json({
        error: 'Invalid month. Use YYYY-MM.'
      });
    }

    const result = await pool.query(
      `
      SELECT
        COALESCE(
          (
            SELECT COALESCE(SUM(amount_kes), 0)
            FROM purchases
            WHERE (date AT TIME ZONE 'Africa/Nairobi')::date >= ($1 || '-01')::date
              AND (date AT TIME ZONE 'Africa/Nairobi')::date < (($1 || '-01')::date + INTERVAL '1 month')
          ),
          0
        )
        + COALESCE(
          (
            SELECT COALESCE(SUM(amount_kes), 0)
            FROM manual_sales
            WHERE sale_date >= ($1 || '-01')::date
              AND sale_date < (($1 || '-01')::date + INTERVAL '1 month')
          ),
          0
        ) AS sales_kes,

        COALESCE(
          (
            SELECT SUM(amount_kes)
            FROM payments
            WHERE (date AT TIME ZONE 'Africa/Nairobi')::date >= ($1 || '-01')::date
              AND (date AT TIME ZONE 'Africa/Nairobi')::date < (($1 || '-01')::date + INTERVAL '1 month')
              AND status = 'confirmed'
          ),
          0
        ) AS payments_kes,

        COALESCE(
          (
            SELECT SUM(amount_kes)
            FROM wholesale_expenses
            WHERE expense_date >= ($1 || '-01')::date
              AND expense_date < (($1 || '-01')::date + INTERVAL '1 month')
          ),
          0
        ) AS expenses_kes
      `,
      [month]
    );

    const row = result.rows[0];

    const sales = Number(row.sales_kes);
    const payments = Number(row.payments_kes);
    const expenses = Number(row.expenses_kes);

    const profit = sales - expenses;

    const expenseBreakdown = await pool.query(
      `
      SELECT
        category,
        SUM(amount_kes) AS amount_kes
      FROM wholesale_expenses
      WHERE expense_date >= ($1 || '-01')::date
        AND expense_date < (($1 || '-01')::date + INTERVAL '1 month')
      GROUP BY category
      ORDER BY amount_kes DESC
      `,
      [month]
    );

    const dailyBreakdown = await pool.query(
      `
      SELECT
        expense_date,
        SUM(amount_kes) AS expenses_kes
      FROM wholesale_expenses
      WHERE expense_date >= ($1 || '-01')::date
        AND expense_date < (($1 || '-01')::date + INTERVAL '1 month')
      GROUP BY expense_date
      ORDER BY expense_date ASC
      `,
      [month]
    );

    res.json({
      month,

      total_sales_kes: sales,

      total_payments_kes: payments,

      total_expenses_kes: expenses,

      total_profit_kes: profit,

      expense_breakdown:
        expenseBreakdown.rows.map(row => ({
          category: row.category,
          amount_kes: Number(row.amount_kes)
        })),

      daily_expenses:
        dailyBreakdown.rows.map(row => ({
          date: row.expense_date,
          expenses_kes: Number(row.expenses_kes)
        }))
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to generate monthly report.'
    });
  }
});


/*
=========================================================
GET MANUAL / OFFLINE SALES
=========================================================
GET /api/wholesale/reports/manual-sales?date=YYYY-MM-DD
=========================================================
*/

router.get('/manual-sales', async (req, res) => {
  try {
    const date = req.query.date || todayNairobi();

    if (!validDate(date)) {
      return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const { rows } = await pool.query(
      `
      SELECT
        ms.*,
        s.name AS shopkeeper_name,
        s.phone AS shopkeeper_phone,
        wp.product_name AS catalogue_product_name
      FROM manual_sales ms
      LEFT JOIN shopkeepers s ON s.id = ms.shopkeeper_id
      LEFT JOIN wholesale_products wp ON wp.id = ms.wholesale_product_id
      WHERE ms.sale_date = $1::date
      ORDER BY ms.created_at DESC, ms.id DESC
      `,
      [date]
    );

    res.json(rows.map(row => ({
      ...row,
      id: String(row.id),
      shopkeeper_id: row.shopkeeper_id == null ? null : String(row.shopkeeper_id),
      wholesale_product_id: row.wholesale_product_id == null ? null : String(row.wholesale_product_id),
      quantity: row.quantity == null ? null : Number(row.quantity),
      amount_kes: Number(row.amount_kes)
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load manual sales.' });
  }
});

/*
=========================================================
CREATE MANUAL / OFFLINE SALE
=========================================================
POST /api/wholesale/reports/manual-sales
=========================================================
*/

router.post('/manual-sales', async (req, res) => {
  const { shopkeeper_id, wholesale_product_id, product_name, quantity, amount_kes,
    customer_type = 'walk_in', customer_name, payment_method, reference, sale_period, sale_date, notes } = req.body || {};
  const amount = Number(amount_kes);
  const qty = quantity === '' || quantity == null ? null : Number(quantity);
  const shopkeeperId = shopkeeper_id === '' || shopkeeper_id == null ? null : Number(shopkeeper_id);
  const productId = wholesale_product_id === '' || wholesale_product_id == null ? null : Number(wholesale_product_id);
  const date = String(sale_date || todayNairobi()).trim();
  const type = String(customer_type || 'walk_in').trim().toLowerCase();
  const method = payment_method ? String(payment_method).trim().toLowerCase() : null;
  const cleanProductName = String(product_name || '').trim() || null;
  const cleanCustomerName = String(customer_name || '').trim() || null;
  const cleanReference = String(reference || '').trim() || null;
  const cleanNotes = String(notes || '').trim() || null;
  const allowedCustomerTypes = new Set(['walk_in','shopkeeper','other','unspecified']);
  const allowedPaymentMethods = new Set(['cash','mpesa','bank','credit','other']);
  const allowedPeriods = new Set(['morning','afternoon','evening','all_day']);

  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error:'Sale amount must be greater than zero.' });
  if (!validDate(date)) return res.status(400).json({ error:'Sale date must use YYYY-MM-DD.' });
  if (!allowedCustomerTypes.has(type)) return res.status(400).json({ error:'Invalid customer type.' });
  if (type === 'shopkeeper' && (!Number.isInteger(shopkeeperId) || shopkeeperId < 1)) return res.status(400).json({ error:'Select the shopkeeper for this sale.' });
  if (shopkeeperId !== null && (!Number.isInteger(shopkeeperId) || shopkeeperId < 1)) return res.status(400).json({ error:'Invalid shopkeeper.' });
  if (type !== 'shopkeeper' && shopkeeperId !== null) return res.status(400).json({ error:'A shopkeeper can only be selected for a shopkeeper sale.' });
  if (productId !== null && (!Number.isInteger(productId) || productId < 1)) return res.status(400).json({ error:'Invalid wholesale product.' });
  if (qty !== null && (!Number.isInteger(qty) || qty < 1)) return res.status(400).json({ error:'Quantity must be a positive whole number when provided.' });
  if (productId !== null && qty === null) return res.status(400).json({ error:'Enter the quantity when selecting a catalogue product.' });
  if (method && !allowedPaymentMethods.has(method)) return res.status(400).json({ error:'Invalid payment method.' });
  if (sale_period && !allowedPeriods.has(String(sale_period))) return res.status(400).json({ error:'Invalid sale period.' });
  if (method === 'credit' && type !== 'shopkeeper') return res.status(400).json({ error:'Credit sales must be assigned to a shopkeeper.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (shopkeeperId !== null) {
      const keeper = await client.query('SELECT id,is_active FROM shopkeepers WHERE id=$1 FOR UPDATE', [shopkeeperId]);
      if (!keeper.rowCount) throw new Error('Shopkeeper not found.');
      if (!keeper.rows[0].is_active) throw new Error('Cannot record a sale for an inactive shopkeeper.');
    }
    let resolvedProductId = null;
    let resolvedProductName = cleanProductName;
    if (productId !== null) {
      const product = await client.query(`SELECT id,COALESCE(product_name,'') AS product_name,stock_quantity,is_active FROM wholesale_products WHERE id=$1 FOR UPDATE`, [productId]);
      if (!product.rowCount) throw new Error('Wholesale product not found.');
      if (!product.rows[0].is_active) throw new Error('Selected wholesale product is inactive.');
      const before = Number(product.rows[0].stock_quantity);
      if (before < qty) throw new Error(`Cannot record the sale. Only ${before} units are in stock.`);
      const after = before - qty;
      resolvedProductId = product.rows[0].id;
      resolvedProductName = resolvedProductName || product.rows[0].product_name || 'Wholesale product';
      await client.query('UPDATE wholesale_products SET stock_quantity=$1,updated_at=NOW() WHERE id=$2', [after,resolvedProductId]);
      await client.query(`INSERT INTO inventory_movements(wholesale_product_id,movement_type,quantity,stock_before,stock_after,reference_type,notes) VALUES($1,'sale',$2,$3,$4,'manual_sale',$5)`, [resolvedProductId,qty,before,after,`Manual sale${shopkeeperId ? ` to shopkeeper #${shopkeeperId}` : ''}.`]);
    }
    const saleResult = await client.query(`INSERT INTO manual_sales(shopkeeper_id,wholesale_product_id,product_name,quantity,amount_kes,customer_type,customer_name,payment_method,reference,sale_period,sale_date,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12) RETURNING *`, [shopkeeperId,resolvedProductId,resolvedProductName,qty,amount,type,cleanCustomerName,method,cleanReference,sale_period ? String(sale_period) : null,date,cleanNotes]);
    const sale = saleResult.rows[0];
    if (shopkeeperId !== null && method && method !== 'credit') {
      await client.query(`INSERT INTO payments(shopkeeper_id,amount_kes,notes,method,reference,status,manual_sale_id) VALUES($1,$2,$3,$4,$5,'confirmed',$6)`, [shopkeeperId,amount,`Payment attached to manual sale #${sale.id}.`,method,cleanReference,sale.id]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ ...sale,id:String(sale.id),shopkeeper_id:sale.shopkeeper_id==null?null:String(sale.shopkeeper_id),wholesale_product_id:sale.wholesale_product_id==null?null:String(sale.wholesale_product_id),quantity:sale.quantity==null?null:Number(sale.quantity),amount_kes:Number(sale.amount_kes) });
  } catch (err) {
    await client.query('ROLLBACK'); console.error(err); return res.status(400).json({ error:err.message || 'Failed to record manual sale.' });
  } finally { client.release(); }
});

/*
=========================================================
DELETE MANUAL / OFFLINE SALE
=========================================================
*/

router.delete('/manual-sales/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM manual_sales WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error:'Manual sale not found.' }); }
    const sale=result.rows[0];
    if (sale.wholesale_product_id !== null && sale.quantity !== null) {
      const product=await client.query('SELECT id,stock_quantity FROM wholesale_products WHERE id=$1 FOR UPDATE',[sale.wholesale_product_id]);
      if(product.rowCount){
        const before=Number(product.rows[0].stock_quantity), after=before+Number(sale.quantity);
        await client.query('UPDATE wholesale_products SET stock_quantity=$1,updated_at=NOW() WHERE id=$2',[after,sale.wholesale_product_id]);
        await client.query(`INSERT INTO inventory_movements(wholesale_product_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,notes) VALUES($1,'return',$2,$3,$4,'manual_sale',$5,$6)`,[sale.wholesale_product_id,sale.quantity,before,after,sale.id,'Stock restored after deleting a manual sale.']);
      }
    }
    await client.query('DELETE FROM manual_sales WHERE id=$1',[sale.id]);
    await client.query('COMMIT');
    return res.json({message:'Manual sale deleted successfully.',id:String(sale.id)});
  } catch(err){ await client.query('ROLLBACK'); console.error(err); return res.status(500).json({error:'Failed to delete manual sale.'}); }
  finally{ client.release(); }
});


/*
=========================================================
GET EXPENSES
=========================================================
GET /api/wholesale/reports/expenses?date=YYYY-MM-DD
=========================================================
*/

router.get('/expenses', async (req, res) => {
  try {
    const date = req.query.date;

    let query;
    let params = [];

    if (date) {
      if (!validDate(date)) {
        return res.status(400).json({
          error: 'Invalid date.'
        });
      }

      query = `
        SELECT
          id,
          amount_kes,
          category,
          description,
          expense_date,
          created_at
        FROM wholesale_expenses
        WHERE expense_date = $1::date
        ORDER BY created_at DESC, id DESC
      `;

      params = [date];

    } else {
      query = `
        SELECT
          id,
          amount_kes,
          category,
          description,
          expense_date,
          created_at
        FROM wholesale_expenses
        ORDER BY expense_date DESC, created_at DESC, id DESC
        LIMIT 200
      `;
    }

    const { rows } = await pool.query(
      query,
      params
    );

    res.json(
      rows.map(row => ({
        ...row,
        id: String(row.id),
        amount_kes: Number(row.amount_kes)
      }))
    );

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to load expenses.'
    });
  }
});


/*
=========================================================
CREATE EXPENSE
=========================================================
POST /api/wholesale/reports/expenses
=========================================================
*/

router.post('/expenses', async (req, res) => {
  try {
    const {
      amount_kes,
      category,
      description = '',
      expense_date
    } = req.body || {};

    const amount = Number(amount_kes);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Expense amount must be greater than zero.'
      });
    }

    if (
      !category ||
      !String(category).trim()
    ) {
      return res.status(400).json({
        error: 'Expense category is required.'
      });
    }

    const date =
      expense_date ||
      todayNairobi();

    if (!validDate(date)) {
      return res.status(400).json({
        error: 'Invalid expense date.'
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO wholesale_expenses
      (
        amount_kes,
        category,
        description,
        expense_date
      )
      VALUES($1,$2,$3,$4)
      RETURNING *
      `,
      [
        amount,
        String(category).trim(),
        String(description || '').trim(),
        date
      ]
    );

    res.status(201).json({
      ...rows[0],
      id: String(rows[0].id),
      amount_kes: Number(rows[0].amount_kes)
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to record expense.'
    });
  }
});


/*
=========================================================
DELETE EXPENSE
=========================================================
*/

router.delete('/expenses/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      DELETE FROM wholesale_expenses
      WHERE id=$1
      RETURNING *
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Expense not found.'
      });
    }

    res.json({
      message: 'Expense deleted successfully.',
      id: String(rows[0].id)
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Failed to delete expense.'
    });
  }
});


module.exports = router;