const express = require('express');
const { pool } = require('../db');
const { offerJSON } = require('../utils/serializers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');
    res.json(rows.map(offerJSON));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load offers.' });
  }
});

router.post('/', async (req, res) => {
  const { badge, title, description, is_active } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const active = is_active === undefined ? true : !!is_active;
    if (active) await client.query('UPDATE offers SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE is_active=TRUE');
    const { rows } = await client.query(
      `INSERT INTO offers (badge,title,description,is_active) VALUES ($1,$2,$3,$4) RETURNING *`,
      [badge || 'HOT DEAL', String(title).trim(), description || '', active]
    );
    await client.query('COMMIT');
    res.status(201).json(offerJSON(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create offer.' });
  } finally { client.release(); }
});

router.put('/:id', async (req, res) => {
  const { badge, title, description, is_active } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const active = !!is_active;
    if (active) {
      await client.query('UPDATE offers SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE is_active=TRUE AND id<>$1', [req.params.id]);
    }
    const { rows } = await client.query(
      `UPDATE offers SET badge=$1,title=$2,description=$3,is_active=$4,updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,
      [badge || 'HOT DEAL', String(title).trim(), description || '', active, req.params.id]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Offer not found.' });
    }
    await client.query('COMMIT');
    res.json(offerJSON(rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    if (err.code === '22P02') return res.status(404).json({ error: 'Offer not found.' });
    res.status(500).json({ error: 'Failed to update offer.' });
  } finally { client.release(); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM offers WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Offer not found.' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    if (err.code === '22P02') return res.status(404).json({ error: 'Offer not found.' });
    res.status(500).json({ error: 'Failed to delete offer.' });
  }
});

module.exports = router;
