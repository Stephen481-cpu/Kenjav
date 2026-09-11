import { COLORS } from '../constants';

const GRADIENTS = [
  { from: '#F0B429', to: '#C7791A' },
  { from: '#F3D98A', to: '#E2971D' },
  { from: '#E2971D', to: '#8B4A1E' },
  { from: '#C9863F', to: '#2A1810' },
];

// Product ids are MongoDB ObjectId strings (not numbers), so we hash the
// string to pick a gradient rather than relying on numeric modulo. Any
// number of admin-added products get a varied, consistent glyph
// automatically, without needing per-product hardcoded colors.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getGlyphProps(product) {
  const nameLower = (product.name || '').toLowerCase();
  const idx = hashString(String(product.id || product.name || '')) % GRADIENTS.length;
  return {
    ...GRADIENTS[idx],
    stacked: nameLower.includes('dozen') || nameLower.includes('packet') || nameLower.includes('box'),
    isDrink: nameLower.includes('chai') || nameLower.includes('tea') || nameLower.includes('coffee') || nameLower.includes('juice'),
  };
}

// Category tags for the menu filter chips, borrowed from a reference design
// that tagged items by a defining trait with a small colour dot. Here it's
// the product category rather than a food dye, but the pattern is the same.
export const CATEGORIES = ['Mandazi', 'Ngumu', 'Fried Treats', 'Savory', 'Sweets & Bakes'];

export const CATEGORY_COLORS = {
  Mandazi: COLORS.marigold,
  Ngumu: COLORS.ink,
  'Fried Treats': COLORS.eyebrow,
  Savory: COLORS.jade,
  'Sweets & Bakes': COLORS.flamingo,
};

const DIAMOND_CLIP = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export function ProductGlyph({ from, to, stacked, isDrink, imageUrl, size = 72 }) {
  if (imageUrl) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img
          src={imageUrl}
          alt=""
          className="absolute shadow-md object-cover"
          style={{ width: size * 0.88, height: size * 0.88, top: size * 0.06, left: size * 0.06, clipPath: DIAMOND_CLIP }}
        />
      </div>
    );
  }
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {stacked && (
        <>
          <div
            className="absolute rounded-xl"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, width: size * 0.7, height: size * 0.7, top: -size * 0.06, left: size * 0.32, opacity: 0.55, transform: 'rotate(45deg)' }}
          />
          <div
            className="absolute rounded-xl"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, width: size * 0.78, height: size * 0.78, top: size * 0.16, left: -size * 0.08, opacity: 0.75, transform: 'rotate(45deg)' }}
          />
        </>
      )}
      <div
        className="absolute rounded-xl shadow-md overflow-hidden"
        style={{ width: size * 0.82, height: size * 0.82, top: size * 0.09, left: size * 0.09, background: `linear-gradient(135deg, ${from}, ${to})`, transform: 'rotate(45deg)' }}
      >
        {!isDrink && (
          <>
            <span className="absolute rounded-full bg-white/80" style={{ width: size * 0.07, height: size * 0.07, top: '20%', left: '26%' }} />
            <span className="absolute rounded-full bg-white/70" style={{ width: size * 0.055, height: size * 0.055, top: '52%', left: '64%' }} />
            <span className="absolute rounded-full bg-white/60" style={{ width: size * 0.055, height: size * 0.055, top: '68%', left: '32%' }} />
          </>
        )}
      </div>
      {isDrink && (
        <div className="absolute flex gap-1" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
          <span className="steam-wisp block rounded-full bg-white/50" style={{ width: 3, height: 10, animationDelay: '0s' }} />
          <span className="steam-wisp block rounded-full bg-white/50" style={{ width: 3, height: 10, animationDelay: '0.5s' }} />
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = 30 }) {
  return (
    <div
      className="rounded-md shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${COLORS.marigoldLight}, ${COLORS.flamingo})`, transform: 'rotate(45deg)' }}
    />
  );
}

export function Field({ label, error, required, children }) {
  return (
    <label className="block mb-4">
      <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>
        {label}
        {required && <span style={{ color: COLORS.flamingo }}> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {error && (
        <span className="block mt-1 text-xs" style={{ color: COLORS.flamingo }}>
          {error}
        </span>
      )}
    </label>
  );
}
