const express = require('express');
const { pool } = require('../../db');
const {
  wholesaleAuth,
  shopkeeperOnly
} = require('../../middleware/wholesaleAuth');
const { initiateSTKPush, formatPhone } = require('../../services/mpesa');

const router = express.Router();

router.use(wholesaleAuth);
router.use(shopkeeperOnly);


/* =========================================================
   HELPERS
========================================================= */

async function getCurrentShopkeeper(id) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      name,
      phone,
      location,
      credit_limit_kes,
      is_active,
      joined_at
    FROM shopkeepers
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}


async function getBalance(shopkeeperId) {
  const { rows } = await pool.query(
    `
    SELECT
      COALESCE(
        (
          SELECT SUM(amount_kes)
          FROM purchases
          WHERE shopkeeper_id = $1
        ),
        0
      ) AS purchases_total,

      COALESCE(
        (
          SELECT SUM(amount_kes)
          FROM payments
          WHERE shopkeeper_id = $1
            AND status = 'confirmed'
        ),
        0
      ) AS payments_total,

      (
        SELECT credit_limit_kes
        FROM shopkeepers
        WHERE id = $1
      ) AS credit_limit_kes
    `,
    [shopkeeperId]
  );

  const row = rows[0];

  const purchasesTotal = Number(row?.purchases_total || 0);
  const paymentsTotal = Number(row?.payments_total || 0);
  const creditLimit = Number(row?.credit_limit_kes || 0);

  const balance = Math.max(
    0,
    purchasesTotal - paymentsTotal
  );

  return {
    purchases_total: purchasesTotal,
    payments_total: paymentsTotal,
    balance_kes: balance,
    credit_limit_kes: creditLimit,
    available_credit_kes:
      creditLimit > 0
        ? Math.max(0, creditLimit - balance)
        : null
  };
}


/* =========================================================
   CURRENT SHOPKEEPER
========================================================= */

router.get('/me', async (req, res) => {
  try {
    const shopkeeper = await getCurrentShopkeeper(
      req.wholesaleUser.shopkeeperId
    );

    if (!shopkeeper) {
      return res.status(404).json({
        error: 'Shopkeeper account not found.'
      });
    }

    return res.json({
      ...shopkeeper,
      id: String(shopkeeper.id),
      credit_limit_kes: Number(shopkeeper.credit_limit_kes),
      is_active: !!shopkeeper.is_active
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load profile.'
    });
  }
});


/* =========================================================
   DASHBOARD
========================================================= */

router.get('/dashboard', async (req, res) => {
  try {
    const shopkeeperId = req.wholesaleUser.shopkeeperId;

    const [
      balance,
      recentPurchases,
      recentPayments
    ] = await Promise.all([
      getBalance(shopkeeperId),

      pool.query(
        `
        SELECT
          id,
          product_name,
          quantity,
          amount_kes,
          notes,
          date
        FROM purchases
        WHERE shopkeeper_id = $1
        ORDER BY date DESC
        LIMIT 8
        `,
        [shopkeeperId]
      ),

      pool.query(
        `
        SELECT
          id,
          amount_kes,
          notes,
          method,
          reference,
          status,
          date
        FROM payments
        WHERE shopkeeper_id = $1
        ORDER BY date DESC
        LIMIT 8
        `,
        [shopkeeperId]
      )
    ]);

    return res.json({
      ...balance,
      recent_purchases: recentPurchases.rows,
      recent_payments: recentPayments.rows
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load dashboard.'
    });
  }
});


/* =========================================================
   PRODUCTS
========================================================= */

