const express = require('express');
const { pool } = require('../../db');
const { adminAuth } = require('../../middleware/adminAuth');

const router = express.Router();

router.use(adminAuth);

/* =========================================================
   HELPERS
========================================================= */

function serializeWholesaleProduct(row) {
  return {
    ...row,
    id: String(row.id),
    product_id: row.product_id ? String(row.product_id) : null,
    wholesale_price_kes: Number(row.wholesale_price_kes),
    min_order_quantity: Number(row.min_order_quantity),
    stock_quantity: Number(row.stock_quantity),
    minimum_stock: Number(row.minimum_stock || 0),
    is_active: !!row.is_active
  };
}

function serializeOrder(row) {
  return {
    ...row,
    id: String(row.id),
    shopkeeper_id: String(row.shopkeeper_id),
    total_kes: Number(row.total_kes),
    items: Array.isArray(row.items)
      ? row.items.map((item) => ({
          ...item,
          id: item.id != null ? String(item.id) : null,
          wholesale_product_id:
            item.wholesale_product_id != null
              ? String(item.wholesale_product_id)
              : null,
          product_id:
            item.product_id != null
              ? String(item.product_id)
              : null,
          quantity: Number(item.quantity),
          unit_price_kes: Number(item.unit_price_kes),
          line_total_kes: Number(item.line_total_kes)
        }))
      : []
  };
}


/* =========================================================
   WHOLESALE PRODUCTS
========================================================= */

router.get('/products', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wp.*,
        COALESCE(p.name, wp.product_name) AS name,

        CASE
          WHEN wp.stock_quantity = 0 THEN 'out_of_stock'
          WHEN wp.stock_quantity <= wp.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END AS stock_status

      FROM wholesale_products wp

      LEFT JOIN products p
        ON p.id = wp.product_id

      ORDER BY
        COALESCE(p.name, wp.product_name),
        wp.id
    `);

    return res.json(rows.map(serializeWholesaleProduct));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load wholesale products.'
    });
  }
});


router.post('/products', async (req, res) => {
  const {
    product_id,
    product_name,
    wholesale_price_kes,
    min_order_quantity = 1,
    stock_quantity = 0,
    minimum_stock = 10
  } = req.body || {};

  const cleanProductId = product_id
    ? String(product_id).trim()
    : null;

  const cleanProductName = String(product_name || '').trim();

  if (!cleanProductId && !cleanProductName) {
    return res.status(400).json({
      error: 'Select a product or enter a product name.'
    });
  }

  const price = Number(wholesale_price_kes);
  const minOrder = Number(min_order_quantity);
  const stock = Number(stock_quantity);
  const minimumStock = Number(minimum_stock);

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({
      error: 'Wholesale price must be a valid non-negative number.'
    });
  }

  if (!Number.isInteger(minOrder) || minOrder < 1) {
    return res.status(400).json({
      error: 'Minimum order quantity must be a positive whole number.'
    });
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({
      error: 'Stock quantity must be a non-negative whole number.'
    });
  }

  if (!Number.isInteger(minimumStock) || minimumStock < 0) {
    return res.status(400).json({
      error: 'Minimum stock must be a non-negative whole number.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let resolvedName = cleanProductName || null;

    if (cleanProductId) {
      const product = await client.query(
        `
        SELECT id, name
        FROM products
        WHERE id = $1
        LIMIT 1
        `,
        [cleanProductId]
      );

      if (!product.rowCount) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          error: 'Selected KENJAV product was not found.'
        });
      }

      resolvedName = product.rows[0].name;
    }

    const { rows } = await client.query(
      `
      INSERT INTO wholesale_products
      (
        product_id,
        product_name,
        wholesale_price_kes,
        min_order_quantity,
        stock_quantity,
        minimum_stock
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        cleanProductId,
        resolvedName,
        price,
        minOrder,
        stock,
        minimumStock
      ]
    );

    const product = rows[0];

    if (stock > 0) {
      await client.query(
        `
        INSERT INTO inventory_movements
        (
          wholesale_product_id,
          movement_type,
          quantity,
          stock_before,
          stock_after,
          reference_type,
          reference_id,
          notes
        )
        VALUES
        ($1, 'opening', $2, $3, $4, $5, $6, $7)
        `,
        [
          product.id,
          stock,
          0,
          stock,
          'admin',
          product.id,
          'Opening stock when wholesale product was created.'
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json(
      serializeWholesaleProduct(product)
    );
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(error);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'This product is already in the wholesale catalogue.'
      });
    }

    return res.status(500).json({
      error: 'Failed to create wholesale product.'
    });
  } finally {
    client.release();
  }
});


