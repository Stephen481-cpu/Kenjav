import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, ShoppingBag } from 'lucide-react';
import { api } from '../api';
import { COLORS, money } from '../constants';
import {
  ProductGlyph,
  LogoMark,
  getGlyphProps,
  CATEGORIES,
  CATEGORY_COLORS,
} from '../components/ui';
import OfferBanner from '../components/OfferBanner';
import CartDrawer from '../components/CartDrawer';
import CheckoutModal from '../components/CheckoutModal';
import FloatingCart from '../components/FloatingCart';

const MAPS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=KENJAV%20Mandazi,%20Nyotu%20Road,%20Ongata%20Rongai,%20Kenya&destination_place_id=ChIJK2L9_lhPLxgRnVbGgIK0Aac';

/*
  PRODUCT IMAGE

  The image gets its own fixed container.
  object-contain makes the WHOLE image visible
  without cropping, stretching or zooming.

  If a product has no image_url, the normal ProductGlyph
  is shown instead.
*/
function ProductImage({ product, height = 220 }) {
  const glyph = getGlyphProps(product);

  if (!product.image_url) {
    return (
      <div
        className="w-full flex items-center justify-center rounded-2xl overflow-hidden"
        style={{
          height,
          background: COLORS.creamDark,
        }}
      >
        <ProductGlyph {...glyph} size={120} />
      </div>
    );
  }

  return (
    <div
      className="w-full flex items-center justify-center rounded-2xl overflow-hidden"
      style={{
        height,
        background: '#fff',
      }}
    >
      <img
        src={product.image_url}
        alt={product.name}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

function SpecialCard({ product, onAdd }) {
  return (
    <div className="h-full flex flex-col p-5 rounded-3xl bg-white shadow-sm">

      {/* IMAGE ON TOP */}
      <ProductImage product={product} height={210} />

      {/* PRODUCT DETAILS BELOW */}
      <div className="mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          {product.category && CATEGORY_COLORS[product.category] && (
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 8,
                height: 8,
                background: CATEGORY_COLORS[product.category],
              }}
            />
          )}

          <h4
            className="font-semibold text-lg ff-display"
            style={{ color: COLORS.ink }}
          >
            {product.name}
          </h4>

          {product.tag && (
            <span
              className="inline-block w-fit text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: COLORS.creamDark,
                color: COLORS.eyebrow,
              }}
            >
              {product.tag}
            </span>
          )}
        </div>

        <p
          className="text-sm mt-2"
          style={{ color: COLORS.muted }}
        >
          {product.description}
        </p>
      </div>

      {/* PRICE + BUTTON */}
      <div className="flex items-center justify-between mt-4">
        <span
          className="font-bold ff-mono"
          style={{ color: COLORS.ink }}
        >
          {money(product.price_kes)}
        </span>

        <button
          onClick={() => onAdd(product)}
          className="text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{
            background: COLORS.espresso,
            color: COLORS.cream,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function MenuRow({ product, onAdd }) {
  return (
    <div className="flex flex-col p-4 rounded-2xl bg-white shadow-sm">

      {/* IMAGE ON TOP */}
      <ProductImage product={product} height={220} />

      {/* PRODUCT DETAILS BELOW */}
      <div className="mt-4">
        <div className="flex items-center gap-2 flex-wrap">

          {product.category && CATEGORY_COLORS[product.category] && (
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 8,
                height: 8,
                background: CATEGORY_COLORS[product.category],
              }}
            />
          )}

          <h4
            className="font-semibold text-lg ff-display"
            style={{ color: COLORS.ink }}
          >
            {product.name}
          </h4>

          {product.tag && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: COLORS.creamDark,
                color: COLORS.eyebrow,
              }}
            >
              {product.tag}
            </span>
          )}
        </div>

        <p
          className="text-sm mt-2 leading-relaxed"
          style={{ color: COLORS.muted }}
        >
          {product.description}
        </p>
      </div>

      {/* PRICE + BUTTON */}
      <div className="flex items-center justify-between mt-4">
        <span
          className="font-bold ff-mono"
          style={{ color: COLORS.ink }}
        >
          {money(product.price_kes)}
        </span>

        <button
          onClick={() => onAdd(product)}
          className="text-sm font-semibold px-4 py-2 rounded-full active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{
            background: COLORS.espresso,
            color: COLORS.cream,
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export default function Storefront() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [offer, setOffer] = useState(null);
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast] = useState(null);
  const [bump, setBump] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const specialsRef = useRef(null);
  const menuRef = useRef(null);
  const storyRef = useRef(null);
  const visitRef = useRef(null);

  const scrollTo = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  useEffect(() => {
    Promise.all([api.getProducts(), api.getOffer()])
      .then(([p, o]) => {
        setProducts(p);
        setOffer(o);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;

    const t = setTimeout(() => setToast(null), 2200);

    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!bump) return;

    const t = setTimeout(() => setBump(false), 400);

    return () => clearTimeout(t);
  }, [bump]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product_id === product.id
      );

      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
              }
            : i
        );
      }

      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price_kes: product.price_kes,
          quantity: 1,
        },
      ];
    });

    setToast(`Added ${product.name} to cart`);
    setBump(true);
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId
            ? {
                ...i,
                quantity: i.quantity + delta,
              }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setCart((prev) =>
      prev.filter((i) => i.product_id !== productId)
    );
  };

  const cartCount = cart.reduce(
    (s, i) => s + i.quantity,
    0
  );

  const subtotal = cart.reduce(
    (s, i) => s + i.price_kes * i.quantity,
    0
  );

  const handlePlaceOrder = async (form) => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const order = await api.createOrder({
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email || undefined,
        fulfillment_type: form.fulfillment,
        delivery_address:
          form.fulfillment === 'delivery'
            ? form.address
            : undefined,
        notes: form.notes || undefined,
        payment_method: form.payment_method,
        marketing_opt_in: form.marketing_opt_in,
        items: cart.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      });

      setCart([]);
      setCheckoutOpen(false);

      navigate(`/order/${order.order_code}`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const specials = products.filter(
    (p) => p.is_featured
  );

  const visibleCategories = CATEGORIES.filter((c) =>
    products.some((p) => p.category === c)
  );

  const filteredProducts =
    activeCategory === 'All'
      ? products
      : products.filter(
          (p) => p.category === activeCategory
        );

  return (
    <div style={{ minHeight: '100vh' }}>

      {offer && !offerDismissed && (
        <OfferBanner
          offer={offer}
          onDismiss={() => setOfferDismissed(true)}
        />
      )}

      {/* HEADER */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: 'rgba(42,24,16,0.92)',
        }}
      >
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <LogoMark />

            <span
              className="font-bold text-xl ff-display"
              style={{ color: COLORS.cream }}
            >
              KENJAV
            </span>
          </div>

          <nav
            className="hidden sm:flex items-center gap-6 text-sm font-semibold"
            style={{
              color: 'rgba(251,240,220,0.85)',
            }}
          >
            <button
              onClick={() => scrollTo(menuRef)}
              className="focus:outline-none"
            >
              Menu
            </button>

            <button
              onClick={() => scrollTo(visitRef)}
              className="focus:outline-none"
            >
              Visit
            </button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          background: `linear-gradient(180deg, ${COLORS.espresso}, ${COLORS.espressoDeep})`,
        }}
        className="relative overflow-hidden pt-14 pb-16 px-5"
      >
        <div className="max-w-2xl mx-auto text-center relative z-10">

          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: COLORS.marigoldLight }}
          >
            RONGAI'S FAVOURITE MANDAZI SHOP
          </span>

          <h1
            className="text-4xl sm:text-5xl font-bold mt-3 leading-tight ff-display"
            style={{ color: COLORS.cream }}
          >
            Freshness You Can Trust.
          </h1>

          <p
            className="mt-4 text-base leading-relaxed max-w-md mx-auto"
            style={{
              color: 'rgba(251,240,220,0.8)',
            }}
          >
            Golden, light, and perfectly spiced. Our artisan
            mandazis are prepared daily with love, bringing
            the authentic taste of East Africa to your morning.
          </p>

          <div className="flex justify-center my-8">
            <div
              className="relative"
              style={{
                width: 140,
                height: 140,
              }}
            >
              <div
                className="absolute left-1/2 flex gap-3"
                style={{
                  top: -10,
                  transform: 'translateX(-50%)',
                }}
              >
                <span
                  className="steam-wisp block rounded-full"
                  style={{
                    width: 6,
                    height: 22,
                    background:
                      'rgba(251,240,220,0.4)',
                    animationDelay: '0s',
                  }}
                />

                <span
                  className="steam-wisp block rounded-full"
                  style={{
                    width: 6,
                    height: 26,
                    background:
                      'rgba(251,240,220,0.4)',
                    animationDelay: '0.8s',
                  }}
                />

                <span
                  className="steam-wisp block rounded-full"
                  style={{
                    width: 6,
                    height: 22,
                    background:
                      'rgba(251,240,220,0.4)',
                    animationDelay: '1.6s',
                  }}
                />
              </div>

              <div
                className="float-slow absolute rounded-3xl shadow-2xl overflow-hidden"
                style={{
                  width: 100,
                  height: 100,
                  top: 20,
                  left: 20,
                  background: `linear-gradient(135deg, ${COLORS.marigoldLight}, #C7791A)`,
                  transform: 'rotate(45deg)',
                }}
              >
                <span
                  className="absolute rounded-full bg-white/80"
                  style={{
                    width: 8,
                    height: 8,
                    top: '22%',
                    left: '28%',
                  }}
                />

                <span
                  className="absolute rounded-full bg-white/70"
                  style={{
                    width: 6,
                    height: 6,
                    top: '55%',
                    left: '62%',
                  }}
                />

                <span
                  className="absolute rounded-full bg-white/60"
                  style={{
                    width: 6,
                    height: 6,
                    top: '70%',
                    left: '34%',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              background:
                'rgba(251,240,220,0.1)',
              color: COLORS.cream,
              border:
                '1px solid rgba(251,240,220,0.2)',
            }}
          >
            <MapPin size={16} />

            Made fresh daily · Rongai, Nairobi
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-8">

            <button
              onClick={() => scrollTo(specialsRef)}
              className="font-semibold px-6 py-3 rounded-full active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{
                background: COLORS.marigold,
                color: COLORS.espresso,
              }}
            >
              Today's Specials
            </button>

            <button
              onClick={() => scrollTo(menuRef)}
              className="font-semibold px-6 py-3 rounded-full active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{
                border:
                  '1.5px solid rgba(251,240,220,0.4)',
                color: COLORS.cream,
              }}
            >
              Full Menu
            </button>
          </div>

          <div
            className="flex items-center justify-center gap-2 mt-6 text-sm font-semibold"
            style={{ color: COLORS.jade }}
          >
            <ShoppingBag size={16} />

            Pick up in-store or get free delivery
          </div>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div
          className="px-5 py-16 text-center"
          style={{ color: COLORS.muted }}
        >
          Loading menu…
        </div>
      )}

      {/* ERROR */}
      {loadError && (
        <div
          className="px-5 py-16 text-center"
          style={{ color: COLORS.flamingo }}
        >
          Couldn't load the menu ({loadError}).
          Is the API server running?
        </div>
      )}

      {!loading && !loadError && (
        <>
          {/* SPECIALS */}
          <section
            ref={specialsRef}
            style={{ background: COLORS.cream }}
            className="px-5 py-16"
          >
            <div className="max-w-2xl mx-auto">

              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: COLORS.eyebrow }}
              >
                TODAY'S SPECIALS
              </span>

              <h2
                className="text-3xl font-bold mt-2 ff-display"
                style={{ color: COLORS.ink }}
              >
                Fresh Out The Fryer
              </h2>

              <p
                className="mt-2"
                style={{ color: COLORS.muted }}
              >
                Fresh out of the fryer, ready when you are.
              </p>

              {specials.length === 0 ? (
                <p
                  className="mt-6 text-sm"
                  style={{ color: COLORS.muted }}
                >
                  No specials featured right now — check back soon.
                </p>
              ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 mt-6">

                  {specials.map((p) => (
                    <div
                      key={p.id}
                      className="shrink-0 snap-start"
                      style={{ width: 260 }}
                    >
                      <SpecialCard
                        product={p}
                        onAdd={addToCart}
                      />
                    </div>
                  ))}

                </div>
              )}
            </div>
          </section>

          {/* FULL MENU */}
          <section
            ref={menuRef}
            style={{ background: COLORS.cream }}
            className="px-5 py-8 pb-16"
          >
            <div className="max-w-2xl mx-auto">

              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: COLORS.eyebrow }}
              >
                FULL MENU
              </span>

              <h2
                className="text-3xl font-bold mt-2 ff-display"
                style={{ color: COLORS.ink }}
              >
                Everything We Fry Today
              </h2>

              {/* CATEGORIES */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 mt-5">

                <button
                  onClick={() => setActiveCategory('All')}
                  className="shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                  style={
                    activeCategory === 'All'
                      ? {
                          background: COLORS.espresso,
                          color: COLORS.cream,
                        }
                      : {
                          background: '#fff',
                          color: COLORS.ink,
                        }
                  }
                >
                  All
                </button>

                {visibleCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                    style={
                      activeCategory === cat
                        ? {
                            background: COLORS.espresso,
                            color: COLORS.cream,
                          }
                        : {
                            background: '#fff',
                            color: COLORS.ink,
                          }
                    }
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background:
                          CATEGORY_COLORS[cat],
                      }}
                    />

                    {cat}
                  </button>
                ))}
              </div>

              {/* PRODUCTS */}
              <div className="mt-6 space-y-5">

                {filteredProducts.map((p) => (
                  <MenuRow
                    key={p.id}
                    product={p}
                    onAdd={addToCart}
                  />
                ))}

              </div>
            </div>
          </section>
        </>
      )}

      {/* STORY */}
      <section
        ref={storyRef}
        style={{ background: COLORS.espresso }}
        className="px-5 py-16"
      >
        <div className="max-w-2xl mx-auto">

          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: COLORS.marigoldLight }}
          >
            OUR STORY
          </span>

          <h2
            className="text-3xl font-bold mt-2 ff-display"
            style={{ color: COLORS.cream }}
          >
            The KENJAV Story
          </h2>

          <span
            className="inline-block mt-3 text-xs px-3 py-1 rounded-full ff-mono"
            style={{
              background:
                'rgba(251,240,220,0.1)',
              color: COLORS.marigoldLight,
            }}
          >
            Nyotu Road, Rongai
          </span>

          <p
            className="mt-5 leading-relaxed"
            style={{
              color:
                'rgba(251,240,220,0.85)',
            }}
          >
            Located in the heart of Rongai on Nyotu Road,
            KENJAV started with a simple belief: everyone
            deserves a perfect mandazi to start their day.
          </p>

          <p
            className="mt-4 leading-relaxed"
            style={{
              color:
                'rgba(251,240,220,0.85)',
            }}
          >
            We wake up before the sun to mix, knead, and fry
            our signature dough. We don't believe in shortcuts.
            We use quality ingredients, fresh oil, and the
            perfect blend of spices that make our mandazis
            uniquely Kenyan.
          </p>
        </div>
      </section>

      {/* VISIT */}
      <section
        ref={visitRef}
        style={{ background: COLORS.cream }}
        className="px-5 py-16"
      >
        <div className="max-w-2xl mx-auto">

          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: COLORS.eyebrow }}
          >
            FIND US
          </span>

          <h2
            className="text-3xl font-bold mt-2 ff-display"
            style={{ color: COLORS.ink }}
          >
            Visit Us
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">

            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl bg-white shadow-sm block hover:shadow-md transition"
            >
              <MapPin
                style={{ color: COLORS.flamingo }}
                size={20}
              />

              <h3
                className="font-semibold mt-2 ff-display"
                style={{ color: COLORS.ink }}
              >
                Location
              </h3>

              <p
                className="text-sm mt-1"
                style={{ color: COLORS.muted }}
              >
                Nyotu Rd, Rongai
                <br />
                Nairobi, Kenya
              </p>

              <p
                className="text-xs font-semibold mt-2"
                style={{ color: COLORS.flamingo }}
              >
                Get Directions →
              </p>
            </a>

            <div className="p-5 rounded-2xl bg-white shadow-sm">

              <Clock
                style={{ color: COLORS.jade }}
                size={20}
              />

              <h3
                className="font-semibold mt-2 ff-display"
                style={{ color: COLORS.ink }}
              >
                Hours
              </h3>

              <p
                className="text-sm mt-1"
                style={{ color: COLORS.muted }}
              >
                Mon – Sat: 5:00 AM – 9:00 PM
                <br />
                Closed Sundays
              </p>

            </div>
          </div>

          <div className="mt-4 p-5 rounded-2xl bg-white shadow-sm">

            <ShoppingBag
              style={{ color: COLORS.marigold }}
              size={20}
            />

            <h3
              className="font-semibold mt-2 ff-display"
              style={{ color: COLORS.ink }}
            >
              Delivery
            </h3>

            <p
              className="text-sm mt-1"
              style={{ color: COLORS.muted }}
            >
              Free delivery on every order, or pick up
              in-store — you choose at checkout.
            </p>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{ background: COLORS.espressoDeep }}
        className="px-5 py-12"
      >
        <div className="max-w-2xl mx-auto text-center">

          <div className="flex items-center justify-center gap-2.5">

            <LogoMark size={24} />

            <span
              className="font-bold text-lg ff-display"
              style={{ color: COLORS.cream }}
            >
              KENJAV
            </span>

          </div>

          <p
            className="text-sm mt-4 max-w-sm mx-auto"
            style={{
              color:
                'rgba(251,240,220,0.7)',
            }}
          >
            Freshness you can trust. East African artisan
            mandazis prepared daily with love.
          </p>

          <button
            onClick={() => scrollTo(visitRef)}
            className="font-semibold text-sm mt-5 px-5 py-2.5 rounded-full active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{
              background: COLORS.marigold,
              color: COLORS.espresso,
            }}
          >
            Visit Us
          </button>

          <div
            className="mt-8 text-sm"
            style={{
              color:
                'rgba(251,240,220,0.6)',
            }}
          >
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Get Directions
            </a>
          </div>
<div
  className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
  style={{ color: 'rgba(251,240,220,0.55)' }}
>
  <button
    onClick={() => navigate('/privacy')}
    className="hover:underline focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
  >
    Privacy Policy
  </button>

  <button
    onClick={() => navigate('/terms')}
    className="hover:underline focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
  >
    Terms of Service
  </button>
</div>
          <div
            className="mt-5 text-xs"
            style={{
              color:
                'rgba(251,240,220,0.4)',
            }}
          >
            © {new Date().getFullYear()} KENJAV. All rights reserved.
          </div>

        </div>
      </footer>

      {/* CART */}
      <FloatingCart
        count={cartCount}
        onClick={() => setCartOpen(true)}
        bump={bump}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        updateQty={updateQty}
        removeItem={removeItem}
        subtotal={subtotal}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        subtotal={subtotal}
        onSubmit={handlePlaceOrder}
        submitting={submitting}
        error={submitError}
      />

      {/* TOAST */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-lg text-sm font-semibold"
          style={{
            background: COLORS.espresso,
            color: COLORS.cream,
          }}
        >
          {toast}
        </div>
      )}

    </div>
  );
}
