const express = require('express');
const { pool } = require('../../db');
const { adminAuth } = require('../../middleware/adminAuth');

const router = express.Router();

router.use(adminAuth);

/* =========================================================
   WHOLESALE PRODUCTS
========================================================= */

/*
  Get wholesale products for the existing admin panel.
  Includes stock quantity, minimum stock and stock status.
*/
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
      ORDER BY name
    `);

    res.json(
      rows.map(r => ({
        ...r,
        id: String(r.id),
        wholesale_price_kes: Number(r.wholesale_price_kes),
        min_order_quantity: Number(r.min_order_quantity),
        stock_quantity: Number(r.stock_quantity),
        minimum_stock: Number(r.minimum_stock || 10)
      }))
    );

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: 'Failed to load wholesale products.'
    });
  }
});


/*
  Create a wholesale product.
*/
router.post('/products', async (req, res) => {
  const {
    product_id,
    product_name,
    wholesale_price_kes,
    min_order_quantity = 1,
    stock_quantity = 0,
    minimum_stock = 10
  } = req.body || {};

  if (!product_id && !product_name) {
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

    let resolvedName = product_name || null;

    if (product_id) {
      const p = await client.query(
        'SELECT name FROM products WHERE id=$1',
        [product_id]
      );

      if (!p.rowCount) {
        await client.query('ROLLBACK');

        return res.status(400).json({
          error: 'Selected KENJAV product was not found.'
        });
      }

      resolvedName = p.rows[0].name;
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
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        product_id || null,
        resolvedName,
        price,
        minOrder,
        stock,
        minimumStock
      ]
    );

    /*
      Record the opening stock.
      This makes the first stock quantity traceable.
    */
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
          notes
        )
        VALUES($1,'opening',$2,$3,$4,$5,$6)
        `,
        [
          rows[0].id,
          stock,
          0,
          stock,
          'admin',
          'Opening stock when wholesale product was created.'
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...rows[0],
      id: String(rows[0].id),
      wholesale_price_kes: Number(rows[0].wholesale_price_kes),
      min_order_quantity: Number(rows[0].min_order_quantity),
      stock_quantity: Number(rows[0].stock_quantity),
      minimum_stock: Number(rows[0].minimum_stock)
    });

  } catch (e) {
    await client.query('ROLLBACK');

    console.error(e);

    if (e.code === '23505') {
      return res.status(409).json({
        error: 'This product is already in the wholesale catalogue.'
      });
    }

    res.status(500).json({
      error: 'Failed to create wholesale product.'
    });

  } finally {
    client.release();
  }
});


/*
  Update a wholesale product.

  If stock changes, an inventory movement is automatically recorded.
*/
router.put('/products/:id', async (req, res) => {
  const {
    wholesale_price_kes,
    min_order_quantity,
    stock_quantity,
    minimum_stock,
    is_active,
    stock_reason
  } = req.body || {};

  const price = Number(wholesale_price_kes);
  const minOrder = Number(min_order_quantity);
  const newStock = Number(stock_quantity);
  const newMinimumStock = Number(minimum_stock);
  const stockReason = String(stock_reason || '').trim();

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

    /*
      Lock the product so two simultaneous stock changes
      cannot overwrite each other.
    */
    const current = await client.query(
      `
      SELECT *
      FROM wholesale_products
      WHERE id=$1
      FOR UPDATE
      `,
      [req.params.id]
    );

    if (!current.rowCount) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Product not found.'
      });
    }

    const oldStock = Number(current.rows[0].stock_quantity);

    /*
      A reason is mandatory for every manual stock change.
    */
    if (newStock !== oldStock && !stockReason) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'A reason is required when changing stock.'
      });
    }

    const { rows } = await client.query(
      `
      UPDATE wholesale_products
      SET
        wholesale_price_kes=$1,
        min_order_quantity=$2,
        stock_quantity=$3,
        minimum_stock=$4,
        is_active=$5,
        updated_at=NOW()
      WHERE id=$6
      RETURNING *
      `,
      [
        price,
        minOrder,
        newStock,
        newMinimumStock,
        is_active !== false,
        Number(req.params.id)
      ]
    );

    /*
      Record manual stock changes.
    */
    if (newStock !== oldStock) {
      const difference = newStock - oldStock;

      const movementType =
        difference > 0
          ? 'restock'
          : 'adjustment';

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
          notes
        )
        VALUES($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          Number(req.params.id),
          movementType,
          Math.abs(difference),
          oldStock,
          newStock,
          'admin',
          stockReason
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      ...rows[0],
      id: String(rows[0].id),
      wholesale_price_kes: Number(rows[0].wholesale_price_kes),
      min_order_quantity: Number(rows[0].min_order_quantity),
      stock_quantity: Number(rows[0].stock_quantity),
      minimum_stock: Number(rows[0].minimum_stock)
    });

  } catch (e) {
    await client.query('ROLLBACK');

    console.error(e);

    res.status(500).json({
      error: 'Failed to update wholesale product.'
    });

  } finally {
    client.release();
  }
});


