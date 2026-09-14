import { useEffect, useState } from 'react';
import { api } from '../api';
import { money, formatDate } from '../constants';

const initialForm = {
  amount_kes: '',
  method: 'mpesa',
  reference: '',
  notes: '',
};

export default function Payments({ token }) {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setError('');
      setPayments(await api.portalPayments(token));
    } catch (e) {
      setError(e.message || 'Failed to load payments.');
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setSaving(true);

    try {
      const result = await api.requestPayment(token, {
        amount_kes: Number(form.amount_kes),
        method: form.method,
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      });

      setForm(initialForm);
      setMsg(
        result?.message ||
          (form.method === 'mpesa'
            ? 'STK push sent. Check your phone and enter your M-Pesa PIN.'
            : 'Payment submitted for confirmation.')
      );
      await load();
    } catch (e) {
      setError(e.message || 'Failed to submit payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="title">Payments</h1>
      <p className="muted mb-5">
        Pay your outstanding KENJAV balance and keep your payment history here.
      </p>

      <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={submit} className="panel space-y-3">
          <h2 className="section-title">Make a payment</h2>

          <input
            required
            type="number"
            min="1"
            step="0.01"
            placeholder="Amount (KES)"
            className="field"
            value={form.amount_kes}
            onChange={(e) => setForm({ ...form, amount_kes: e.target.value })}
          />

          <select
            className="field"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          >
            <option value="mpesa">M-Pesa</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>

          <input
            placeholder="Receipt / reference (optional)"
            className="field"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />

          <textarea
            placeholder="Notes (optional)"
            className="field min-h-24"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {msg && <p className="text-sm text-[#1d7a5c]">{msg}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary" disabled={saving}>
            {saving ? 'Processing...' : 'Submit Payment'}
          </button>
        </form>

        <div className="panel">
          <h2 className="section-title">Payment history</h2>

          {!payments.length ? (
            <p className="muted">No payments recorded yet.</p>
          ) : (
            <div>
              {payments.map((payment) => (
                <div className="row" key={payment.id}>
                  <div>
                    <b>{money(payment.amount_kes)}</b>
                    <small>
                      {formatDate(payment.date)} · {payment.method} · {payment.status}
                    </small>
                  </div>
                  <span className="muted text-xs">{payment.reference || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