router.put('/products/:id', async (req, res) => {
  const {
    wholesale_price_kes,
    min_order_quantity,
    stock_quantity,
    minimum_stock,
    is_active,
    stock_reason
  } = req.body || {};

  const id = Number(req.params.id);
  const price = Number(wholesale_price_kes);
  const minOrder = Number(min_order_quantity);
  const newStock = Number(stock_quantity);
  const newMinimumStock = Number(minimum_stock);
  const stockReason = String(stock_reason || '').trim();

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      error: 'Invalid wholesale product.'
    });
  }

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({
      error: 'Wholesale price must be a valid non-negative number.'
    });
  }

  if (!Number.isInteger(minOrder) || minOrder < 1) {
    return res.status(400).json({
      error: 'Minimum order quantity must be a positive whole number.'
    });
  }

  if (!Number.isInteger(newStock) || newStock < 0) {
    return res.status(400).json({
      error: 'Stock quantity must be a non-negative whole number.'
    });
  }

  if (!Number.isInteger(newMinimumStock) || newMinimumStock < 0) {
    return res.status(400).json({
      error: 'Minimum stock must be a non-negative whole number.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `
      SELECT *
      FROM wholesale_products
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (!current.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Product not found.'
      });
    }

    const oldStock = Number(current.rows[0].stock_quantity);

    if (newStock !== oldStock && !stockReason) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'A reason is required when changing stock.'
      });
    }

    const active = is_active !== false;

    const { rows } = await client.query(
      `
      UPDATE wholesale_products
      SET
        wholesale_price_kes = $1,
        min_order_quantity = $2,
        stock_quantity = $3,
        minimum_stock = $4,
        is_active = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        price,
        minOrder,
        newStock,
        newMinimumStock,
        active,
        id
      ]
    );

    if (newStock !== oldStock) {
      const difference = newStock - oldStock;

      await client.query(
        `
        INSERT INTO inventory_movements
        (
          wholesale_product_id,
          movement_type,
          quantity,
          stock_before,
          stock_after,
          reference_type,
          reference_id,
          notes
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          id,
          difference > 0 ? 'restock' : 'adjustment',
          Math.abs(difference),
          oldStock,
          newStock,
          'admin',
          id,
          stockReason
        ]
      );
    }

    await client.query('COMMIT');

    return res.json(
      serializeWholesaleProduct(rows[0])
    );
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(error);

    return res.status(500).json({
      error: 'Failed to update wholesale product.'
    });
  } finally {
    client.release();
  }
});


/* =========================================================
   INVENTORY
========================================================= */

router.get('/inventory', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wp.id,
        wp.product_id,
        COALESCE(p.name, wp.product_name) AS name,
        wp.wholesale_price_kes,
        wp.min_order_quantity,
        wp.stock_quantity,
        wp.minimum_stock,
        wp.is_active,

        CASE
          WHEN wp.stock_quantity = 0 THEN 'out_of_stock'
          WHEN wp.stock_quantity <= wp.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END AS stock_status

      FROM wholesale_products wp

      LEFT JOIN products p
        ON p.id = wp.product_id

      ORDER BY
        CASE
          WHEN wp.stock_quantity = 0 THEN 1
          WHEN wp.stock_quantity <= wp.minimum_stock THEN 2
          ELSE 3
        END,
        COALESCE(p.name, wp.product_name)
    `);

    return res.json(
      rows.map(serializeWholesaleProduct)
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load inventory.'
    });
  }
});


router.get('/inventory/:id/history', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      error: 'Invalid wholesale product.'
    });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        im.id,
        im.movement_type,
        im.quantity,
        im.stock_before,
        im.stock_after,
        im.reference_type,
        im.reference_id,
        im.notes,
        im.created_at,
        COALESCE(p.name, wp.product_name) AS product_name

      FROM inventory_movements im

      JOIN wholesale_products wp
        ON wp.id = im.wholesale_product_id

      LEFT JOIN products p
        ON p.id = wp.product_id

      WHERE im.wholesale_product_id = $1

      ORDER BY
        im.created_at DESC,
        im.id DESC
      `,
      [id]
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        quantity: Number(row.quantity),
        stock_before: Number(row.stock_before),
        stock_after: Number(row.stock_after),
        reference_id:
          row.reference_id != null
            ? String(row.reference_id)
            : null
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load inventory history.'
    });
  }
});


/* =========================================================
   WHOLESALE ORDERS
========================================================= */

