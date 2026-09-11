import {useState} from 'react';
import {BrowserRouter,Routes,Route,Navigate,NavLink} from 'react-router-dom';
import {LogOut,Menu,LayoutDashboard,ShoppingBag,ReceiptText,CreditCard,User,Settings,Bell} from 'lucide-react';
import Login from './pages/Login';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import Credit from './pages/Credit';
import Profile from './pages/Profile';
import SettingsPage from './pages/SettingsPage';

const KEY='kenjav_wholesale_session';

function Layout({session,onLogout,children}){
  const [open,setOpen]=useState(false);
  const links=[['/',LayoutDashboard,'Dashboard'],['/products',ShoppingBag,'Products'],['/orders',ReceiptText,'My Orders'],['/payments',CreditCard,'Payments'],['/credit',CreditCard,'Credit / Debt'],['/notifications',Bell,'Notifications'],['/profile',User,'Profile'],['/settings',Settings,'Settings']];
  return <div className="min-h-screen bg-[#fbf0dc] text-[#3d2817]">
    <header className="sticky top-0 z-30 bg-[#2a1810] text-[#fbf0dc]"><div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between"><button className="md:hidden" onClick={()=>setOpen(!open)}><Menu/></button><div className="font-black text-xl">KENJAV <span className="text-[#f0b429]">Wholesale</span></div><div className="hidden md:flex items-center gap-4 text-sm"><span>{session.name}</span><button onClick={onLogout} className="flex gap-1 items-center text-[#f0b429]"><LogOut size={16}/> Logout</button></div></div></header>
    <div className="max-w-6xl mx-auto md:flex"><aside className={`${open?'block':'hidden'} md:block md:w-60 p-4`}><nav className="bg-white rounded-2xl p-2 shadow-sm space-y-1">{links.map(([to,I,label])=><NavLink key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isActive?'bg-[#2a1810] text-[#fbf0dc]':'hover:bg-[#f3dfb0]'}`}><I size={17}/>{label}</NavLink>)}<button onClick={onLogout} className="md:hidden w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"><LogOut size={17}/>Logout</button></nav></aside><main className="flex-1 p-4 md:p-6">{children}</main></div>
  </div>;
}

export default function App(){
  const [session,setSession]=useState(()=>{try{const value=JSON.parse(localStorage.getItem(KEY)||'null');return value?.role==='shopkeeper'?value:null}catch{return null}});
  const save=s=>{localStorage.setItem(KEY,JSON.stringify(s));setSession(s)};
  const logout=()=>{localStorage.removeItem(KEY);setSession(null)};
  if(!session)return <Login onLogin={save}/>;
  return <BrowserRouter><Layout session={session} onLogout={logout}><Routes>
    <Route path="/" element={<ShopkeeperDashboard token={session.token}/>}/>
    <Route path="/products" element={<Products token={session.token}/>}/>
    <Route path="/orders" element={<Orders token={session.token}/>}/>
    <Route path="/payments" element={<Payments token={session.token}/>}/>
    <Route path="/credit" element={<Credit token={session.token}/>}/>
    <Route path="/notifications" element={<Notifications token={session.token}/>}/>
    <Route path="/profile" element={<Profile token={session.token}/>}/>
    <Route path="/settings" element={<SettingsPage token={session.token} onLogout={logout}/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Layout></BrowserRouter>;
}
