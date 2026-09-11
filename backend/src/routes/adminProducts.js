const express = require('express');
const { pool } = require('../db');
const { productJSON } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY sort_order ASC, id ASC');
    res.json(rows.map(productJSON));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

router.post('/', async (req, res) => {
  const { slug, name, description, price_kes, tag, category, image_url, is_featured, is_active, sort_order } = req.body || {};
  if (!slug || !name || price_kes === undefined || price_kes === '') {
    return res.status(400).json({ error: 'slug, name, and price_kes are required.' });
  }
  const price = Number(price_kes);
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'price_kes must be a valid non-negative number.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO products
       (slug, name, description, price_kes, tag, category, image_url, is_featured, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [slug.trim(), name.trim(), description || '', price, tag || null, category || null, image_url || null,
       !!is_featured, is_active === undefined ? true : !!is_active, Number(sort_order) || 0]
    );
    res.status(201).json(productJSON(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'A product with that slug already exists.' });
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description, price_kes, tag, category, image_url, is_featured, is_active, sort_order } = req.body || {};
  if (!name || price_kes === undefined || price_kes === '') {
    return res.status(400).json({ error: 'name and price_kes are required.' });
  }
  const price = Number(price_kes);
  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: 'price_kes must be a valid non-negative number.' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE products SET
        name=$1, description=$2, price_kes=$3, tag=$4, category=$5, image_url=$6,
        is_featured=$7, is_active=$8, sort_order=$9, updated_at=CURRENT_TIMESTAMP
       WHERE id=$10 RETURNING *`,
      [name.trim(), description || '', price, tag || null, category || null, image_url || null,
       !!is_featured, is_active === undefined ? true : !!is_active, Number(sort_order) || 0, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json(productJSON(rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '22P02') return res.status(404).json({ error: 'Product not found.' });
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found.' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    if (err.code === '22P02') return res.status(404).json({ error: 'Product not found.' });
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