router.get('/orders', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.*,

        s.name AS shopkeeper_name,
        s.phone AS shopkeeper_phone,

        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'wholesale_product_id', i.wholesale_product_id,
              'product_id', i.product_id,
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

      JOIN shopkeepers s
        ON s.id = o.shopkeeper_id

      LEFT JOIN wholesale_order_items i
        ON i.order_id = o.id

      GROUP BY
        o.id,
        s.name,
        s.phone

      ORDER BY o.created_at DESC
    `);

    return res.json(rows.map(serializeOrder));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load wholesale orders.'
    });
  }
});


router.put('/orders/:id', async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body || {};

  const allowedStatuses = [
    'pending',
    'approved',
    'processing',
    'ready',
    'completed',
    'cancelled'
  ];

  if (!Number.isSafeInteger(orderId) || orderId < 1) {
    return res.status(400).json({
      error: 'Invalid order.'
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
      SELECT *
      FROM wholesale_orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    if (!currentResult.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Order not found.'
      });
    }

    const current = currentResult.rows[0];
    const previous = current.status;

    if (previous === 'completed') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'Completed orders cannot be changed.'
      });
    }

    const allowedTransitions = {
      pending: ['approved', 'cancelled'],
      approved: ['processing', 'cancelled'],
      processing: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      cancelled: []
    };

    if (
      status !== previous &&
      !allowedTransitions[previous]?.includes(status)
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: `Cannot change an order from ${previous} to ${status}.`
      });
    }


    /* =====================================================
       APPROVE
       Deduct stock exactly once.
    ===================================================== */

    if (status === 'approved' && previous !== 'approved') {
      const itemsResult = await client.query(
        `
        SELECT
          wholesale_product_id,
          quantity
        FROM wholesale_order_items
        WHERE order_id = $1
        ORDER BY id
        `,
        [orderId]
      );

      for (const item of itemsResult.rows) {
        const productResult = await client.query(
          `
          SELECT
            id,
            stock_quantity,
            is_active
          FROM wholesale_products
          WHERE id = $1
          FOR UPDATE
          `,
          [item.wholesale_product_id]
        );

        if (!productResult.rowCount) {
          throw new Error(
            'One or more products in this order no longer exist.'
          );
        }

        const product = productResult.rows[0];

        if (!product.is_active) {
          throw new Error(
            'Cannot approve this order because one or more products are inactive.'
          );
        }

        const stockBefore = Number(product.stock_quantity);
        const quantity = Number(item.quantity);

        if (stockBefore < quantity) {
          throw new Error(
            'Cannot approve this order because one or more products no longer have enough stock.'
          );
        }

        const stockAfter = stockBefore - quantity;

        await client.query(
          `
          UPDATE wholesale_products
          SET
            stock_quantity = $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            stockAfter,
            item.wholesale_product_id
          ]
        );

        await client.query(
          `
          INSERT INTO inventory_movements
          (
            wholesale_product_id,
            movement_type,
            quantity,
            stock_before,
            stock_after,
            reference_type,
            reference_id,
            notes
          )
          VALUES
          ($1, 'sale', $2, $3, $4, $5, $6, $7)
          `,
          [
            item.wholesale_product_id,
            quantity,
            stockBefore,
            stockAfter,
            'wholesale_order',
            orderId,
            `Stock deducted for wholesale order #${orderId}.`
          ]
        );
      }
    }


    /* =====================================================
       CANCEL
       Return stock only if it was previously deducted.
    ===================================================== */

    if (
      status === 'cancelled' &&
      ['approved', 'processing', 'ready'].includes(previous)
    ) {
      const itemsResult = await client.query(
        `
        SELECT
          wholesale_product_id,
          quantity
        FROM wholesale_order_items
        WHERE order_id = $1
        ORDER BY id
        `,
        [orderId]
      );

      for (const item of itemsResult.rows) {
        const productResult = await client.query(
          `
          SELECT
            id,
            stock_quantity
          FROM wholesale_products
          WHERE id = $1
          FOR UPDATE
          `,
          [item.wholesale_product_id]
        );

        if (!productResult.rowCount) {
          throw new Error(
            'Cannot return stock because a product no longer exists.'
          );
        }

        const stockBefore = Number(
          productResult.rows[0].stock_quantity
        );

        const quantity = Number(item.quantity);
        const stockAfter = stockBefore + quantity;

        await client.query(
          `
          UPDATE wholesale_products
          SET
            stock_quantity = $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            stockAfter,
            item.wholesale_product_id
          ]
        );

        await client.query(
          `
          INSERT INTO inventory_movements
          (
            wholesale_product_id,
            movement_type,
            quantity,
            stock_before,
            stock_after,
            reference_type,
            reference_id,
            notes
          )
          VALUES
          ($1, 'return', $2, $3, $4, $5, $6, $7)
          `,
          [
            item.wholesale_product_id,
            quantity,
            stockBefore,
            stockAfter,
            'wholesale_order',
            orderId,
            `Stock returned from cancelled wholesale order #${orderId}.`
          ]
        );
      }
    }


    /* =====================================================
       COMPLETED
       Create purchase records exactly once.
    ===================================================== */

    if (status === 'completed' && previous !== 'completed') {
      const existingPurchase = await client.query(
        `
        SELECT id
        FROM purchases
        WHERE source_order_id = $1
        LIMIT 1
        `,
        [orderId]
      );

      /*
        The previous implementation used:

          ON CONFLICT (source_order_id)

        but source_order_id is not unique because one wholesale
        order can contain multiple products.

        Instead, we explicitly check whether this order has already
        generated purchases.
      */
      if (!existingPurchase.rowCount) {
        const itemsResult = await client.query(
          `
          SELECT
            product_name,
            quantity,
            line_total_kes
          FROM wholesale_order_items
          WHERE order_id = $1
          ORDER BY id
          `,
          [orderId]
        );

        for (const item of itemsResult.rows) {
          await client.query(
            `
            INSERT INTO purchases
            (
              shopkeeper_id,
              product_name,
              quantity,
              amount_kes,
              notes,
              source_order_id
            )
            VALUES
            ($1, $2, $3, $4, $5, $6)
            `,
            [
              current.shopkeeper_id,
              item.product_name,
              Number(item.quantity),
              Number(item.line_total_kes),
              `Wholesale order #${orderId}`,
              orderId
            ]
          );
        }
      }
    }


    /* =====================================================
       UPDATE ORDER
    ===================================================== */

    const { rows } = await client.query(
      `
      UPDATE wholesale_orders
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [
        status,
        orderId
      ]
    );

    await client.query('COMMIT');

    /*
      Notification is deliberately outside the transaction.
      Failure here must not undo the completed order.
    */
    try {
      await pool.query(
        `
        INSERT INTO wholesale_notifications
        (
          shopkeeper_id,
          title,
          message
        )
        VALUES ($1, $2, $3)
        `,
        [
          current.shopkeeper_id,
          'Order update',
          `Wholesale order #${orderId} is now ${status}.`
        ]
      );
    } catch (notificationError) {
      console.error(
        'Wholesale order notification failed:',
        notificationError
      );
    }

    return res.json({
      ...rows[0],
      id: String(rows[0].id),
      shopkeeper_id: String(rows[0].shopkeeper_id),
      total_kes: Number(rows[0].total_kes)
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error(error);

    return res.status(400).json({
      error: error.message || 'Failed to update order.'
    });
  } finally {
    client.release();
  }
});


