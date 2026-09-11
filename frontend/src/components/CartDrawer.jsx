import { ShoppingBag, Minus, Plus, Trash2, X } from 'lucide-react';
import { COLORS, money } from '../constants';

export default function CartDrawer({ open, onClose, cart, updateQty, removeItem, subtotal, onCheckout }) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(0,0,0,0.5)' }}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-96 bg-white flex flex-col shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: COLORS.border }}>
          <h3 className="font-bold text-xl ff-display" style={{ color: COLORS.ink }}>
            Your Order
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.cream }} aria-label="Close cart">
            <X size={18} style={{ color: COLORS.ink }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="p-4 rounded-full mb-4" style={{ background: COLORS.cream }}>
                <ShoppingBag size={28} style={{ color: COLORS.eyebrow }} />
              </div>
              <p className="font-semibold ff-display" style={{ color: COLORS.ink }}>
                Your cart is empty
              </p>
              <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
                Looks like you haven't added any fresh mandazis yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate ff-display" style={{ color: COLORS.ink }}>
                      {item.name}
                    </p>
                    <p className="text-sm mt-0.5 ff-mono" style={{ color: COLORS.muted }}>
                      {money(item.price_kes)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.product_id, -1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                      style={{ background: COLORS.cream }}
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus size={14} style={{ color: COLORS.ink }} />
                    </button>
                    <span className="w-5 text-center ff-mono" style={{ color: COLORS.ink }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.product_id, 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                      style={{ background: COLORS.cream }}
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus size={14} style={{ color: COLORS.ink }} />
                    </button>
                  </div>
                  <button onClick={() => removeItem(item.product_id)} className="p-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full" aria-label={`Remove ${item.name}`}>
                    <Trash2 size={16} style={{ color: COLORS.flamingo }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-5 border-t shrink-0" style={{ borderColor: COLORS.border }}>
            <div className="flex items-center justify-between font-bold text-lg mb-1 ff-display">
              <span style={{ color: COLORS.ink }}>Total</span>
              <span className="ff-mono" style={{ color: COLORS.ink }}>
                {money(subtotal)}
              </span>
            </div>
            <p className="text-xs mb-4 font-semibold" style={{ color: COLORS.jade }}>
              Free delivery available at checkout
            </p>
            <button onClick={onCheckout} className="w-full font-semibold py-3.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.espresso, color: COLORS.cream }}>
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
