-- KENJAV STOCK TRACKING
-- Run this once against the existing PostgreSQL database.

ALTER TABLE wholesale_products
ADD COLUMN IF NOT EXISTS minimum_stock INTEGER NOT NULL DEFAULT 10
CHECK (minimum_stock >= 0);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,

  wholesale_product_id BIGINT NOT NULL
    REFERENCES wholesale_products(id)
    ON DELETE CASCADE,

  movement_type VARCHAR(20) NOT NULL
    CHECK (
      movement_type IN (
        'opening',
        'restock',
        'sale',
        'adjustment',
        'return'
      )
    ),

  quantity INTEGER NOT NULL,

  stock_before INTEGER NOT NULL
    CHECK (stock_before >= 0),

  stock_after INTEGER NOT NULL
    CHECK (stock_after >= 0),

  reference_type VARCHAR(50),

  reference_id BIGINT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
ON inventory_movements(wholesale_product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created
ON inventory_movements(created_at DESC);
DROP INDEX IF EXISTS idx_purchases_source_order_unique;
CREATE INDEX IF NOT EXISTS idx_purchases_source_order ON purchases(source_order_id) WHERE source_order_id IS NOT NULL;