/* =========================================================
   INVENTORY
========================================================= */

/*
  Get complete inventory information.
*/
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

    res.json(
      rows.map(r => ({
        ...r,
        id: String(r.id),
        product_id: r.product_id
          ? String(r.product_id)
          : null,
        wholesale_price_kes: Number(r.wholesale_price_kes),
        min_order_quantity: Number(r.min_order_quantity),
        stock_quantity: Number(r.stock_quantity),
        minimum_stock: Number(r.minimum_stock || 10)
      }))
    );

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: 'Failed to load inventory.'
    });
  }
});


/*
  Get inventory movement history for a product.
*/
router.get('/inventory/:id/history', async (req, res) => {
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

      WHERE im.wholesale_product_id=$1

      ORDER BY im.created_at DESC, im.id DESC
      `,
      [req.params.id]
    );

    res.json(
      rows.map(r => ({
        ...r,
        id: String(r.id),
        quantity: Number(r.quantity),
        stock_before: Number(r.stock_before),
        stock_after: Number(r.stock_after),
        reference_id: r.reference_id
          ? String(r.reference_id)
          : null
      }))
    );

  } catch (e) {
    console.error(e);

    res.status(500).json({
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
        ON s.id=o.shopkeeper_id

      LEFT JOIN wholesale_order_items i
        ON i.order_id=o.id

      GROUP BY
        o.id,
        s.name,
        s.phone

      ORDER BY o.created_at DESC
    `);

    res.json(
      rows.map(r => ({
        ...r,
        id: String(r.id),
        total_kes: Number(r.total_kes)
      }))
    );

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: 'Failed to load wholesale orders.'
    });
  }
});


