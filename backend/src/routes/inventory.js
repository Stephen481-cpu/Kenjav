const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/*
  GET /api/inventory

  Returns all wholesale products with their
  current stock and stock status.
*/
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wp.id,
        wp.product_id,
        COALESCE(p.name, wp.product_name) AS name,
        COALESCE(p.image_url, '') AS image_url,
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
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        product_id: row.product_id
          ? String(row.product_id)
          : null,
        wholesale_price_kes: Number(row.wholesale_price_kes),
        min_order_quantity: Number(row.min_order_quantity),
        stock_quantity: Number(row.stock_quantity),
        minimum_stock: Number(row.minimum_stock)
      }))
    );

  } catch (error) {
    console.error('Inventory error:', error);

    res.status(500).json({
      error: 'Failed to load inventory.'
    });
  }
});


/*
  GET /api/inventory/:id/history

  Returns stock movement history for a product.
*/
router.get('/:id/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        movement_type,
        quantity,
        stock_before,
        stock_after,
        reference_type,
        reference_id,
        notes,
        created_at
      FROM inventory_movements
      WHERE wholesale_product_id = $1
      ORDER BY created_at DESC
      `,
      [req.params.id]
    );

    res.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
        quantity: Number(row.quantity),
        stock_before: Number(row.stock_before),
        stock_after: Number(row.stock_after),
        reference_id: row.reference_id
          ? String(row.reference_id)
          : null
      }))
    );

  } catch (error) {
    console.error('Inventory history error:', error);

    res.status(500).json({
      error: 'Failed to load inventory history.'
    });
  }
});


module.exports = router;