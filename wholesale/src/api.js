const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000'
).replace(/\/+$/, '');

async function request(
  path,
  {
    method = 'GET',
    body,
    token,
    onUnauthorized,
  } = {}
) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        method,
        headers,
        body: body
          ? JSON.stringify(body)
          : undefined,
      }
    );
  } catch (error) {
    throw new Error(
      'Unable to reach KENJAV server. Check VITE_API_URL and the backend deployment.'
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      token &&
      (
        data?.code === 'JWT_EXPIRED' ||
        data?.code === 'JWT_INVALID' ||
        data?.error?.toLowerCase()?.includes('session')
      )
    ) {
      if (typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
    }

    throw new Error(
      data?.error ||
      `Request failed (${response.status})`
    );
  }

  return data;
}

export const api = {
  shopkeeperLogin: (phone, password) =>
    request(
      '/api/wholesale/auth/login',
      {
        method: 'POST',
        body: {
          phone,
          password,
        },
      }
    ),

  shopkeeperRegister: (body) =>
    request(
      '/api/wholesale/auth/register',
      {
        method: 'POST',
        body,
      }
    ),

  portalDashboard: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/dashboard',
      {
        token,
        onUnauthorized,
      }
    ),

  portalMe: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/me',
      {
        token,
        onUnauthorized,
      }
    ),

  portalProducts: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/products',
      {
        token,
        onUnauthorized,
      }
    ),

  portalOrders: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/orders',
      {
        token,
        onUnauthorized,
      }
    ),

  placeOrder: (token, body, onUnauthorized) =>
    request(
      '/api/wholesale/portal/orders',
      {
        method: 'POST',
        body,
        token,
        onUnauthorized,
      }
    ),

  portalPayments: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/payments',
      {
        token,
        onUnauthorized,
      }
    ),

  portalPurchases: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/purchases',
      {
        token,
        onUnauthorized,
      }
    ),

  portalNotifications: (token, onUnauthorized) =>
    request(
      '/api/wholesale/portal/notifications',
      {
        token,
        onUnauthorized,
      }
    ),

  readNotification: (token, id, onUnauthorized) =>
    request(
      `/api/wholesale/portal/notifications/${id}/read`,
      {
        method: 'PUT',
        token,
        onUnauthorized,
      }
    ),

  requestPayment: (token, body, onUnauthorized) =>
    request(
      '/api/wholesale/portal/payment-requests',
      {
        method: 'POST',
        body,
        token,
        onUnauthorized,
      }
    ),

  updateProfile: (token, body, onUnauthorized) =>
    request(
      '/api/wholesale/portal/profile',
      {
        method: 'PUT',
        body,
        token,
        onUnauthorized,
      }
    ),

  changePassword: (token, body, onUnauthorized) =>
    request(
      '/api/wholesale/auth/change-password',
      {
        method: 'POST',
        body,
        token,
        onUnauthorized,
      }
    ),
};