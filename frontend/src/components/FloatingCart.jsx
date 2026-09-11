import { ShoppingBag } from 'lucide-react';
import { COLORS, money } from '../constants';

export default function FloatingCart({ count, subtotal, onClick, bump }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open cart"
      className={`fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full shadow-2xl active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 ${bump ? 'cart-bump' : ''}`}
      style={{ background: COLORS.marigold, padding: count > 0 ? '14px 20px' : '16px' }}
    >
      <span className="relative">
        <ShoppingBag size={22} style={{ color: COLORS.espresso }} />
        {count > 0 && (
          <span
            className="absolute -top-2 -right-2 text-xs font-bold rounded-full flex items-center justify-center"
            style={{ width: 18, height: 18, background: COLORS.flamingo, color: '#fff' }}
          >
            {count}
          </span>
        )}
      </span>
      {count > 0 && (
        <span className="font-bold text-sm ff-mono" style={{ color: COLORS.espresso }}>
          {money(subtotal)}
        </span>
      )}
    </button>
  );
}
