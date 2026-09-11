import {useState} from 'react';
import {api} from '../api';

export default function Login({onLogin}) {
  const [mode,setMode]=useState('login');
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [location,setLocation]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const submit=async e=>{
    e.preventDefault(); setBusy(true); setError('');
    try {
      let d;
      if(mode==='register') {
        if(password!==confirm) throw new Error('Passwords do not match.');
        d=await api.shopkeeperRegister({name,phone,location,password});
      } else {
        d=await api.shopkeeperLogin(phone,password);
      }
      onLogin({token:d.token,role:'shopkeeper',name:d.shopkeeper?.name||name});
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#fbf0dc] flex items-center justify-center p-4">
    <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-7 shadow-lg">
      <div className="text-center mb-7">
        <div className="text-3xl font-black text-[#2a1810]">KENJAV</div>
        <div className="text-[#e2971d] font-bold">Wholesale Portal</div>
        <p className="text-sm text-[#6b5744] mt-2">{mode==='register'?'Create your shopkeeper account':'Sign in to your shopkeeper account'}</p>
      </div>
      {mode==='register' && <>
        <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name / shop name" className="field mb-3"/>
        <input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number" className="field mb-3"/>
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Shop location (optional)" className="field mb-3"/>
      </>}
      {mode==='login' && <input required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number" className="field mb-3"/>}
      <input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="field mb-3"/>
      {mode==='register' && <input required minLength={6} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" className="field mb-3"/>}
      {error&&<p className="text-sm text-[#e0356b] mb-3">{error}</p>}
      <button disabled={busy} className="w-full py-3 rounded-xl bg-[#2a1810] text-[#fbf0dc] font-bold disabled:opacity-60">{busy?(mode==='register'?'Creating account…':'Signing in…'):(mode==='register'?'Create Account':'Sign In')}</button>
      <button type="button" onClick={()=>{setMode(mode==='register'?'login':'register');setError('')}} className="w-full mt-3 py-2 text-sm font-semibold text-[#b9791a]">{mode==='register'?'Already have an account? Sign in':'New shopkeeper? Create an account'}</button>
    </form>
  </div>;
}
