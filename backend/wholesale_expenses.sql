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