router.get('/products', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wp.id,
        wp.product_id,
        COALESCE(p.name, wp.product_name) AS name,
        COALESCE(p.description, '') AS description,
        COALESCE(p.image_url, '') AS image_url,
        wp.wholesale_price_kes,
        wp.min_order_quantity,
        wp.stock_quantity,
        wp.minimum_stock,
        wp.is_active,

        CASE
          WHEN wp.stock_quantity <= 0 THEN 'out_of_stock'
          WHEN wp.stock_quantity <= wp.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END AS stock_status

      FROM wholesale_products wp

      LEFT JOIN products p
        ON p.id = wp.product_id

      WHERE wp.is_active = TRUE

      ORDER BY COALESCE(p.name, wp.product_name)
    `);

    return res.json(
      rows.map((product) => ({
        ...product,
        id: String(product.id),
        product_id: product.product_id
          ? String(product.product_id)
          : null,
        wholesale_price_kes:
          Number(product.wholesale_price_kes),
        min_order_quantity:
          Number(product.min_order_quantity),
        stock_quantity:
          Number(product.stock_quantity),
        minimum_stock:
          Number(product.minimum_stock)
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load wholesale products.'
    });
  }
});


/* =========================================================
   ORDERS
========================================================= */

router.get('/orders', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.*,

        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'product_id', i.product_id,
              'wholesale_product_id', i.wholesale_product_id,
              'product_name', i.product_name,
              'quantity', i.quantity,
              'unit_price_kes', i.unit_price_kes,
              'line_total_kes', i.line_total_kes
            )
            ORDER BY i.id
          )
          FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS items

      FROM wholesale_orders o

      LEFT JOIN wholesale_order_items i
        ON i.order_id = o.id

      WHERE o.shopkeeper_id = $1

      GROUP BY o.id

      ORDER BY o.created_at DESC
    `, [req.wholesaleUser.shopkeeperId]);

    return res.json(
      rows.map((order) => ({
        ...order,
        id: String(order.id),
        shopkeeper_id: String(order.shopkeeper_id),
        total_kes: Number(order.total_kes),

        items: order.items.map((item) => ({
          ...item,
          id: String(item.id),
          product_id:
            item.product_id
              ? String(item.product_id)
              : null,
          wholesale_product_id:
            item.wholesale_product_id
              ? String(item.wholesale_product_id)
              : null,
          quantity: Number(item.quantity),
          unit_price_kes:
            Number(item.unit_price_kes),
          line_total_kes:
            Number(item.line_total_kes)
        }))
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load orders.'
    });
  }
});


router.post('/orders', async (req, res) => {
  const shopkeeperId = req.wholesaleUser.shopkeeperId;
  const { items, notes } = req.body || {};

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({
      error: 'Add at least one product.'
    });
  }

  const requestedQuantities = new Map();

  for (const item of items) {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);

    if (
      !Number.isSafeInteger(productId) ||
      productId < 1 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        error: 'Each order item needs a valid product and whole-number quantity.'
      });
    }

    requestedQuantities.set(
      productId,
      (requestedQuantities.get(productId) || 0) + quantity
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: products } = await client.query(
      `
      SELECT
        wp.*,
        COALESCE(p.name, wp.product_name) AS resolved_product_name

      FROM wholesale_products wp

      LEFT JOIN products p
        ON p.id = wp.product_id

      WHERE wp.id = ANY($1::bigint[])
        AND wp.is_active = TRUE

      ORDER BY wp.id

      FOR UPDATE OF wp
      `,
      [[...requestedQuantities.keys()]]
    );

    const productsById = new Map(
      products.map((product) => [
        Number(product.id),
        product
      ])
    );

    const cleanItems = [];
    let total = 0;

    for (const [
      productId,
      quantity
    ] of requestedQuantities) {
      const product = productsById.get(productId);

      if (!product) {
        throw new Error(
          'One or more products are unavailable. Refresh the catalogue and try again.'
        );
      }

      if (
        quantity <
        Number(product.min_order_quantity)
      ) {
        throw new Error(
          `The minimum order for ${product.resolved_product_name} is ${product.min_order_quantity}.`
        );
      }

      if (
        Number(product.stock_quantity) <
        quantity
      ) {
        throw new Error(
          `${product.resolved_product_name} has only ${product.stock_quantity} in stock.`
        );
      }

      const lineTotal =
        quantity *
        Number(product.wholesale_price_kes);

      total += lineTotal;

      cleanItems.push({
        product,
        quantity,
        lineTotal
      });
    }

    const { rows: creditRows } =
      await client.query(
        `
        SELECT
          s.credit_limit_kes,

          COALESCE(
            (
              SELECT SUM(amount_kes)
              FROM purchases
              WHERE shopkeeper_id = s.id
            ),
            0
          )
          -
          COALESCE(
            (
              SELECT SUM(amount_kes)
              FROM payments
              WHERE shopkeeper_id = s.id
                AND status = 'confirmed'
            ),
            0
          ) AS balance

        FROM shopkeepers s

        WHERE s.id = $1
        FOR UPDATE
        `,
        [shopkeeperId]
      );

    if (!creditRows.length) {
      throw new Error(
        'Shopkeeper account was not found.'
      );
    }

    const creditLimit =
      Number(creditRows[0].credit_limit_kes || 0);

    const currentBalance =
      Math.max(
        0,
        Number(creditRows[0].balance || 0)
      );

    if (
      creditLimit > 0 &&
      currentBalance + total > creditLimit
    ) {
      throw new Error(
        `This order would exceed your credit limit by KES ${(
          currentBalance +
          total -
          creditLimit
        ).toLocaleString()}.`
      );
    }

    const { rows: orderRows } =
      await client.query(
        `
        INSERT INTO wholesale_orders
        (
          shopkeeper_id,
          status,
          total_kes,
          notes
        )
        VALUES
        ($1, 'pending', $2, $3)
        RETURNING *
        `,
        [
          shopkeeperId,
          total,
          String(notes || '').trim() || null
        ]
      );

    const order = orderRows[0];

    for (const item of cleanItems) {
      await client.query(
        `
        INSERT INTO wholesale_order_items
        (
          order_id,
          wholesale_product_id,
          product_id,
          product_name,
          quantity,
          unit_price_kes,
          line_total_kes
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          order.id,
          item.product.id,
          item.product.product_id,
          item.product.resolved_product_name,
          item.quantity,
          item.product.wholesale_price_kes,
          item.lineTotal
        ]
      );
    }

    await client.query('COMMIT');

    try {
      await pool.query(
        `
        INSERT INTO wholesale_notifications
        (
          shopkeeper_id,
          title,
          message
        )
        VALUES
        ($1, $2, $3)
        `,
        [
          shopkeeperId,
          'Order received',
          `Wholesale order #${order.id} was received and is awaiting approval.`
        ]
      );
    } catch (notificationError) {
      console.error(
        'Wholesale order notification failed:',
        notificationError
      );
    }

    return res.status(201).json({
      ...order,
      id: String(order.id),
      shopkeeper_id: String(order.shopkeeper_id),
      total_kes: Number(order.total_kes)
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error(error);

    return res.status(400).json({
      error:
        error.message ||
        'Failed to place order.'
    });
  } finally {
    client.release();
  }
});


