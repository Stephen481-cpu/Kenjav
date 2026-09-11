import { AlertTriangle, CheckCircle2, Minus, PackageX, Plus, ShoppingBag } from 'lucide-react';
import ProductImage from './ProductImage';
import { money } from '../constants';

export default function WholesaleProductCard({ product, quantity, onAdd, onChange }) {
  const min = Number(product.min_order_quantity) || 1;
  const stock = Number(product.stock_quantity) || 0;
  const qty = Number(quantity) || 0;
  const inCart = qty > 0;
  const stockStatus = product.stock_status || (stock <= 0 ? 'out_of_stock' : stock <= Number(product.minimum_stock) ? 'low_stock' : 'in_stock');
  const canOrder = stock >= min;
  const status = stockStatus === 'out_of_stock'
    ? { label: 'Out of stock', className: 'bg-[#fff1f5] text-[#e0356b]', Icon: PackageX }
    : stockStatus === 'low_stock'
      ? { label: `Low stock · ${stock} left`, className: 'bg-[#fff4dd] text-[#a96500]', Icon: AlertTriangle }
      : { label: `${stock} in stock`, className: 'bg-[#eef8ed] text-[#267137]', Icon: CheckCircle2 };
  const StatusIcon = status.Icon;

  const decrease = () => {
    if (qty <= min) onChange(0);
    else onChange(Math.max(min, qty - min));
  };

  const increase = () => onChange(Math.min(stock, qty > 0 ? qty + min : min));

  return (
    <article className="bg-white rounded-3xl p-4 shadow-sm flex flex-col h-full">
      <ProductImage product={product} />
      <div className="pt-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-lg text-[#2a1810] leading-tight">{product.name}</h2>
          <span className="badge shrink-0">Wholesale</span>
        </div>
        {product.description && <p className="muted text-sm mt-2 leading-relaxed">{product.description}</p>}
        <div className="flex items-end justify-between gap-3 mt-4">
          <div>
            <p className="text-xl font-black text-[#2a1810]">{money(product.wholesale_price_kes)}</p>
            <p className="text-xs muted mt-1">Minimum order: {min}</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>
            <StatusIcon size={13} /> {status.label}
          </span>
        </div>
      </div>

      {!inCart ? (
        <button type="button" disabled={!canOrder} onClick={onAdd} className="btn-primary mt-4 w-full flex items-center justify-center gap-2 disabled:opacity-50">
          <ShoppingBag size={17} />
          {!canOrder ? 'Out of stock' : `Add ${min} to cart`}
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={decrease} className="w-11 h-11 rounded-xl bg-[#f3dfb0] flex items-center justify-center" aria-label={`Decrease ${product.name}`}>
            <Minus size={18} />
          </button>
          <input
            type="number"
            min={min}
            max={stock}
            step={min}
            value={qty}
            onChange={(event) => {
              const raw = Number(event.target.value);
              if (!Number.isFinite(raw) || raw <= 0) return onChange(0);
              const stepped = Math.floor(raw / min) * min;
              onChange(Math.min(stock, Math.max(min, stepped || min)));
            }}
            className="field text-center font-bold"
            aria-label={`Quantity of ${product.name}`}
          />
          <button type="button" disabled={qty >= stock} onClick={increase} className="w-11 h-11 rounded-xl bg-[#f3dfb0] flex items-center justify-center disabled:opacity-40" aria-label={`Increase ${product.name}`}>
            <Plus size={18} />
          </button>
        </div>
      )}
    </article>
  );
}
