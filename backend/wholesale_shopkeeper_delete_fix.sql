-- KENJAV Wholesale shopkeeper deletion migration. Run this once on an
-- existing PostgreSQL database. Historical purchases and payments are
-- retained with shopkeeper_id = NULL after the corresponding shopkeeper
-- account is deleted.

BEGIN;

ALTER TABLE purchases ALTER COLUMN shopkeeper_id DROP NOT NULL;

ALTER TABLE payments ALTER COLUMN shopkeeper_id DROP NOT NULL;

COMMIT;