/* =========================================================
   PAYMENT REQUESTS
========================================================= */

router.post('/payment-requests', async (req, res) => {
  const {
    amount_kes,
    method = 'mpesa',
    reference,
    notes
  } = req.body || {};

  const amount = Number(amount_kes);
  const cleanMethod = String(method || '').toLowerCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      error: 'Enter a valid payment amount.'
    });
  }

  if (!['cash', 'mpesa', 'bank'].includes(cleanMethod)) {
    return res.status(400).json({
      error: 'Invalid payment method.'
    });
  }

  const shopkeeper =
    await getCurrentShopkeeper(
      req.wholesaleUser.shopkeeperId
    );

  if (!shopkeeper) {
    return res.status(404).json({
      error: 'Shopkeeper account not found.'
    });
  }

  /*
    M-Pesa payment:
    actually initiate an STK push using the shopkeeper's
    registered phone number.
  */
  if (cleanMethod === 'mpesa') {
    if (!process.env.MPESA_CALLBACK_URL) {
      return res.status(500).json({
        error: 'M-Pesa callback URL is not configured.'
      });
    }

    if (
      !process.env.MPESA_CONSUMER_KEY ||
      !process.env.MPESA_CONSUMER_SECRET ||
      !process.env.MPESA_SHORTCODE ||
      !process.env.MPESA_PASSKEY
    ) {
      return res.status(500).json({
        error: 'M-Pesa is not fully configured on the server.'
      });
    }

    const phone = formatPhone(
      shopkeeper.phone
    );

    if (!/^254\d{9}$/.test(phone)) {
      return res.status(400).json({
        error: 'The phone number on your shopkeeper account is not a valid Kenyan M-Pesa number.'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `
        INSERT INTO payments
        (
          shopkeeper_id,
          amount_kes,
          method,
          reference,
          notes,
          status,
          mpesa_phone
        )
        VALUES
        ($1, $2, 'mpesa', $3, $4, 'pending', $5)
        RETURNING *
        `,
        [
          req.wholesaleUser.shopkeeperId,
          amount,
          reference
            ? String(reference).trim()
            : null,
          notes
            ? String(notes).trim()
            : null,
          phone
        ]
      );

      const payment = rows[0];

      let stk;

      try {
        stk = await initiateSTKPush({
          phone,
          amount,
          accountReference: `WHPAY${payment.id}`,
          description: `KENJAV Wholesale Payment #${payment.id}`
        });
      } catch (mpesaError) {
        console.error(
          'Wholesale M-Pesa STK push failed:',
          mpesaError.response
            ? mpesaError.response.data
            : mpesaError.message
        );

        await client.query(
          `
          UPDATE payments
          SET status = 'failed'
          WHERE id = $1
          `,
          [payment.id]
        );

        await client.query('COMMIT');

        return res.status(502).json({
          error: 'Could not start M-Pesa payment. Please try again.'
        });
      }

      await client.query(
        `
        UPDATE payments
        SET
          status = 'processing',
          mpesa_checkout_request_id = $1,
          mpesa_merchant_request_id = $2
        WHERE id = $3
        `,
        [
          stk.CheckoutRequestID || null,
          stk.MerchantRequestID || null,
          payment.id
        ]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        message:
          'M-Pesa prompt sent. Check your phone and enter your M-Pesa PIN.',
        payment_id: String(payment.id),
        checkout_request_id:
          stk.CheckoutRequestID || null,
        status: 'processing'
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}

      console.error(error);

      return res.status(500).json({
        error: 'Failed to start M-Pesa payment.'
      });
    } finally {
      client.release();
    }
  }


  /*
    Cash and bank payments remain pending until the admin
    confirms them.
  */
  try {
    const { rows } = await pool.query(
      `
      INSERT INTO payments
      (
        shopkeeper_id,
        amount_kes,
        method,
        reference,
        notes,
        status
      )
      VALUES
      ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
      `,
      [
        req.wholesaleUser.shopkeeperId,
        amount,
        cleanMethod,
        reference
          ? String(reference).trim()
          : null,
        notes
          ? String(notes).trim()
          : null
      ]
    );

    return res.status(201).json({
      ...rows[0],
      id: String(rows[0].id),
      shopkeeper_id:
        String(rows[0].shopkeeper_id),
      amount_kes:
        Number(rows[0].amount_kes)
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to submit payment.'
    });
  }
});


