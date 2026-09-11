import { X } from 'lucide-react';
import { COLORS } from '../constants';

export default function OfferBanner({ offer, onDismiss }) {
  if (!offer) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap" style={{ background: COLORS.marigold }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white" style={{ color: COLORS.espresso }}>
          {offer.badge}
        </span>
        <span className="text-sm font-semibold" style={{ color: COLORS.espresso }}>
          {offer.title}
        </span>
        {offer.description && (
          <span className="text-sm hidden sm:inline" style={{ color: COLORS.espresso }}>
            — {offer.description}
          </span>
        )}
      </div>
      <button onClick={onDismiss} aria-label="Dismiss offer" className="p-1">
        <X size={16} style={{ color: COLORS.espresso }} />
      </button>
    </div>
  );
}
