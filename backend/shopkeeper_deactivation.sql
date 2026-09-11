ALTER TABLE shopkeepers
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

ALTER TABLE shopkeepers
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;