function productJSON(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    price_kes: Number(row.price_kes),
    tag: row.tag,
    category: row.category,
    image_url: row.image_url,
    is_featured: !!row.is_featured,
    is_active: !!row.is_active,
    sort_order: Number(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function offerJSON(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    badge: row.badge,
    title: row.title,
    description: row.description || '',
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function orderJSON(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    order_code: row.order_code,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email,
    fulfillment_type: row.fulfillment_type,
    delivery_address: row.delivery_address,
    notes: row.notes,
    marketing_opt_in: !!row.marketing_opt_in,
    subtotal_kes: Number(row.subtotal_kes),
    delivery_fee_kes: Number(row.delivery_fee_kes),
    total_kes: Number(row.total_kes),
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    mpesa_checkout_request_id: row.mpesa_checkout_request_id,
    mpesa_merchant_request_id: row.mpesa_merchant_request_id,
    mpesa_receipt_number: row.mpesa_receipt_number,
    mpesa_phone: row.mpesa_phone,
    items: Array.isArray(row.items) ? row.items.map((item) => ({
      id: item.id ? String(item.id) : undefined,
      product_id: item.product_id ? String(item.product_id) : null,
      product_name: item.product_name,
      unit_price_kes: Number(item.unit_price_kes),
      quantity: Number(item.quantity),
      line_total_kes: Number(item.line_total_kes),
    })) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = { productJSON, offerJSON, orderJSON };
