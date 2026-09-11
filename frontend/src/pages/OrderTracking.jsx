import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api';
import { COLORS, money } from '../constants';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#E2971D', icon: Loader2, spin: true },
  preparing: { label: 'Preparing', color: '#E2971D', icon: Loader2, spin: true },
  ready: { label: 'Ready', color: '#1D7A5C', icon: CheckCircle2, spin: false },
  completed: { label: 'Completed', color: '#1D7A5C', icon: CheckCircle2, spin: false },
  cancelled: { label: 'Cancelled', color: '#E0356B', icon: CheckCircle2, spin: false },
};

function statusMessage(order) {
  const { status, fulfillment_type } = order;
  if (status === 'pending') return fulfillment_type === 'pickup' ? 'Ready in ~15 mins' : 'Ready in ~40 mins';
  if (status === 'preparing') return 'Your mandazis are in the fryer now.';
  if (status === 'ready') return fulfillment_type === 'pickup' ? 'Come grab it — still warm!' : 'Out for delivery — on its way to you now.';
  if (status === 'completed') return fulfillment_type === 'pickup' ? 'Picked up. Thanks for choosing KENJAV!' : 'Delivered. Thanks for choosing KENJAV!';
  if (status === 'cancelled') return 'This order was cancelled.';
  return '';
}

export default function OrderTracking() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payingNow, setPayingNow] = useState(false);
  const [payError, setPayError] = useState('');
  const autoTriggeredRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getOrder(code);
      setOrder(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  const triggerPay = useCallback(async () => {
    setPayingNow(true);
    setPayError('');
    try {
      await api.payOrder(code);
      await load();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPayingNow(false);
    }
  }, [code, load]);

  useEffect(() => {
    load();
  }, [load]);

  // The first time an M-Pesa order loads with no payment attempt yet, kick
  // off the STK push automatically so the customer doesn't have to do
  // anything extra right after checkout.
  useEffect(() => {
    if (!order) return;
    if (order.payment_method === 'mpesa' && order.payment_status === 'pending' && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      triggerPay();
    }
  }, [order, triggerPay]);

  // Poll for live status updates while the order is still active, so the
  // customer sees changes the shop makes from the admin panel in near real time.
  useEffect(() => {
    if (!order || ['completed', 'cancelled'].includes(order.status)) return;
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [order, load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: COLORS.muted }}>
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center" style={{ background: COLORS.cream }}>
        <p className="font-semibold" style={{ color: COLORS.ink }}>
          We couldn't find that order.
        </p>
        <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
          {error}
        </p>
        <button onClick={() => navigate('/')} className="mt-5 px-5 py-2.5 rounded-full font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.espresso, color: COLORS.cream }}>
          Back to Menu
        </button>
      </div>
    );
  }

  const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = s.icon;

  return (
    <div style={{ background: COLORS.cream, minHeight: '100vh' }} className="px-5 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm font-semibold mb-6 focus:outline-none" style={{ color: COLORS.ink }}>
          <ArrowLeft size={16} /> Back to Menu
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full ff-mono" style={{ background: COLORS.creamDark, color: COLORS.ink }}>
              Order {order.order_code}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full" style={{ background: `${s.color}22`, color: s.color }}>
              <StatusIcon size={14} className={s.spin ? 'animate-spin' : ''} /> {s.label}
            </span>
          </div>

          <h2 className="text-2xl font-bold mt-4 ff-display" style={{ color: COLORS.ink }}>
            {statusMessage(order)}
          </h2>

          <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: COLORS.border }}>
            <span className="font-semibold" style={{ color: COLORS.ink }}>
              {order.payment_status === 'paid' ? 'Total Paid' : 'Total to Pay'}
            </span>
            <span className="font-bold text-lg ff-mono" style={{ color: COLORS.ink }}>
              {money(order.total_kes)}
            </span>
          </div>
        </div>

        {order.payment_method === 'mpesa' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm mt-4">
            <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: COLORS.eyebrow }}>
              PAYMENT
            </h3>
            {order.payment_status === 'paid' ? (
              <div className="flex items-start gap-2" style={{ color: COLORS.jade }}>
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Paid via M-Pesa</p>
                  {order.mpesa_receipt_number && (
                    <p className="text-xs ff-mono mt-0.5" style={{ color: COLORS.muted }}>
                      Receipt: {order.mpesa_receipt_number}
                    </p>
                  )}
                </div>
              </div>
            ) : payingNow || order.payment_status === 'processing' ? (
              <div className="flex items-center gap-2" style={{ color: COLORS.marigold }}>
                <Loader2 size={18} className="animate-spin shrink-0" />
                <p className="font-semibold">Check your phone — enter your M-Pesa PIN to complete payment.</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold mb-3" style={{ color: COLORS.flamingo }}>
                  {order.payment_status === 'failed' ? "Payment wasn't completed." : 'Payment not started yet.'}
                </p>
                <button
                  onClick={triggerPay}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  style={{ background: COLORS.marigold, color: COLORS.espresso }}
                >
                  {order.payment_status === 'failed' ? 'Try Again' : 'Pay with M-Pesa'}
                </button>
              </div>
            )}
            {payError && (
              <p className="text-xs mt-3" style={{ color: COLORS.flamingo }}>
                {payError}
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm mt-4">
          <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: COLORS.eyebrow }}>
            CUSTOMER DETAILS
          </h3>
          <p className="text-sm" style={{ color: COLORS.ink }}>
            Name: {order.customer_name}
          </p>
          <p className="text-sm mt-1" style={{ color: COLORS.ink }}>
            Phone: {order.customer_phone}
          </p>

          <h3 className="text-xs font-bold tracking-widest mt-5 mb-3" style={{ color: COLORS.eyebrow }}>
            FULFILLMENT
          </h3>
          <p className="text-sm flex items-center gap-1.5" style={{ color: COLORS.ink }}>
            <MapPin size={14} /> {order.fulfillment_type === 'pickup' ? 'Pick Up at Store' : `Free Delivery to ${order.delivery_address}`}
          </p>

          <h3 className="text-xs font-bold tracking-widest mt-5 mb-3" style={{ color: COLORS.eyebrow }}>
            ORDER ITEMS
          </h3>
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1" style={{ color: COLORS.ink }}>
              <span>
                {item.quantity}× {item.product_name}
              </span>
              <span className="ff-mono">{money(item.line_total_kes)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-1" style={{ color: COLORS.jade }}>
            <span>Delivery</span>
            <span className="font-semibold">FREE</span>
          </div>
          <div className="flex justify-between font-bold mt-2 pt-2 border-t" style={{ borderColor: COLORS.border, color: COLORS.ink }}>
            <span>Total</span>
            <span className="ff-mono">{money(order.total_kes)}</span>
          </div>

          {order.notes && (
            <p className="text-xs mt-4 italic" style={{ color: COLORS.muted }}>
              Note: {order.notes}
            </p>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: COLORS.muted }}>
            Questions about your order?
          </p>
          <a href="tel:+254700536528" className="font-semibold inline-flex items-center gap-1.5 mt-1 ff-mono" style={{ color: COLORS.flamingo }}>
            <Phone size={14} /> Call us at 0743317186 KENJAV
          </a>
        </div>
      </div>
    </div>
  );
}
