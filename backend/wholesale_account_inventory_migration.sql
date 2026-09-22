-- KENJAV upgrade for an existing PostgreSQL database.
-- Run this once if the database was created with an older KENJAV schema.

ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS wholesale_price_kes NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS minimum_stock INTEGER DEFAULT 10;
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE wholesale_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE wholesale_orders DROP CONSTRAINT IF EXISTS wholesale_orders_shopkeeper_id_fkey;
ALTER TABLE wholesale_orders ALTER COLUMN shopkeeper_id DROP NOT NULL;
ALTER TABLE wholesale_orders ADD CONSTRAINT wholesale_orders_shopkeeper_id_fkey
  FOREIGN KEY (shopkeeper_id) REFERENCES shopkeepers(id) ON DELETE SET NULL;

ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS shopkeeper_id BIGINT;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS wholesale_product_id BIGINT;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS unit_price_kes NUMERIC(12,2);
ALTER TABLE manual_sales ALTER COLUMN unit_price_kes DROP NOT NULL;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS amount_kes NUMERIC(12,2);
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS customer_type VARCHAR(30) DEFAULT 'walk_in';
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS sale_period VARCHAR(50);
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS sale_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE manual_sales ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS shopkeeper_id BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_kes NUMERIC(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'cash';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS manual_sale_id BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_merchant_request_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_phone VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_payments_manual_sale ON payments(manual_sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_checkout ON payments(mpesa_checkout_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mpesa_receipt_unique ON orders(mpesa_receipt_number) WHERE mpesa_receipt_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_mpesa_receipt_unique ON payments(mpesa_receipt_number) WHERE mpesa_receipt_number IS NOT NULL;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_manual_sale_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_manual_sale_id_fkey FOREIGN KEY (manual_sale_id) REFERENCES manual_sales(id) ON DELETE CASCADE;

ALTER TABLE manual_sales DROP CONSTRAINT IF EXISTS manual_sales_shopkeeper_id_fkey;
ALTER TABLE manual_sales ADD CONSTRAINT manual_sales_shopkeeper_id_fkey FOREIGN KEY (shopkeeper_id) REFERENCES shopkeepers(id) ON DELETE SET NULL;
ALTER TABLE manual_sales DROP CONSTRAINT IF EXISTS manual_sales_wholesale_product_id_fkey;
ALTER TABLE manual_sales ADD CONSTRAINT manual_sales_wholesale_product_id_fkey FOREIGN KEY (wholesale_product_id) REFERENCES wholesale_products(id) ON DELETE SET NULL;
