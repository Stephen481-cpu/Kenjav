import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { COLORS, money, isValidPhone } from '../constants';
import { Field } from './ui';

const emptyForm = { name: '', phone: '', email: '', fulfillment: 'pickup', address: '', notes: '', payment_method: 'cash' };

export default function CheckoutModal({ open, onClose, cart, subtotal, onSubmit, submitting, submitError }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const updateForm = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Your name is required';
    if (!isValidPhone(form.phone)) e.phone = 'Valid phone number is required';
    if (form.fulfillment === 'delivery' && !form.address.trim()) e.address = 'Delivery address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div onClick={() => !submitting && onClose()} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: COLORS.border }}>
          <h3 className="font-bold text-xl ff-display" style={{ color: COLORS.ink }}>
            Complete Order
          </h3>
          <button
            onClick={() => !submitting && onClose()}
            className="p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ background: COLORS.cream }}
            aria-label="Close checkout"
          >
            <X size={18} style={{ color: COLORS.ink }} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          <p className="text-xs font-bold tracking-widest mb-3" style={{ color: COLORS.eyebrow }}>
            YOUR DETAILS
          </p>
          <Field label="Full Name" required error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="Jane Wanjiru"
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
            />
          </Field>
          <Field label="Phone Number" required error={errors.phone}>
            <input
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
            />
          </Field>
          <Field label="Email (Optional)">
            <input
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
            />
          </Field>

          <p className="text-xs font-bold tracking-widest mt-2 mb-3" style={{ color: COLORS.eyebrow }}>
            FULFILLMENT
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => updateForm('fulfillment', 'pickup')}
              className="py-2.5 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={form.fulfillment === 'pickup' ? { background: COLORS.espresso, color: COLORS.cream } : { background: COLORS.cream, color: COLORS.ink }}
            >
              Pick Up
            </button>
            <button
              type="button"
              onClick={() => updateForm('fulfillment', 'delivery')}
              className="py-2.5 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={form.fulfillment === 'delivery' ? { background: COLORS.espresso, color: COLORS.cream } : { background: COLORS.cream, color: COLORS.ink }}
            >
              Delivery
            </button>
          </div>

          {form.fulfillment === 'pickup' ? (
            <p className="text-sm mb-4" style={{ color: COLORS.jade }}>
              Ready in ~15 mins at Nyotu Rd, Rongai.
            </p>
          ) : (
            <>
              <p className="text-sm mb-3 font-semibold" style={{ color: COLORS.jade }}>
                Free delivery · Ready in ~40 mins
              </p>
              <Field label="Delivery Address" required error={errors.address}>
                <input
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="Street, estate, landmark"
                  className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400"
                  style={{ borderColor: COLORS.border, color: COLORS.ink }}
                />
              </Field>
            </>
          )}

          <p className="text-xs font-bold tracking-widest mt-2 mb-3" style={{ color: COLORS.eyebrow }}>
            PAYMENT METHOD
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => updateForm('payment_method', 'cash')}
              className="py-2.5 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={form.payment_method === 'cash' ? { background: COLORS.espresso, color: COLORS.cream } : { background: COLORS.cream, color: COLORS.ink }}
            >
              Cash on {form.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}
            </button>
            <button
              type="button"
              onClick={() => updateForm('payment_method', 'mpesa')}
              className="py-2.5 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={form.payment_method === 'mpesa' ? { background: COLORS.espresso, color: COLORS.cream } : { background: COLORS.cream, color: COLORS.ink }}
            >
              Pay with M-Pesa
            </button>
          </div>
          {form.payment_method === 'mpesa' && (
            <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
              You'll get an M-Pesa prompt on your phone to complete payment right after placing this order.
            </p>
          )}

          <Field label="Additional Notes">
            <textarea
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              placeholder="Any special requests? (e.g. extra sugar, pack separately)"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
            />
          </Field>

         <label className="flex items-start gap-2.5 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.marketing_opt_in}
              onChange={(e) => updateForm('marketing_opt_in', e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-sm" style={{ color: COLORS.muted }}>
              Send me occasional offers and updates via WhatsApp or SMS.
            </span>
          </label>

          <div className="mt-2 pt-4 border-t" style={{ borderColor: COLORS.border }}>
            {cart.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm py-1" style={{ color: COLORS.muted }}>
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span className="ff-mono">{money(item.price_kes * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-1" style={{ color: COLORS.jade }}>
              <span>Delivery</span>
              <span className="font-semibold">FREE</span>
            </div>
          </div>

          {submitError && (
            <p className="text-sm mt-3" style={{ color: COLORS.flamingo }}>
              {submitError}
            </p>
          )}
        </div>

        <div className="p-5 border-t shrink-0" style={{ borderColor: COLORS.border }}>
          <div className="flex items-center justify-between font-bold text-lg mb-4 ff-display">
            <span style={{ color: COLORS.ink }}>Total to Pay</span>
            <span className="ff-mono" style={{ color: COLORS.ink }}>
              {money(subtotal)}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ background: COLORS.marigold, color: COLORS.espresso }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Placing Order...
              </>
            ) : form.payment_method === 'mpesa' ? (
              'Place Order & Pay with M-Pesa'
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
