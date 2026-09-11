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
            SELECT SUM(amount_kes)
            FROM purchases
            WHERE (date AT TIME ZONE 'Africa/Nairobi')::date = $1::date
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

        COALESCE(p.total_purchases, 0) AS total_purchases,

        COALESCE(pay.total_payments, 0) AS total_payments,

        COALESCE(p.order_count, 0) AS order_count

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
            SELECT SUM(amount_kes)
            FROM purchases
            WHERE (date AT TIME ZONE 'Africa/Nairobi')::date >= ($1 || '-01')::date
              AND (date AT TIME ZONE 'Africa/Nairobi')::date < (($1 || '-01')::date + INTERVAL '1 month')
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