import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { COLORS, money } from '../constants';

const STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

function isAuthError(message) {
  return /401|invalid|expired|authorization/i.test(message || '');
}

export default function OrdersPanel({ token, onAuthError }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.adminGetOrders(token);
      setOrders(data);
      setError('');
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, onAuthError]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (id, status) => {
    try {
      await api.adminUpdateOrderStatus(token, id, status);
      load();
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    }
  };

  if (loading) return <p style={{ color: COLORS.muted }}>Loading orders…</p>;

  return (
    <div className="space-y-3">
      {error && <p style={{ color: COLORS.flamingo }}>{error}</p>}
      {orders.length === 0 && <p style={{ color: COLORS.muted }}>No orders yet.</p>}
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-bold" style={{ color: COLORS.ink }}>
                {o.order_code} · {o.customer_name}
              </p>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {o.customer_phone} · {o.fulfillment_type === 'pickup' ? 'Pick Up' : `Delivery: ${o.delivery_address}`}
              </p>
              <p className="text-sm mt-1 font-mono" style={{ color: COLORS.ink }}>
                {money(o.total_kes)}
              </p>
              <span
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
                style={
                  o.payment_method === 'cash'
                    ? { background: COLORS.creamDark, color: COLORS.ink }
                    : o.payment_status === 'paid'
                    ? { background: COLORS.jade, color: '#fff' }
                    : o.payment_status === 'failed'
                    ? { background: COLORS.flamingo, color: '#fff' }
                    : { background: COLORS.marigold, color: COLORS.espresso }
                }
              >
                {o.payment_method === 'cash' ? 'Cash' : `M-Pesa: ${o.payment_status}`}
              </span>
              {o.notes && (
                <p className="text-xs italic mt-1" style={{ color: COLORS.muted }}>
                  Note: {o.notes}
                </p>
              )}
            </div>
            <select
              value={o.status}
              onChange={(e) => updateStatus(o.id, e.target.value)}
              className="px-3 py-2 rounded-full text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
