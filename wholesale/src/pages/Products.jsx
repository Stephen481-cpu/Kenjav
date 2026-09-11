import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { api } from '../api';
import { money } from '../constants';
import WholesaleProductCard from '../components/WholesaleProductCard';
import CartDrawer from '../components/CartDrawer';
import FloatingCart from '../components/FloatingCart';
import PlaceOrderModal from '../components/PlaceOrderModal';

export default function Products({ token }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.portalProducts(token).then(setProducts).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const cartItems = useMemo(() => products.filter((p) => Number(cart[p.id]) > 0).map((product) => ({ product, quantity: Number(cart[product.id]) })), [products, cart]);
  const total = useMemo(() => cartItems.reduce((sum, x) => sum + Number(x.product.wholesale_price_kes) * x.quantity, 0), [cartItems]);
  const count = cartItems.reduce((sum, x) => sum + x.quantity, 0);

  const setQuantity = (product, value) => {
    const min = Number(product.min_order_quantity) || 1;
    const stock = Number(product.stock_quantity) || 0;
    if (!value || value <= 0) return setCart((c) => { const next = {...c}; delete next[product.id]; return next; });
    const stepped = Math.floor(Number(value) / min) * min;
    const safe = Math.min(stock, Math.max(min, stepped || min));
    setCart((c) => ({ ...c, [product.id]: safe }));
  };

  const add = (product) => setQuantity(product, Math.max(Number(cart[product.id] || 0), Number(product.min_order_quantity) || 1));
  const remove = (id) => setCart((c) => { const next = {...c}; delete next[id]; return next; });

  const placeOrder = async (notes) => {
    setSubmitting(true); setError('');
    try {
      await api.placeOrder(token, { items: cartItems.map(({ product, quantity }) => ({ product_id: product.id, quantity })), notes: notes || undefined });
      setCart({}); setCheckoutOpen(false); setCartOpen(false); setMessage('Order placed successfully. Open My Orders to track its status.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-[#b9791a] font-bold tracking-wide">KENJAV WHOLESALE CATALOGUE</p>
          <h1 className="title">Order Products</h1>
          <p className="muted mt-1">Choose products, set the quantity you need and place your wholesale order.</p>
        </div>
        {count > 0 && <button type="button" onClick={() => setCartOpen(true)} className="btn-primary flex items-center justify-center gap-2"><ShoppingBag size={18}/> View Cart · {count}</button>}
      </div>

      {message && <div className="notice mb-5 flex items-center justify-between gap-3"><span>{message}</span><button type="button" onClick={() => setMessage('')} className="font-bold">×</button></div>}
      {error && !checkoutOpen && <div className="mb-5 rounded-xl border border-[#e0356b]/30 bg-[#fff1f5] p-3 text-sm text-[#e0356b]">{error}</div>}
      {loading ? <div className="panel muted">Loading wholesale products…</div> : products.length === 0 ? <div className="panel muted">No wholesale products are currently available. KENJAV will add products here when they are ready for wholesale ordering.</div> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{products.map((p) => <WholesaleProductCard key={p.id} product={p} quantity={cart[p.id] || 0} onAdd={() => add(p)} onChange={(value) => setQuantity(p, value)} />)}</div>}

      <FloatingCart count={count} total={total} onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cartItems} total={total} onChange={setQuantity} onRemove={remove} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
      <PlaceOrderModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={cartItems} total={total} submitting={submitting} error={error} onSubmit={placeOrder} />
    </div>
  );
}
