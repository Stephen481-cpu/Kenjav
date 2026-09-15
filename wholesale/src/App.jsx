import { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
} from 'react-router-dom';
import {
  LogOut,
  Menu,
  LayoutDashboard,
  ShoppingBag,
  ReceiptText,
  CreditCard,
  User,
  Settings,
  Bell,
} from 'lucide-react';

import Login from './pages/Login';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Credit from './pages/Credit';
import Profile from './pages/Profile';
import SettingsPage from './pages/SettingsPage';

const KEY = 'kenjav_wholesale_session';

function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );

    return JSON.parse(
      window.atob(padded)
    );
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return true;
  }

  if (!payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);

  return Number(payload.exp) <= now;
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return null;
    }

    const value = JSON.parse(raw);

    if (
      !value ||
      value.role !== 'shopkeeper' ||
      !value.token
    ) {
      localStorage.removeItem(KEY);
      return null;
    }

    if (isTokenExpired(value.token)) {
      localStorage.removeItem(KEY);
      return null;
    }

    return value;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

function Layout({
  session,
  onLogout,
  children,
}) {
  const [open, setOpen] = useState(false);

  const links = [
    ['/', LayoutDashboard, 'Dashboard'],
    ['/products', ShoppingBag, 'Products'],
    ['/orders', ReceiptText, 'My Orders'],
    ['/payments', CreditCard, 'Payments'],
    ['/credit', CreditCard, 'Credit / Debt'],
    ['/notifications', Bell, 'Notifications'],
    ['/profile', User, 'Profile'],
    ['/settings', Settings, 'Settings'],
  ];

  return (
    <div className="min-h-screen bg-[#fbf0dc] text-[#3d2817]">
      <header className="sticky top-0 z-30 bg-[#2a1810] text-[#fbf0dc]">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between">
          <button
            className="md:hidden"
            onClick={() => setOpen(!open)}
            type="button"
          >
            <Menu />
          </button>

          <div className="font-black text-xl">
            KENJAV{' '}
            <span className="text-[#f0b429]">
              Wholesale
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-sm">
            <span>{session.name}</span>

            <button
              onClick={onLogout}
              type="button"
              className="flex gap-1 items-center text-[#f0b429]"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto md:flex">
        <aside
          className={`${open ? 'block' : 'hidden'} md:block md:w-60 p-4`}
        >
          <nav className="bg-white rounded-2xl p-2 shadow-sm space-y-1">
            {links.map(([to, Icon, label]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                    isActive
                      ? 'bg-[#2a1810] text-[#fbf0dc]'
                      : 'hover:bg-[#f3dfb0]'
                  }`
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}

            <button
              onClick={onLogout}
              type="button"
              className="md:hidden w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
            >
              <LogOut size={17} />
              Logout
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(
    getStoredSession
  );

  const save = (newSession) => {
    if (
      !newSession ||
      newSession.role !== 'shopkeeper' ||
      !newSession.token ||
      isTokenExpired(newSession.token)
    ) {
      localStorage.removeItem(KEY);
      setSession(null);
      return;
    }

    localStorage.setItem(
      KEY,
      JSON.stringify(newSession)
    );

    setSession(newSession);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setSession(null);
  };

  if (!session) {
    return <Login onLogin={save} />;
  }

  return (
    <BrowserRouter>
      <Layout
        session={session}
        onLogout={logout}
      >
        <Routes>
          <Route
            path="/"
            element={
              <ShopkeeperDashboard
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/products"
            element={
              <Products
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/orders"
            element={
              <Orders
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/payments"
            element={
              <Payments
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/credit"
            element={
              <Credit
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/notifications"
            element={
              <Notifications
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/profile"
            element={
              <Profile
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="/settings"
            element={
              <SettingsPage
                token={session.token}
                onLogout={logout}
              />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}