/* =========================================================
   WHOLESALE PAYMENT REQUESTS
========================================================= */

router.get('/payment-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.*,

        s.name AS shopkeeper_name,
        s.phone AS shopkeeper_phone

      FROM payments p

      JOIN shopkeepers s
        ON s.id = p.shopkeeper_id

      WHERE p.status IN ('pending', 'processing')

      ORDER BY p.date DESC
    `);

    return res.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        shopkeeper_id: String(row.shopkeeper_id),
        amount_kes: Number(row.amount_kes)
      }))
    );
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Failed to load payment requests.'
    });
  }
});


router.put('/payments/:id', async (req, res) => {
  const paymentId = Number(req.params.id);
  const { status } = req.body || {};

  if (!Number.isSafeInteger(paymentId) || paymentId < 1) {
    return res.status(400).json({
      error: 'Invalid payment.'
    });
  }

  if (!['confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid payment status.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      UPDATE payments
      SET
        status = $1
      WHERE id = $2
      RETURNING *
      `,
      [
        status,
        paymentId
      ]
    );

    if (!result.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Payment not found.'
      });
    }

    const payment = result.rows[0];

    await client.query(
      `
      INSERT INTO wholesale_notifications
      (
        shopkeeper_id,
        title,
        message
      )
      VALUES ($1, $2, $3)
      `,
      [
        payment.shopkeeper_id,
        'Payment update',
        `Your payment of KES ${Number(
          payment.amount_kes
        ).toLocaleString()} was ${status}.`
      ]
    );

    await client.query('COMMIT');

    return res.json({
      ...payment,
      id: String(payment.id),
      shopkeeper_id: String(payment.shopkeeper_id),
      amount_kes: Number(payment.amount_kes)
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    console.error(error);

    return res.status(500).json({
      error: 'Failed to update payment.'
    });
  } finally {
    client.release();
  }
});


module.exports = router;