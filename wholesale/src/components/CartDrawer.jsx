import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { money } from '../constants';

export default function CartDrawer({ open, onClose, items, total, onChange, onRemove, onCheckout }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-[#eee0c4] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-[#2a1810]">Wholesale Cart</h2>
            <p className="text-sm muted mt-1">Review your stock order before submitting it.</p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-[#fbf0dc] flex items-center justify-center" aria-label="Close cart">
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!items.length ? (
            <div className="h-full flex flex-col items-center justify-center text-center muted">
              <div className="w-16 h-16 rounded-full bg-[#fbf0dc] flex items-center justify-center mb-4">
                <ShoppingBag size={28} />
              </div>
              <b className="text-[#2a1810]">Your wholesale cart is empty</b>
              <p className="text-sm mt-1">Add products from the catalogue to start an order.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="border-b border-[#eee0c4] pb-4 last:border-0">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#f3dfb0] shrink-0">
                      {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-contain bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <b className="text-[#2a1810] block truncate">{product.name}</b>
                      <span className="text-sm muted">{money(product.wholesale_price_kes)} each</span>
                      <span className="text-xs muted block mt-1">Minimum {product.min_order_quantity}</span>
                    </div>
                    <button type="button" onClick={() => onRemove(product.id)} className="text-[#e0356b] p-1" aria-label={`Remove ${product.name}`}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onChange(product, quantity - Number(product.min_order_quantity))} className="w-9 h-9 rounded-lg bg-[#f3dfb0] flex items-center justify-center"><Minus size={15} /></button>
                      <span className="w-12 text-center font-bold">{quantity}</span>
                      <button type="button" disabled={quantity >= Number(product.stock_quantity)} onClick={() => onChange(product, quantity + Number(product.min_order_quantity))} className="w-9 h-9 rounded-lg bg-[#f3dfb0] flex items-center justify-center disabled:opacity-40"><Plus size={15} /></button>
                    </div>
                    <b className="text-[#2a1810]">{money(Number(product.wholesale_price_kes) * quantity)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-[#eee0c4] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg text-[#2a1810]">Order total</span>
              <span className="font-black text-xl text-[#2a1810]">{money(total)}</span>
            </div>
            <button type="button" onClick={onCheckout} className="btn-primary w-full py-3.5">Review & Place Order</button>
          </div>
        )}
      </aside>
    </div>
  );
}