/* =========================================================
   PAYMENT HISTORY
========================================================= */

router.get('/payments', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM payments
      WHERE shopkeeper_id = $1
      ORDER BY date DESC, id DESC
      `,
      [req.wholesaleUser.shopkeeperId]
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        shopkeeper_id:
          String(row.shopkeeper_id),
        amount_kes:
          Number(row.amount_kes)
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load payments.'
    });
  }
});


/* =========================================================
   PURCHASE HISTORY
========================================================= */

router.get('/purchases', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM purchases
      WHERE shopkeeper_id = $1
      ORDER BY date DESC, id DESC
      `,
      [req.wholesaleUser.shopkeeperId]
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        shopkeeper_id:
          String(row.shopkeeper_id),
        quantity:
          Number(row.quantity),
        amount_kes:
          Number(row.amount_kes)
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load purchases.'
    });
  }
});


/* =========================================================
   NOTIFICATIONS
========================================================= */

router.get('/notifications', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM wholesale_notifications
      WHERE shopkeeper_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [req.wholesaleUser.shopkeeperId]
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        shopkeeper_id:
          String(row.shopkeeper_id)
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load notifications.'
    });
  }
});


router.put('/notifications/:id/read', async (req, res) => {
  const notificationId =
    Number(req.params.id);

  if (
    !Number.isSafeInteger(notificationId) ||
    notificationId < 1
  ) {
    return res.status(400).json({
      error: 'Invalid notification.'
    });
  }

  try {
    const { rows } = await pool.query(
      `
      UPDATE wholesale_notifications
      SET is_read = TRUE
      WHERE id = $1
        AND shopkeeper_id = $2
      RETURNING *
      `,
      [
        notificationId,
        req.wholesaleUser.shopkeeperId
      ]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Notification not found.'
      });
    }

    return res.json({
      ...rows[0],
      id: String(rows[0].id),
      shopkeeper_id:
        String(rows[0].shopkeeper_id)
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to update notification.'
    });
  }
});


/* =========================================================
   PROFILE
========================================================= */

router.put('/profile', async (req, res) => {
  const {
    name,
    phone,
    location
  } = req.body || {};

  const cleanName =
    String(name || '').trim();

  const cleanPhone =
    String(phone || '').trim();

  const cleanLocation =
    String(location || '').trim();

  if (!cleanName || !cleanPhone) {
    return res.status(400).json({
      error: 'Name and phone are required.'
    });
  }

  try {
    const { rows } = await pool.query(
      `
      UPDATE shopkeepers

      SET
        name = $1,
        phone = $2,
        location = $3,
        updated_at = NOW()

      WHERE id = $4

      RETURNING
        id,
        name,
        phone,
        location,
        credit_limit_kes,
        is_active,
        joined_at
      `,
      [
        cleanName,
        cleanPhone,
        cleanLocation,
        req.wholesaleUser.shopkeeperId
      ]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Shopkeeper account not found.'
      });
    }

    return res.json({
      ...rows[0],
      id: String(rows[0].id),
      credit_limit_kes:
        Number(rows[0].credit_limit_kes),
      is_active:
        !!rows[0].is_active
    });
  } catch (error) {
    console.error(error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'That phone number is already registered to another shopkeeper.'
      });
    }

    return res.status(500).json({
      error: 'Failed to update profile.'
    });
  }
});


module.exports = router;