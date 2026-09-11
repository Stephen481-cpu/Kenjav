require('dotenv').config();
const { randomUUID } = require('crypto');
const { pool, connectDB } = require('./db');

const PRODUCTS = [
  { slug: 'mandazi', name: 'Mandazi', description: 'Our everyday mandazi — soft, lightly sweetened, and fried fresh each morning.', price_kes: 5, category: 'Mandazi', is_featured: true, sort_order: 1 },
  { slug: 'mandazi-packet-12', name: 'Mandazi (Packet of 12)', description: 'A packet of 12 of our everyday mandazi — perfect for sharing with family or the office.', price_kes: 50, category: 'Mandazi', sort_order: 2 },
  { slug: 'pembetatu', name: 'Pembetatu', description: 'A neat triangle of golden mandazi dough — light, not too sweet, easy to grab and go.', price_kes: 5, category: 'Mandazi', sort_order: 3 },
  { slug: 'pembetatu-packet-12', name: 'Pembetatu (Packet of 12)', description: 'A packet of 12 Pembetatu — our triangle mandazi, ready to share.', price_kes: 50, category: 'Mandazi', sort_order: 4 },
  { slug: 'triangle-kubwa', name: 'Triangle Kubwa', description: 'Our big triangle mandazi — same recipe, extra size for a heartier bite.', price_kes: 10, category: 'Mandazi', sort_order: 5 },
  { slug: 'triangle-kubwa-packet-6', name: 'Triangle Kubwa (Packet of 6)', description: 'A packet of 6 Triangle Kubwa — big mandazi triangles, great for the whole family.', price_kes: 50, category: 'Mandazi', sort_order: 6 },
  { slug: 'mandazi-kubwa', name: 'Mandazi Kubwa', description: "A larger classic mandazi for when a regular one just isn't enough.", price_kes: 10, category: 'Mandazi', sort_order: 7 },
  { slug: 'mandazi-kubwa-packet-6', name: 'Mandazi Kubwa (Packet of 6)', description: 'A packet of 6 Mandazi Kubwa — our bigger mandazi, boxed fresh.', price_kes: 50, category: 'Mandazi', sort_order: 8 },
  { slug: 'ngumu-round', name: 'Ngumu Round', description: 'A firmer, crunchier mandazi-style bite, round and perfectly snackable.', price_kes: 10, category: 'Ngumu', sort_order: 9 },
  { slug: 'ngumu-round-packet-12', name: 'Ngumu Round (Packet of 12)', description: 'A packet of 10 Ngumu Round — our crunchier bites, ready to share.', price_kes: 100, category: 'Ngumu', sort_order: 10 },
  { slug: 'ngumu-square', name: 'Ngumu Square', description: 'The square cut of our firm, crunchy Ngumu — sturdy, snackable, satisfying.', price_kes: 10, category: 'Ngumu', sort_order: 11 },
  { slug: 'ngumu-square-packet-12', name: 'Ngumu Square (Packet of 12)', description: 'A packet of 10 Ngumu Square — great for the office or a road trip.', price_kes: 100, category: 'Ngumu', sort_order: 12 },
  { slug: 'kaimati', name: 'Kaimati', description: 'Small fried dough balls with a delicate crisp shell and a soft, fluffy centre — a Swahili coast classic.', price_kes: 10, category: 'Fried Treats', is_featured: true, sort_order: 13 },
  { slug: 'kaimati-packet-12', name: 'Kaimati (Packet of 12)', description: 'A packet of 10 Kaimati — bite-sized and impossible to stop at one.', price_kes: 100, category: 'Fried Treats', sort_order: 14 },
  { slug: 'donuts', name: 'Donuts', description: 'Classic soft donuts, fried fresh and lightly sweetened.', price_kes: 10, category: 'Fried Treats', sort_order: 15 },
  { slug: 'donuts-packet-6', name: 'Donuts (Packet of 6)', description: 'A packet of 5 of our classic soft donuts.', price_kes: 50, category: 'Fried Treats', sort_order: 16 },
  { slug: 'nduma', name: 'Nduma', description: 'Golden and hearty — a home-style snack.', price_kes: 10, category: 'Ngumu', sort_order: 17 },
  { slug: 'nduma-packet-12', name: 'Nduma (Packet of 12)', description: 'A packet of 12 Nduma — great as a savoury side or snack for the whole family.', price_kes: 100, category: 'Ngumu', sort_order: 18 },
  { slug: 'chapati', name: 'Chapati', description: 'Soft, flaky flatbread made fresh daily — a household favourite, ready whenever you are.', price_kes: 25, category: 'Savory', is_featured: true, sort_order: 19 },
  { slug: 'cookies', name: 'Cookies', description: "Crisp, buttery cookies baked fresh — a simple treat that's always a good idea.", price_kes: 5, category: 'Sweets & Bakes', sort_order: 20 },
  { slug: 'cookies-packet-12', name: 'Cookies (Packet of 12)', description: 'A packet of 12 cookies — crisp, buttery, and easy to share.', price_kes: 60, category: 'Sweets & Bakes', sort_order: 21 },
  { slug: 'cake', name: 'Cake', description: 'Soft, moist cake, baked in-house — a little something sweet to go with your day.', price_kes: 10, category: 'Sweets & Bakes', sort_order: 22 },
  { slug: 'cake-packet-6', name: 'Cake (Packet of 6)', description: 'A packet of 6 cake slices — perfect for a small gathering.', price_kes: 60, category: 'Sweets & Bakes', sort_order: 23 },
];

async function seed() {
  await connectDB();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const p of PRODUCTS) {
      await client.query(
        `INSERT INTO products
         (id,slug,name,description,price_kes,tag,category,image_url,is_featured,is_active,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (slug) DO NOTHING`,
        [randomUUID(), p.slug, p.name, p.description || '', p.price_kes, p.tag || null, p.category || null,
         p.image_url || null, !!p.is_featured, p.is_active === undefined ? true : !!p.is_active, p.sort_order || 0]
      );
    }

    const { rows: existingOffer } = await client.query('SELECT id FROM offers LIMIT 1');
    if (!existingOffer[0]) {
      await client.query(
        `INSERT INTO offers (id,badge,title,description,is_active) VALUES ($1,$2,$3,$4,$5)`,
        [randomUUID(), 'HOT DEAL', 'Buy 5 Get 1 Free', 'Order any 5 mandazi and we will add a 6th, on us.', true]
      );
    }

    await client.query('COMMIT');
    console.log(`Seed complete: ${PRODUCTS.length} products and an offer were checked/added.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
