import { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { api } from '../api';
import { COLORS, money } from '../constants';

function isAuthError(message) {
  return /401|invalid|expired|authorization/i.test(message || '');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CustomersPanel({ token, onAuthError }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.adminGetCustomers(token);
      setCustomers(data);
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, onAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  const copyAllNumbers = async () => {
    const numbers = customers.map((c) => c.phone).join('\n');
    try {
      await navigator.clipboard.writeText(numbers);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Couldn't copy - your browser may be blocking clipboard access.");
    }
  };

  if (loading) return <p style={{ color: COLORS.muted }}>Loading customers…</p>;

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
        Everyone here checked "Send me occasional offers" at checkout. One row per customer, even if they've ordered more than once.
      </p>
      {error && (
        <p className="mb-3" style={{ color: COLORS.flamingo }}>
          {error}
        </p>
      )}

      {customers.length === 0 ? (
        <p style={{ color: COLORS.muted }}>No opted-in customers yet.</p>
      ) : (
        <>
          <button
            onClick={copyAllNumbers}
            className="mb-4 flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ background: COLORS.marigold, color: COLORS.espresso }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : `Copy All ${customers.length} Numbers`}
          </button>

          <div className="space-y-3">
            {customers.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-bold" style={{ color: COLORS.ink }}>
                    {c.name}
                  </p>
                  <p className="text-sm ff-mono" style={{ color: COLORS.muted }}>
                    {c.phone}
                  </p>
                  {c.email && (
                    <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
                      {c.email}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>
                    {c.order_count} order{c.order_count > 1 ? 's' : ''} · {money(c.total_spent_kes)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
                    Last order {formatDate(c.last_order_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
