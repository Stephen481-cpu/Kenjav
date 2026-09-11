const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no JSON body (e.g. 204 No Content)
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Public storefront
  getProducts: () => request('/api/products'),
  getOffer: () => request('/api/offers'),
  createOrder: (payload) => request('/api/orders', { method: 'POST', body: payload }),
  payOrder: (code) => request(`/api/orders/${encodeURIComponent(code)}/pay`, { method: 'POST' }),
  getOrder: (code) => request(`/api/orders/${encodeURIComponent(code)}`),

  // Admin
  adminLogin: (password) => request('/api/admin/login', { method: 'POST', body: { password } }),

  adminGetProducts: (token) => request('/api/admin/products', { token }),
  adminCreateProduct: (token, payload) => request('/api/admin/products', { method: 'POST', body: payload, token }),
  adminUpdateProduct: (token, id, payload) => request(`/api/admin/products/${id}`, { method: 'PUT', body: payload, token }),
  adminDeleteProduct: (token, id) => request(`/api/admin/products/${id}`, { method: 'DELETE', token }),

  adminGetOffers: (token) => request('/api/admin/offers', { token }),
  adminCreateOffer: (token, payload) => request('/api/admin/offers', { method: 'POST', body: payload, token }),
  adminUpdateOffer: (token, id, payload) => request(`/api/admin/offers/${id}`, { method: 'PUT', body: payload, token }),
  adminDeleteOffer: (token, id) => request(`/api/admin/offers/${id}`, { method: 'DELETE', token }),

  adminGetOrders: (token) => request('/api/admin/orders', { token }),
  adminUpdateOrderStatus: (token, id, status) => request(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: { status }, token }),

  adminGetCustomers: (token) => request('/api/admin/customers', { token }),

  // Wholesale management (inside the existing KENJAV Admin panel)
  adminGetShopkeepers: (token) => request('/api/wholesale/shopkeepers', { token }),
  adminRecordManualSale: (token, shopkeeperId, payload) => request(`/api/wholesale/shopkeepers/${shopkeeperId}/purchases`, { method: 'POST', body: payload, token }),
  adminCreateShopkeeper: (token, payload) => request('/api/wholesale/shopkeepers', { method: 'POST', body: payload, token }),
  adminUpdateShopkeeper: (token, id, payload) => request(`/api/wholesale/shopkeepers/${id}`, { method: 'PUT', body: payload, token }),
  adminGetWholesaleProducts: (token) => request('/api/wholesale/admin/products', { token }),
  adminCreateWholesaleProduct: (token, payload) => request('/api/wholesale/admin/products', { method: 'POST', body: payload, token }),
  adminUpdateWholesaleProduct: (token, id, payload) => request(`/api/wholesale/admin/products/${id}`, { method: 'PUT', body: payload, token }),
  adminGetWholesaleInventory: (token) => request('/api/wholesale/admin/inventory', { token }),
  adminGetWholesaleInventoryHistory: (token, id) => request(`/api/wholesale/admin/inventory/${id}/history`, { token }),
  adminGetWholesaleOrders: (token) => request('/api/wholesale/admin/orders', { token }),
  adminUpdateWholesaleOrder: (token, id, status) => request(`/api/wholesale/admin/orders/${id}`, { method: 'PUT', body: { status }, token }),
  adminGetWholesalePayments: (token) => request('/api/wholesale/admin/payment-requests', { token }),
  adminUpdateWholesalePayment: (token, id, status) => request(`/api/wholesale/admin/payments/${id}`, { method: 'PUT', body: { status }, token }),
    adminGetWholesaleReport: (token, date) =>
    request(
      `/api/wholesale/reports/daily${date ? `?date=${date}` : ''}`,
      { token }
    ),

  adminGetWholesaleMonthlyReport: (token, month) =>
    request(
      `/api/wholesale/reports/monthly${month ? `?month=${encodeURIComponent(month)}` : ''}`,
      { token }
    ),

  adminGetWholesaleExpenses: (token, date) =>
    request(
      `/api/wholesale/reports/expenses${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      { token }
    ),

  adminCreateWholesaleExpense: (token, payload) =>
    request(
      '/api/wholesale/reports/expenses',
      {
        method: 'POST',
        body: payload,
        token
      }
    ),

  adminDeleteWholesaleExpense: (token, id) =>
    request(
      `/api/wholesale/reports/expenses/${id}`,
      {
        method: 'DELETE',
        token
      }
    ),
};