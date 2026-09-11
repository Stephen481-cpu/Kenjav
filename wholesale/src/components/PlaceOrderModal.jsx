import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { money } from '../constants';

export default function PlaceOrderModal({ open, onClose, items, total, submitting, error, onSubmit }) {
  const [notes, setNotes] = useState('');
  useEffect(() => { if (open) setNotes(''); }, [open]);
  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSubmit(notes);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div onClick={() => !submitting && onClose()} className="absolute inset-0 bg-black/50" />
      <form onSubmit={submit} className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-[#eee0c4] flex items-center justify-between shrink-0">
          <div><h2 className="text-xl font-black text-[#2a1810]">Place Wholesale Order</h2><p className="text-sm muted mt-1">Confirm the products and quantity.</p></div>
          <button type="button" disabled={submitting} onClick={onClose} className="w-10 h-10 rounded-full bg-[#fbf0dc] flex items-center justify-center"><X size={18}/></button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="space-y-2">
            {items.map(({product,quantity}) => <div key={product.id} className="flex justify-between gap-4 py-2 border-b border-[#eee0c4] last:border-0"><span><b>{product.name}</b><small className="block muted">{quantity} × {money(product.wholesale_price_kes)}</small></span><b>{money(quantity * Number(product.wholesale_price_kes))}</b></div>)}
          </div>
          <div className="flex items-center justify-between mt-4 p-4 rounded-2xl bg-[#fbf0dc]"><span className="font-bold">Total</span><b className="text-xl">{money(total)}</b></div>
          <label className="block mt-5 text-sm font-bold text-[#2a1810]">Order notes (optional)<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anything KENJAV should know about this order?" className="field mt-2 min-h-24" /></label>
          {error && <div className="mt-4 rounded-xl border border-[#e0356b]/30 bg-[#fff1f5] p-3 text-sm text-[#e0356b]">{error}</div>}
          <p className="text-xs muted mt-4">Your order will be sent to KENJAV for approval. You can track its status under My Orders.</p>
        </div>
        <div className="p-5 border-t border-[#eee0c4] shrink-0"><button disabled={submitting} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">{submitting ? <><Loader2 size={18} className="animate-spin"/> Placing order…</> : 'Confirm & Place Order'}</button></div>
      </form>
    </div>
  );
}
