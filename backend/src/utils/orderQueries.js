const ORDER_SELECT = `
  SELECT
    o.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'unit_price_kes', oi.unit_price_kes,
          'quantity', oi.quantity,
          'line_total_kes', oi.line_total_kes
        ) ORDER BY oi.id
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::json
    ) AS items
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
`;

module.exports = { ORDER_SELECT };
