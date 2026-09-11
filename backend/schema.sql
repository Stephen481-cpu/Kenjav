-- KENJAV PostgreSQL schema
-- Run this once against your PostgreSQL database before `npm run seed`.

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_kes INTEGER NOT NULL CHECK (price_kes >= 0),
  tag VARCHAR(255),
  category VARCHAR(255),
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY,
  badge VARCHAR(255) NOT NULL DEFAULT 'HOT DEAL',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  order_code VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  fulfillment_type VARCHAR(20) NOT NULL CHECK (fulfillment_type IN ('pickup','delivery')),
  delivery_address TEXT,
  notes TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  subtotal_kes INTEGER NOT NULL CHECK (subtotal_kes >= 0),
  delivery_fee_kes INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_kes >= 0),
  total_kes INTEGER NOT NULL CHECK (total_kes >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','mpesa')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','processing','paid','failed')),
  mpesa_checkout_request_id VARCHAR(255),
  mpesa_merchant_request_id VARCHAR(255),
  mpesa_receipt_number VARCHAR(255),
  mpesa_phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  unit_price_kes INTEGER NOT NULL CHECK (unit_price_kes >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  line_total_kes INTEGER NOT NULL CHECK (line_total_kes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products (is_active, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_offers_active_created ON offers (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout ON orders (mpesa_checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- Wholesale / shopkeeper portal tables
-- These CREATE TABLE statements make a fresh Aiven database work too.
CREATE TABLE IF NOT EXISTS shopkeepers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  credit_limit_kes NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit_limit_kes >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shopkeepers_phone_unique ON shopkeepers(phone);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  shopkeeper_id BIGINT NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_kes NUMERIC(12,2) NOT NULL CHECK (amount_kes >= 0),
  notes TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  shopkeeper_id BIGINT NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  amount_kes NUMERIC(12,2) NOT NULL CHECK (amount_kes > 0),
  notes TEXT,
  method VARCHAR(20) NOT NULL DEFAULT 'cash',
  reference VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS credit_limit_kes NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(20) NOT NULL DEFAULT 'cash';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'confirmed';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS wholesale_products (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  wholesale_price_kes NUMERIC(12,2) NOT NULL CHECK (wholesale_price_kes >= 0),
  min_order_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_order_quantity > 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 10 CHECK (minimum_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (product_id IS NOT NULL OR product_name IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS wholesale_orders (
  id BIGSERIAL PRIMARY KEY,
  shopkeeper_id BIGINT NOT NULL REFERENCES shopkeepers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','ready','completed','cancelled')),
  total_kes NUMERIC(12,2) NOT NULL CHECK (total_kes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS wholesale_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES wholesale_orders(id) ON DELETE CASCADE,
  wholesale_product_id BIGINT NOT NULL REFERENCES wholesale_products(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kes NUMERIC(12,2) NOT NULL CHECK (unit_price_kes >= 0),
  line_total_kes NUMERIC(12,2) NOT NULL CHECK (line_total_kes >= 0)
);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_shopkeeper ON wholesale_orders(shopkeeper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wholesale_order_items_order ON wholesale_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_products_active ON wholesale_products(is_active, id);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS source_order_id BIGINT REFERENCES wholesale_orders(id) ON DELETE SET NULL;
DROP INDEX IF EXISTS idx_purchases_source_order_unique;
CREATE INDEX IF NOT EXISTS idx_purchases_source_order ON purchases(source_order_id) WHERE source_order_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS wholesale_notifications (
  id BIGSERIAL PRIMARY KEY,
  shopkeeper_id BIGINT NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wholesale_notifications_shopkeeper ON wholesale_notifications(shopkeeper_id, is_read, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wholesale_products_product_unique ON wholesale_products(product_id) WHERE product_id IS NOT NULL;
-- Wholesale daily expenses and financial reporting

CREATE TABLE IF NOT EXISTS wholesale_expenses (
  id BIGSERIAL PRIMARY KEY,

  amount_kes NUMERIC(12,2) NOT NULL
    CHECK (amount_kes > 0),

  category VARCHAR(100) NOT NULL,

  description TEXT NOT NULL DEFAULT '',

  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_expenses_date
ON wholesale_expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_wholesale_expenses_category
ON wholesale_expenses(category);

-- Wholesale inventory movement audit trail
CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  wholesale_product_id BIGINT NOT NULL REFERENCES wholesale_products(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('opening','restock','sale','adjustment','return')),
  quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
  reference_type VARCHAR(50),
  reference_id BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(wholesale_product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at DESC);
