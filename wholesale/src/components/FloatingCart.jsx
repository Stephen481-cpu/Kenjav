import { ShoppingBag } from 'lucide-react';
import { money } from '../constants';

export default function FloatingCart({ count, total, onClick }) {
  if (!count) return null;
  return (
    <button type="button" onClick={onClick} className="fixed bottom-5 right-5 z-30 rounded-full bg-[#2a1810] text-[#fbf0dc] px-5 py-3 shadow-xl flex items-center gap-3 font-bold active:scale-95 transition">
      <span className="relative"><ShoppingBag size={19} /><span className="absolute -right-3 -top-3 min-w-5 h-5 px-1 rounded-full bg-[#e0356b] text-white text-[11px] flex items-center justify-center">{count}</span></span>
      <span>Cart</span>
      <span className="text-[#f0b429]">{money(total)}</span>
    </button>
  );
}