/*
  Update wholesale order status.

  APPROVED:
    Deduct stock.

  CANCELLED:
    Return stock if the order had already been approved.

  COMPLETED:
    Create purchase records.
*/
router.put('/orders/:id', async (req, res) => {
  const { status } = req.body || {};

  const allowed = [
    'pending',
    'approved',
    'processing',
    'ready',
    'completed',
    'cancelled'
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: current } = await client.query(
      `
      SELECT *
      FROM wholesale_orders
      WHERE id=$1
      FOR UPDATE
      `,
      [req.params.id]
    );

    if (!current.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Order not found.'
      });
    }

    const previous = current[0].status;

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
      ready: ['completed', 'cancelled']
    };

    if (!allowedTransitions[previous]?.includes(status) && status !== previous) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot change an order from ${previous} to ${status}.`
      });
    }


    /* ==========================================
       APPROVE ORDER
       CHECK AND DEDUCT STOCK
    ========================================== */

    if (status === 'approved' && previous !== 'approved') {

      const items = await client.query(
        `
        SELECT
          wholesale_product_id,
          quantity
        FROM wholesale_order_items
        WHERE order_id=$1
        `,
        [req.params.id]
      );

      for (const item of items.rows) {

        /*
          Lock the product before checking stock.
        */
        const productResult = await client.query(
          `
          SELECT
            id,
            stock_quantity,
            is_active
          FROM wholesale_products
          WHERE id=$1
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
            stock_quantity=$1,
            updated_at=NOW()
          WHERE id=$2
          `,
          [
            stockAfter,
            item.wholesale_product_id
          ]
        );

        /*
          Record the sale/order stock movement.
        */
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
          VALUES($1,'sale',$2,$3,$4,$5,$6,$7)
          `,
          [
            item.wholesale_product_id,
            quantity,
            stockBefore,
            stockAfter,
            'wholesale_order',
            Number(req.params.id),
            `Stock deducted for wholesale order #${req.params.id}.`
          ]
        );
      }
    }


    /* ==========================================
       CANCEL APPROVED ORDER
       RETURN STOCK
    ========================================== */

    if (status === 'cancelled' && ['approved', 'processing', 'ready'].includes(previous)) {

      const items = await client.query(
        `
        SELECT
          wholesale_product_id,
          quantity
        FROM wholesale_order_items
        WHERE order_id=$1
        `,
        [req.params.id]
      );

      for (const item of items.rows) {

        const productResult = await client.query(
          `
          SELECT
            id,
            stock_quantity
          FROM wholesale_products
          WHERE id=$1
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
            stock_quantity=$1,
            updated_at=NOW()
          WHERE id=$2
          `,
          [
            stockAfter,
            item.wholesale_product_id
          ]
        );

        /*
          Record returned stock.
        */
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
          VALUES($1,'return',$2,$3,$4,$5,$6,$7)
          `,
          [
            item.wholesale_product_id,
            quantity,
            stockBefore,
            stockAfter,
            'wholesale_order',
            Number(req.params.id),
            `Stock returned from cancelled wholesale order #${req.params.id}.`
          ]
        );
      }
    }


    /* ==========================================
       UPDATE ORDER STATUS
    ========================================== */

    const { rows } = await client.query(
      `
      UPDATE wholesale_orders
      SET
        status=$1,
        updated_at=NOW()
      WHERE id=$2
      RETURNING *
      `,
      [
        status,
        req.params.id
      ]
    );


    /* ==========================================
       COMPLETED ORDER
       CREATE PURCHASE RECORD
    ========================================== */

    if (status === 'completed' && previous !== 'completed') {

      const items = await client.query(
        `
        SELECT
          product_name,
          quantity,
          line_total_kes
        FROM wholesale_order_items
        WHERE order_id=$1
        `,
        [req.params.id]
      );

      for (const item of items.rows) {

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
          VALUES($1,$2,$3,$4,$5,$6)
          ON CONFLICT (source_order_id)
          DO NOTHING
          `,
          [
            current[0].shopkeeper_id,
            item.product_name,
            item.quantity,
            item.line_total_kes,
            `Wholesale order #${req.params.id}`,
            req.params.id
          ]
        );
      }
    }


    await client.query('COMMIT');


    /* ==========================================
       NOTIFY SHOPKEEPER
    ========================================== */

    await pool.query(
      `
      INSERT INTO wholesale_notifications
      (
        shopkeeper_id,
        title,
        message
      )
      VALUES($1,$2,$3)
      `,
      [
        current[0].shopkeeper_id,
        'Order update',
        `Wholesale order #${req.params.id} is now ${status}.`
      ]
    );


    res.json(rows[0]);

  } catch (e) {

    await client.query('ROLLBACK');

    console.error(e);

    res.status(500).json({
      error: e.message || 'Failed to update order.'
    });

  } finally {
    client.release();
  }
});


/* =========================================================
   PAYMENT REQUESTS
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
        ON s.id=p.shopkeeper_id

      WHERE p.status='pending'

      ORDER BY p.date DESC
    `);

    res.json(rows);

  } catch (e) {

    console.error(e);

    res.status(500).json({
      error: 'Failed to load payment requests.'
    });
  }
});


router.put('/payments/:id', async (req, res) => {

  const { status } = req.body || {};

  if (!['confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid payment status.'
    });
  }

  try {

    const { rows } = await pool.query(
      `
      UPDATE payments
      SET status=$1
      WHERE id=$2
      RETURNING *
      `,
      [
        status,
        req.params.id
      ]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Payment not found.'
      });
    }

    await pool.query(
      `
      INSERT INTO wholesale_notifications
      (
        shopkeeper_id,
        title,
        message
      )
      VALUES($1,'Payment update',$2)
      `,
      [
        rows[0].shopkeeper_id,
        `Your payment of KES ${Number(
          rows[0].amount_kes
        ).toLocaleString()} was ${status}.`
      ]
    );

    res.json(rows[0]);

  } catch (e) {

    console.error(e);

    res.status(500).json({
      error: 'Failed to update payment.'
    });
  }
});


module.exports = router;