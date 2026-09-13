import { useEffect, useState } from 'react';
import { api } from '../api';
import { money, formatDate } from '../constants';

const EMPTY_FORM = {
  amount_kes: '',
  method: 'mpesa',
  reference: '',
  notes: ''
};

function statusLabel(status) {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';

    case 'processing':
      return 'Processing';

    case 'pending':
      return 'Pending';

    case 'rejected':
      return 'Rejected';

    case 'failed':
      return 'Failed';

    default:
      return status || 'Unknown';
  }
}

function statusClass(status) {
  switch (status) {
    case 'confirmed':
      return 'text-[#1d7a5c]';

    case 'processing':
      return 'text-[#b9791a]';

    case 'rejected':
    case 'failed':
      return 'text-[#e0356b]';

    default:
      return 'text-[#6b5744]';
  }
}

export default function Payments({ token }) {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const data = await api.portalPayments(token);
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));

    setMsg('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setMsg('');
    setError('');

    try {
      const response = await api.requestPayment(
        token,
        {
          ...form,
          amount_kes: Number(form.amount_kes)
        }
      );

      if (
        form.method === 'mpesa' &&
        response?.status === 'processing'
      ) {
        setMsg(
          'M-Pesa prompt sent. Check your phone and enter your M-Pesa PIN.'
        );
      } else {
        setMsg(
          'Payment submitted for confirmation.'
        );
      }

      setForm({
        ...EMPTY_FORM
      });

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="title">
        Payments
      </h1>

      <p className="muted mb-5">
        Make payments and keep your payment history in one place.
      </p>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* PAYMENT FORM */}
        <form
          onSubmit={submit}
          className="panel space-y-3"
        >
          <h2 className="section-title">
            Make a payment
          </h2>

          <input
            required
            type="number"
            min="1"
            step="1"
            placeholder="Amount (KES)"
            className="field"
            value={form.amount_kes}
            onChange={(e) =>
              updateForm(
                'amount_kes',
                e.target.value
              )
            }
          />

          <select
            className="field"
            value={form.method}
            onChange={(e) =>
              updateForm(
                'method',
                e.target.value
              )
            }
          >
            <option value="mpesa">
              M-Pesa
            </option>

            <option value="cash">
              Cash
            </option>

            <option value="bank">
              Bank
            </option>
          </select>

          {form.method === 'mpesa' ? (
            <p className="text-sm muted">
              Your registered shopkeeper phone number will receive an M-Pesa STK prompt.
            </p>
          ) : (
            <input
              placeholder={
                form.method === 'cash'
                  ? 'Receipt / reference (optional)'
                  : 'Bank transaction reference'
              }
              className="field"
              value={form.reference}
              onChange={(e) =>
                updateForm(
                  'reference',
                  e.target.value
                )
              }
            />
          )}

          <textarea
            placeholder="Notes (optional)"
            className="field min-h-24"
            value={form.notes}
            onChange={(e) =>
              updateForm(
                'notes',
                e.target.value
              )
            }
          />

          {msg && (
            <p className="text-sm text-[#1d7a5c]">
              {msg}
            </p>
          )}

          {error && (
            <p className="text-sm text-[#e0356b]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary disabled:opacity-60"
          >
            {submitting
              ? 'Processing...'
              : form.method === 'mpesa'
                ? 'Pay with M-Pesa'
                : 'Submit Payment'}
          </button>
        </form>


        {/* PAYMENT HISTORY */}
        <div className="panel">
          <h2 className="section-title">
            Payment history
          </h2>

          {payments.length === 0 ? (
            <p className="muted text-sm">
              No payments yet.
            </p>
          ) : (
            <div className="space-y-1">
              {payments.map((payment) => (
                <div
                  className="row"
                  key={payment.id}
                >
                  <div>
                    <b>
                      {money(payment.amount_kes)}
                    </b>

                    <small>
                      {formatDate(payment.date)}
                      {' · '}
                      {String(
                        payment.method || ''
                      ).toUpperCase()}
                    </small>

                    <small
                      className={statusClass(
                        payment.status
                      )}
                    >
                      {statusLabel(
                        payment.status
                      )}
                    </small>
                  </div>

                  <span className="muted text-xs text-right">
                    {payment.reference || '—'}

                    {payment.mpesa_receipt_number && (
                      <span className="block mt-1">
                        M-Pesa: {payment.mpesa_receipt_number}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}