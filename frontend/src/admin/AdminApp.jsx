import { useState } from 'react';
import { api } from '../api';
import { COLORS } from '../constants';
import OrdersPanel from './OrdersPanel';
import ProductsPanel from './ProductsPanel';
import OffersPanel from './OffersPanel';
import CustomersPanel from './CustomersPanel';
import WholesalePanel from './WholesalePanel';

const TOKEN_KEY = 'kenjav_admin_token';

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState('orders');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const { token: newToken } = await api.adminLogin(password);
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: COLORS.cream }}>
        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-sm">
          <h1 className="text-2xl font-bold mb-1 ff-display" style={{ color: COLORS.ink }}>
            KENJAV Admin
          </h1>
          <p className="text-sm mb-6" style={{ color: COLORS.muted }}>
            Sign in to manage orders, products and offers.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-2.5 rounded-xl border mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          {loginError && (
            <p className="text-sm mb-3" style={{ color: COLORS.flamingo }}>
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full font-semibold py-3 rounded-full disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ background: COLORS.espresso, color: COLORS.cream }}
          >
            {loggingIn ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.cream }}>
      <header className="flex items-center justify-between px-5 h-16" style={{ background: COLORS.espresso }}>
        <span className="font-bold text-lg ff-display" style={{ color: COLORS.cream }}>
          KENJAV Admin
        </span>
        <button onClick={logout} className="text-sm font-semibold focus:outline-none" style={{ color: COLORS.marigoldLight }}>
          Log Out
        </button>
      </header>
      <div className="max-w-6xl mx-auto px-5 py-6">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-6 w-full max-w-full">
         {['orders', 'products', 'offers', 'customers', 'wholesale'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="min-w-0 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={tab === t ? { background: COLORS.espresso, color: COLORS.cream } : { background: '#fff', color: COLORS.ink }}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'orders' && <OrdersPanel token={token} onAuthError={logout} />}
        {tab === 'products' && <ProductsPanel token={token} onAuthError={logout} />}
        {tab === 'offers' && <OffersPanel token={token} onAuthError={logout} />}
        {tab === 'customers' && <CustomersPanel token={token} onAuthError={logout} />}
        {tab === 'wholesale' && <WholesalePanel token={token} onAuthError={logout} />}
      </div>
    </div>
  );
}
