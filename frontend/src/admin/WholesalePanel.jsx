import { useEffect, useState } from 'react';
import { api } from '../api';
import { COLORS, money } from '../constants';

const blankProduct = {
  product_id: '',
  wholesale_price_kes: '',
  min_order_quantity: 1,
  stock_quantity: 0,
  minimum_stock: 10
};

const statusStyles = {
  in_stock: ['In stock', '#dcfce7', '#166534'],
  low_stock: ['Low stock', '#fef3c7', '#92400e'],
  out_of_stock: ['Out of stock', '#fee2e2', '#b91c1c']
};

const getStatus = p =>
  p.stock_status ||
  (
    Number(p.stock_quantity) === 0
      ? 'out_of_stock'
      : Number(p.stock_quantity) <= Number(p.minimum_stock)
        ? 'low_stock'
        : 'in_stock'
  );

const todayNairobi = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

export default function WholesalePanel({ token, onAuthError }) {
  const [tab, setTab] = useState('dashboard');

  const [shopkeepers, setShopkeepers] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [mainProducts, setMainProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [report, setReport] = useState(null);

  const [productForm, setProductForm] = useState(blankProduct);
  const [stockEditor, setStockEditor] = useState(null);
  const [history, setHistory] = useState(null);

  const [message, setMessage] = useState('');
const [error, setError] = useState('');

const [reportDate, setReportDate] = useState(
  todayNairobi()
);

const [reportMonth, setReportMonth] = useState(
  todayNairobi().slice(0, 7)
);

const [monthlyReport, setMonthlyReport] = useState(null);

const [expenseForm, setExpenseForm] = useState({
  amount_kes: '',
  category: '',
  description: '',
  expense_date: todayNairobi()
});

const [expenses, setExpenses] = useState([]);
const [manualSales, setManualSales] = useState([]);

const [manualSaleForm, setManualSaleForm] = useState({
  customer_type: 'walk_in',
  shopkeeper_id: '',
  wholesale_product_id: '',
  product_name: '',
  quantity: '',
  amount_kes: '',
  payment_method: '',
  sale_period: '',
  sale_date: todayNairobi(),
  notes: ''
});
  

  const load = async () => {
  try {
    setError('');

    const [
      s,
      p,
      i,
      o,
      pa,
      r,
      mp,
      mr,
      ex,
      ms
    ] = await Promise.all([
      api.adminGetShopkeepers(token),
      api.adminGetWholesaleProducts(token),
      api.adminGetWholesaleInventory(token),
      api.adminGetWholesaleOrders(token),
      api.adminGetWholesalePayments(token),
      api.adminGetWholesaleReport(token, reportDate),
      api.getProducts(),
      api.adminGetWholesaleMonthlyReport(
        token,
        reportMonth
      ),
      api.adminGetWholesaleExpenses(
        token,
        reportDate
      ),
      api.adminGetManualSales(
        token,
        reportDate
      )
    ]);

    setShopkeepers(s);
    setProducts(p);
    setInventory(i);
    setOrders(o);
    setPayments(pa);
    setReport(r);
    setMainProducts(mp);
    setMonthlyReport(mr);
    setExpenses(ex);
    setManualSales(ms);

  } catch (e) {
    if (
      /session|authorization|token|expired|401/i.test(
        e.message
      )
    ) {
      onAuthError?.();
    } else {
      setError(e.message);
    }
  }
};

  useEffect(() => {
    load();
  }, [token]);

  /*
    Update wholesale product.

    stock_reason is sent to the backend whenever
    the stock is manually changed.
  */
  const updateProduct = (p, values) =>
    api.adminUpdateWholesaleProduct(token, p.id, {
      wholesale_price_kes: Number(values.wholesale_price_kes),
      min_order_quantity: Number(values.min_order_quantity),
      stock_quantity: Number(values.stock_quantity),
      minimum_stock: Number(values.minimum_stock),
      is_active: p.is_active,
      stock_reason: values.stock_reason || ''
    });

  const createProduct = async e => {
    e.preventDefault();

    try {
      await api.adminCreateWholesaleProduct(token, {
        ...productForm,
        stock_quantity: Number(productForm.stock_quantity),
        minimum_stock: Number(productForm.minimum_stock)
      });

      setProductForm(blankProduct);
      setMessage('Wholesale product added.');
      load();

    } catch (e) {
      setError(e.message);
    }
  };

  const editProduct = async p => {
    const price = window.prompt(
      'Wholesale price (KES)',
      p.wholesale_price_kes
    );

    if (price === null) return;

    const minimum = window.prompt(
      'Low-stock threshold',
      p.minimum_stock ?? 10
    );

    if (minimum === null) return;

    try {
      await updateProduct(p, {
        ...p,
        wholesale_price_kes: price,
        minimum_stock: minimum
      });

      setMessage('Product settings updated.');
      load();

    } catch (e) {
      setError(e.message);
    }
  };

  /*
    Add or remove stock.

    A reason is mandatory for every manual stock movement.
  */
  const changeStock = async e => {
    e.preventDefault();

    const {
      product,
      mode,
      value,
      reason
    } = stockEditor;

    const amount = Number(value);
    const currentStock = Number(product.stock_quantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      return setError(
        'Enter a positive whole number.'
      );
    }

    if (!reason || !reason.trim()) {
      return setError(
        'Enter a reason for the stock movement.'
      );
    }

    const target =
      mode === 'restock'
        ? currentStock + amount
        : currentStock - amount;

    if (target < 0) {
      return setError(
        `Cannot remove ${amount} units. Only ${currentStock} units are available.`
      );
    }

    try {
      await updateProduct(product, {
        ...product,
        stock_quantity: target,
        stock_reason: reason.trim()
      });

      setStockEditor(null);

      setMessage(
        mode === 'restock'
          ? `${amount} units added to ${product.name}.`
          : `${amount} units removed from ${product.name}.`
      );

      await load();

    } catch (e) {
      setError(e.message);
    }
  };

  const showHistory = async product => {
    try {
      setHistory({
        product,
        movements: await api.adminGetWholesaleInventoryHistory(
          token,
          product.id
        )
      });

    } catch (e) {
      setError(e.message);
    }
  };

  const updateOrder = async (id, status) => {
    try {
      await api.adminUpdateWholesaleOrder(
        token,
        id,
        status
      );

      load();

    } catch (e) {
      setError(e.message);
    }
  };

  const createManualSale = async e => {
    e.preventDefault();
    setError('');
    setMessage('');

    const amount = Number(manualSaleForm.amount_kes);
    const quantity = manualSaleForm.quantity === '' ? null : Number(manualSaleForm.quantity);
    const hasProduct = !!manualSaleForm.wholesale_product_id;

    if (!Number.isFinite(amount) || amount <= 0) {
      return setError('Enter a valid sale amount.');
    }

    if (!manualSaleForm.sale_date) {
      return setError('Select the sale date.');
    }

    if (manualSaleForm.customer_type === 'shopkeeper' && !manualSaleForm.shopkeeper_id) {
      return setError('Select the shopkeeper for this offline sale.');
    }

    if (hasProduct && (!Number.isInteger(quantity) || quantity < 1)) {
      return setError('Enter the quantity when selecting a catalogue product.');
    }

    if (!hasProduct && quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) {
      return setError('Quantity must be a positive whole number when provided.');
    }

    try {
      await api.adminCreateManualSale(token, {
        customer_type: manualSaleForm.customer_type,
        shopkeeper_id: manualSaleForm.shopkeeper_id || undefined,
        wholesale_product_id: manualSaleForm.wholesale_product_id || undefined,
        product_name: manualSaleForm.product_name.trim() || undefined,
        quantity: quantity === null ? undefined : quantity,
        amount_kes: amount,
        payment_method: manualSaleForm.payment_method || undefined,
        sale_period: manualSaleForm.sale_period || undefined,
        sale_date: manualSaleForm.sale_date,
        notes: manualSaleForm.notes.trim() || undefined
      });

      setManualSaleForm({
        customer_type: 'walk_in',
        shopkeeper_id: '',
        wholesale_product_id: '',
        product_name: '',
        quantity: '',
        amount_kes: '',
        payment_method: '',
        sale_period: '',
        sale_date: manualSaleForm.sale_date || todayNairobi(),
        notes: ''
      });

      setMessage('Manual / offline sale recorded successfully.');
      await load();
    } catch (e) {
      if (/401|authorization|token|expired/i.test(e.message || '')) onAuthError?.();
      else setError(e.message);
    }
  };

  const deleteManualSale = async id => {
    if (!window.confirm('Delete this manual/offline sale? If stock was deducted, it will be restored.')) return;

    try {
      await api.adminDeleteManualSale(token, id);
      setMessage('Manual / offline sale deleted successfully.');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

const updatePayment = async (id, status) => {
    try {
      await api.adminUpdateWholesalePayment(
        token,
        id,
        status
      );

      load();

    } catch (e) {
      setError(e.message);
    }
  };
const createExpense = async e => {
  e.preventDefault();

  try {
    const amount = Number(
      expenseForm.amount_kes
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      setError(
        'Enter a valid expense amount.'
      );
      return;
    }

    if (!expenseForm.category.trim()) {
      setError(
        'Enter an expense category.'
      );
      return;
    }

    await api.adminCreateWholesaleExpense(
      token,
      {
        amount_kes: amount,
        category: expenseForm.category.trim(),
        description:
          expenseForm.description.trim(),
        expense_date:
          expenseForm.expense_date
      }
    );

    setExpenseForm({
      amount_kes: '',
      category: '',
      description: '',
      expense_date: reportDate
    });

    setMessage(
      'Expense recorded successfully.'
    );

    await load();

  } catch (e) {
    setError(e.message);
  }
};

const deleteExpense = async id => {
  const confirmed = window.confirm(
    'Delete this expense record?'
  );

  if (!confirmed) return;

  try {
    await api.adminDeleteWholesaleExpense(
      token,
      id
    );

    setMessage(
      'Expense deleted successfully.'
    );

    await load();

  } catch (e) {
    setError(e.message);
  }
};
  const updateKeeper = async s => {
    const nextActive = !s.is_active;
    let deactivationReason = '';

    if (!nextActive) {
      deactivationReason = window.prompt(
        'Reason for deactivating this shopkeeper:',
        ''
      );
      if (deactivationReason === null) return;
      if (!deactivationReason.trim()) {
        return setError('A reason is required when deactivating a shopkeeper.');
      }
    }

    try {
      await api.adminUpdateShopkeeper(
        token,
        s.id,
        {
          name: s.name,
          phone: s.phone,
          location: s.location,
          credit_limit_kes: s.credit_limit_kes,
          is_active: nextActive,
          deactivation_reason: deactivationReason.trim()
        }
      );

      setMessage(nextActive ? 'Shopkeeper activated.' : 'Shopkeeper deactivated.');
      await load();

    } catch (e) {
      setError(e.message);
    }
  };

  const alerts = inventory.filter(
    p => getStatus(p) !== 'in_stock'
  );

  const tabs = [
    'dashboard',
    'shopkeepers',
    'products',
    'inventory',
    'orders',
    'payments',
    'manual-sales',
    'report'
  ];

  return (
    <section>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p
            className="text-xs font-bold"
            style={{ color: COLORS.eyebrow }}
          >
            WHOLESALE
          </p>

          <h2
            className="text-2xl font-black"
            style={{ color: COLORS.ink }}
          >
            Wholesale Management
          </h2>

          <p
            className="text-sm"
            style={{ color: COLORS.muted }}
          >
            Shopkeepers use the separate Wholesale Portal; you manage everything here.
          </p>
        </div>
      </div>

      {(message || error) && (
        <div
          className="mb-4 p-3 rounded-xl text-sm"
          style={{
            background: '#fff',
            border: `1px solid ${
              error ? '#e0356b' : '#f0b429'
            }`,
            color: error
              ? '#e0356b'
              : COLORS.muted
          }}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-5 w-full max-w-full">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="min-w-0 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold capitalize"
            style={
              tab === t
                ? {
                    background: COLORS.espresso,
                    color: COLORS.cream
                  }
                : {
                    background: '#fff',
                    color: COLORS.ink
                  }
            }
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card
            title="Shopkeepers"
            value={shopkeepers.length}
          />

          <Card
            title="Outstanding debt"
            value={money(
              shopkeepers.reduce(
                (s, x) =>
                  s +
                  Math.max(
                    0,
                    Number(x.balance_kes || 0)
                  ),
                0
              )
            )}
          />

          <Card
            title="Pending payments"
            value={payments.length}
          />

          <Card
            title="Wholesale products"
            value={products.length}
          />

          <Card
            title="Stock alerts"
            value={alerts.length}
          />

          <Card
            title="Pending orders"
            value={
              orders.filter(
                x => x.status === 'pending'
              ).length
            }
          />
        </div>
      )}

      {tab === 'shopkeepers' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm">

          <h3 className="font-bold text-lg mb-2">
            Registered shopkeepers
          </h3>

          {shopkeepers.length ? (
            shopkeepers.map(s => (
              <div
                key={s.id}
                className="py-4 border-b last:border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <b>{s.name}</b>

                  <small
                    className="block"
                    style={{ color: COLORS.muted }}
                  >
                    {s.phone} ·{' '}
                    {s.location || 'No location'} ·
                    Debt {money(s.balance_kes)}
                  </small>
                </div>

                <div className="flex gap-2">

                  <button
                    onClick={async () => {
                      const v = window.prompt(
                        'Credit limit (KES)',
                        s.credit_limit_kes
                      );

                      if (v === null) return;

                      try {
                        await api.adminUpdateShopkeeper(
                          token,
                          s.id,
                          {
                            ...s,
                            credit_limit_kes:
                              Number(v)
                          }
                        );

                        load();

                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border text-sm font-semibold"
                  >
                    Credit Limit
                  </button>

                  <button
                    onClick={() => updateKeeper(s)}
                    className="px-3 py-1.5 rounded-lg border text-sm font-semibold"
                  >
                    {s.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </button>

                </div>
              </div>
            ))
          ) : (
            <Empty text="No shopkeepers have registered yet." />
          )}

        </div>
      )}

      {tab === 'products' && (
        <div className="grid lg:grid-cols-2 gap-5">

          <form
            onSubmit={createProduct}
            className="bg-white rounded-3xl p-5 shadow-sm space-y-3"
          >
            <h3 className="font-bold text-lg">
              Add wholesale product
            </h3>

            <select
              required
              value={productForm.product_id}
              onChange={e =>
                setProductForm({
                  ...productForm,
                  product_id: e.target.value
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border"
            >
              <option value="">
                Select KENJAV product
              </option>

              {mainProducts.map(p => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name} — retail{' '}
                  {money(p.price_kes)}
                </option>
              ))}
            </select>

            <Input
              label="Wholesale price (KES)"
              value={
                productForm.wholesale_price_kes
              }
              onChange={v =>
                setProductForm({
                  ...productForm,
                  wholesale_price_kes: v
                })
              }
              step="0.01"
            />

            <Input
              label="Minimum order quantity"
              value={
                productForm.min_order_quantity
              }
              onChange={v =>
                setProductForm({
                  ...productForm,
                  min_order_quantity: v
                })
              }
              min="1"
            />

            <Input
              label="Opening stock"
              value={productForm.stock_quantity}
              onChange={v =>
                setProductForm({
                  ...productForm,
                  stock_quantity: v
                })
              }
            />

            <Input
              label="Low-stock threshold"
              value={productForm.minimum_stock}
              onChange={v =>
                setProductForm({
                  ...productForm,
                  minimum_stock: v
                })
              }
            />

            <button
              className="w-full font-semibold py-3 rounded-xl"
              style={{
                background: COLORS.espresso,
                color: COLORS.cream
              }}
            >
              Add Wholesale Product
            </button>

          </form>

          <div className="bg-white rounded-3xl p-5 shadow-sm">

            <h3 className="font-bold text-lg mb-2">
              Wholesale catalogue
            </h3>

            {products.length ? (
              products.map(p => (
                <div
                  key={p.id}
                  className="py-3 border-b last:border-b-0 flex items-center justify-between gap-3"
                >
                  <div>
                    <b>{p.name}</b>

                    <small
                      className="block"
                      style={{
                        color: COLORS.muted
                      }}
                    >
                      {money(
                        p.wholesale_price_kes
                      )} · Order minimum{' '}
                      {p.min_order_quantity} ·
                      Low-stock level{' '}
                      {p.minimum_stock ?? 10}
                    </small>
                  </div>

                  <button
                    onClick={() =>
                      editProduct(p)
                    }
                    className="px-3 py-1.5 rounded-lg border text-sm font-semibold"
                  >
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <Empty text="No wholesale products configured." />
            )}

          </div>

        </div>
      )}

      {tab === 'inventory' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm">

          <div className="mb-4">
            <h3 className="font-bold text-lg">
              Inventory
            </h3>

            <p
              className="text-sm"
              style={{ color: COLORS.muted }}
            >
              Add or remove stock with a reason. Every movement is saved to history.
            </p>
          </div>

          {inventory.length ? (
            <div className="space-y-3">

              {inventory.map(p => (
                <Inventory
                  key={p.id}
                  product={p}

                  onRestock={() =>
                    setStockEditor({
                      product: p,
                      mode: 'restock',
                      value: '',
                      reason: ''
                    })
                  }

                  onAdjust={() =>
                    setStockEditor({
                      product: p,
                      mode: 'remove',
                      value: '',
                      reason: ''
                    })
                  }

                  onHistory={() =>
                    showHistory(p)
                  }
                />
              ))}

            </div>
          ) : (
            <Empty text="No wholesale products configured." />
          )}

        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">

          {orders.length ? (
            orders.map(o => (
              <div
                key={o.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex justify-between gap-3">

                  <div>
                    <b>
                      Order #{o.id} ·{' '}
                      {o.shopkeeper_name}
                    </b>

                    <p
                      className="text-sm"
                      style={{
                        color: COLORS.muted
                      }}
                    >
                      {o.shopkeeper_phone}
                    </p>
                  </div>

                  <b>
                    {money(o.total_kes)}
                  </b>

                </div>

                <select
                  value={o.status}
                  onChange={e =>
                    updateOrder(
                      o.id,
                      e.target.value
                    )
                  }
                  className="mt-3 w-full px-4 py-2.5 rounded-xl border"
                >
                  {[
                    'pending',
                    'approved',
                    'processing',
                    'ready',
                    'completed',
                    'cancelled'
                  ].map(x => (
                    <option key={x}>
                      {x}
                    </option>
                  ))}
                </select>

              </div>
            ))
          ) : (
            <Empty text="No wholesale orders." />
          )}

        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">

          {payments.length ? (
            payments.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >

                <div className="flex justify-between gap-3">

                  <div>
                    <b>{p.shopkeeper_name}</b>

                    <small
                      className="block"
                      style={{
                        color: COLORS.muted
                      }}
                    >
                      {p.phone} · {p.method} ·{' '}
                      {p.reference ||
                        'No reference'}
                    </small>
                  </div>

                  <b>
                    {money(p.amount_kes)}
                  </b>

                </div>

                <div className="mt-3 flex gap-2">

                  <button
                    className="px-4 py-2 rounded-xl font-semibold"
                    style={{
                      background:
                        COLORS.espresso,
                      color:
                        COLORS.cream
                    }}
                    onClick={() =>
                      updatePayment(
                        p.id,
                        'confirmed'
                      )
                    }
                  >
                    Confirm
                  </button>

                  <button
                    className="px-4 py-2 rounded-xl border"
                    onClick={() =>
                      updatePayment(
                        p.id,
                        'rejected'
                      )
                    }
                  >
                    Reject
                  </button>

                </div>

              </div>
            ))
          ) : (
            <Empty text="No pending payment requests." />
          )}

        </div>
      )}

      {tab === 'manual-sales' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={createManualSale} className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-lg">Record Manual / Offline Sale</h3>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                Record any sale made outside the website or shopkeeper portal. The sale amount is the only required core detail; add other information only when you have it.
              </p>
            </div>

            <label className="block">
              <span className="block text-sm font-semibold mb-1">Customer type</span>
              <select value={manualSaleForm.customer_type} onChange={e => setManualSaleForm({ ...manualSaleForm, customer_type: e.target.value, shopkeeper_id: e.target.value === 'shopkeeper' ? manualSaleForm.shopkeeper_id : '' })} className="w-full px-4 py-2.5 rounded-xl border">
                <option value="walk_in">Walk-in customer</option>
                <option value="shopkeeper">Shopkeeper</option>
                <option value="other">Other</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </label>

            {manualSaleForm.customer_type === 'shopkeeper' && (
              <label className="block">
                <span className="block text-sm font-semibold mb-1">Shopkeeper</span>
                <select required value={manualSaleForm.shopkeeper_id} onChange={e => setManualSaleForm({ ...manualSaleForm, shopkeeper_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border">
                  <option value="">Select shopkeeper</option>
                  {shopkeepers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>)}
                </select>
                <span className="block text-xs mt-1" style={{ color: COLORS.muted }}>This offline sale will be included in this shopkeeper's balance.</span>
              </label>
            )}

            <Input label="Sale amount (KES) *" value={manualSaleForm.amount_kes} onChange={v => setManualSaleForm({ ...manualSaleForm, amount_kes: v })} min="0.01" step="0.01" />

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-semibold mb-1">Sale period (optional)</span>
                <select value={manualSaleForm.sale_period} onChange={e => setManualSaleForm({ ...manualSaleForm, sale_period: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border">
                  <option value="">Not specified</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="all_day">All day</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-sm font-semibold mb-1">Payment method (optional)</span>
                <select value={manualSaleForm.payment_method} onChange={e => setManualSaleForm({ ...manualSaleForm, payment_method: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border">
                  <option value="">Not specified</option>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="block text-sm font-semibold mb-1">Sale date</span>
              <input required type="date" value={manualSaleForm.sale_date} onChange={e => setManualSaleForm({ ...manualSaleForm, sale_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border" />
            </label>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h4 className="font-bold">Optional product details</h4>
                <p className="text-xs" style={{ color: COLORS.muted }}>Leave these blank when you only know the total amount. If you select a catalogue product, quantity is required and stock will be deducted.</p>
              </div>

              <label className="block">
                <span className="block text-sm font-semibold mb-1">KENJAV wholesale product (optional)</span>
                <select value={manualSaleForm.wholesale_product_id} onChange={e => {
                  const value = e.target.value;
                  const product = inventory.find(p => String(p.id) === value);
                  setManualSaleForm({
                    ...manualSaleForm,
                    wholesale_product_id: value,
                    product_name: value ? (product?.name || manualSaleForm.product_name) : manualSaleForm.product_name
                  });
                }} className="w-full px-4 py-2.5 rounded-xl border">
                  <option value="">No catalogue product</option>
                  {inventory.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — {money(p.wholesale_price_kes)} · {p.stock_quantity} in stock</option>)}
                </select>
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Product name (optional)" value={manualSaleForm.product_name} onChange={v => setManualSaleForm({ ...manualSaleForm, product_name: v })} />
                <Input label="Quantity (optional)" value={manualSaleForm.quantity} onChange={v => setManualSaleForm({ ...manualSaleForm, quantity: v })} min="1" step="1" />
              </div>
            </div>

            <label className="block">
              <span className="block text-sm font-semibold mb-1">Notes (optional)</span>
              <textarea value={manualSaleForm.notes} onChange={e => setManualSaleForm({ ...manualSaleForm, notes: e.target.value })} placeholder="e.g. Morning sales, mixed products, customer paid in cash" className="w-full px-4 py-2.5 rounded-xl border min-h-24 resize-y" />
            </label>

            <button type="submit" className="w-full py-3 rounded-xl font-semibold" style={{ background: COLORS.espresso, color: COLORS.cream }}>Record Manual / Offline Sale</button>
          </form>

          <div className="space-y-5">
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-lg">Manual / Offline Sales</h3>
                  <p className="text-sm" style={{ color: COLORS.muted }}>{reportDate}</p>
                </div>
                <b>{money(manualSales.reduce((total, sale) => total + Number(sale.amount_kes), 0))}</b>
              </div>

              {manualSales.length ? (
                <div className="space-y-3">
                  {manualSales.map(sale => (
                    <div key={sale.id} className="border rounded-xl p-3">
                      <div className="flex justify-between gap-3">
                        <div>
                          <b>{money(sale.amount_kes)}</b>
                          <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
                            {sale.customer_type === 'shopkeeper' ? `Shopkeeper: ${sale.shopkeeper_name || 'Unknown'}` : sale.customer_type === 'walk_in' ? 'Walk-in customer' : sale.customer_type === 'other' ? 'Other customer' : 'Customer not specified'}
                          </p>
                          {(sale.product_name || sale.catalogue_product_name) && <p className="text-sm">{sale.product_name || sale.catalogue_product_name}{sale.quantity ? ` × ${sale.quantity}` : ''}</p>}
                          {(sale.sale_period || sale.payment_method) && <p className="text-xs mt-1" style={{ color: COLORS.muted }}>{[sale.sale_period, sale.payment_method].filter(Boolean).join(' · ')}</p>}
                          {sale.notes && <p className="text-sm mt-1" style={{ color: COLORS.muted }}>{sale.notes}</p>}
                        </div>
                        <button onClick={() => deleteManualSale(sale.id)} className="text-sm font-semibold" style={{ color: '#b91c1c' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="No manual/offline sales recorded for this date." />
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <h3 className="font-bold text-lg mb-2">Flexible recording</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: COLORS.muted }}>
                <li>You can record only the total amount, such as KSh 5,000 for the morning.</li>
                <li>You can optionally identify the customer as a walk-in, shopkeeper, other or unspecified.</li>
                <li>For a shopkeeper, the offline sale is added to that shopkeeper's outstanding balance.</li>
                <li>You can optionally add a product and quantity; catalogue products reduce stock and create an inventory audit entry.</li>
                <li>Sales recorded here are included in daily and monthly sales totals.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'report' && (
  <div className="space-y-5">

    <div className="bg-white rounded-3xl p-5 shadow-sm">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">

        <div>
          <h3 className="font-bold text-lg">
            Financial Reports
          </h3>

          <p
            className="text-sm"
            style={{
              color: COLORS.muted
            }}
          >
            Track daily sales, expenses and monthly profit.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">

          <label className="text-sm font-semibold">
            Daily report

            <input
              type="date"
              value={reportDate}
              onChange={async e => {
                const value = e.target.value;

                setReportDate(value);

                try {
                  const [
                    daily,
                    dailyExpenses,
                    dailyManualSales
                  ] = await Promise.all([
                    api.adminGetWholesaleReport(
                      token,
                      value
                    ),
                    api.adminGetWholesaleExpenses(
                      token,
                      value
                    ),
                    api.adminGetManualSales(
                      token,
                      value
                    )
                  ]);

                  setReport(daily);
                  setExpenses(dailyExpenses);
                  setManualSales(dailyManualSales);

                } catch (err) {
                  setError(err.message);
                }
              }}
              className="block mt-1 px-3 py-2 rounded-xl border"
            />
          </label>

          <label className="text-sm font-semibold">
            Monthly report

            <input
              type="month"
              value={reportMonth}
              onChange={async e => {
                const value = e.target.value;

                setReportMonth(value);

                try {
                  const monthly =
                    await api.adminGetWholesaleMonthlyReport(
                      token,
                      value
                    );

                  setMonthlyReport(monthly);

                } catch (err) {
                  setError(err.message);
                }
              }}
              className="block mt-1 px-3 py-2 rounded-xl border"
            />
          </label>

        </div>

      </div>

    </div>


    {report && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card
          title="Today's sales"
          value={money(
            report.todays_sales_kes
          )}
        />

        <Card
          title="Today's expenses"
          value={money(
            report.todays_expenses_kes
          )}
        />

        <Card
          title="Today's profit"
          value={money(
            report.todays_profit_kes
          )}
        />

        <Card
          title="Today's payments"
          value={money(
            report.todays_payments_kes
          )}
        />

      </div>
    )}


    {monthlyReport && (
      <div className="bg-white rounded-3xl p-5 shadow-sm">

        <h3 className="font-bold text-lg mb-4">
          Monthly Financial Summary
        </h3>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card
            title="Monthly sales"
            value={money(
              monthlyReport.total_sales_kes
            )}
          />

          <Card
            title="Monthly expenses"
            value={money(
              monthlyReport.total_expenses_kes
            )}
          />

          <Card
            title="Monthly profit"
            value={money(
              monthlyReport.total_profit_kes
            )}
          />

          <Card
            title="Payments received"
            value={money(
              monthlyReport.total_payments_kes
            )}
          />

        </div>

      </div>
    )}


    <div className="grid lg:grid-cols-2 gap-5">

      <form
        onSubmit={createExpense}
        className="bg-white rounded-3xl p-5 shadow-sm space-y-4"
      >

        <div>
          <h3 className="font-bold text-lg">
            Record Daily Expense
          </h3>

          <p
            className="text-sm"
            style={{
              color: COLORS.muted
            }}
          >
            Record business expenses to calculate accurate profit.
          </p>
        </div>

        <label className="block">

          <span className="block text-sm font-semibold mb-1">
            Amount (KES)
          </span>

          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={
              expenseForm.amount_kes
            }
            onChange={e =>
              setExpenseForm({
                ...expenseForm,
                amount_kes:
                  e.target.value
              })
            }
            className="w-full px-4 py-2.5 rounded-xl border"
          />

        </label>


        <label className="block">

          <span className="block text-sm font-semibold mb-1">
            Category
          </span>

          <select
            required
            value={
              expenseForm.category
            }
            onChange={e =>
              setExpenseForm({
                ...expenseForm,
                category:
                  e.target.value
              })
            }
            className="w-full px-4 py-2.5 rounded-xl border"
          >
            <option value="">
              Select category
            </option>

            <option value="Transport">
              Transport
            </option>

            <option value="Supplies">
              Supplies
            </option>

            <option value="Packaging">
              Packaging
            </option>

            <option value="Utilities">
              Utilities
            </option>

            <option value="Rent">
              Rent
            </option>

            <option value="Wages">
              Wages
            </option>

            <option value="Maintenance">
              Maintenance
            </option>

            <option value="Marketing">
              Marketing
            </option>

            <option value="Other">
              Other
            </option>

          </select>

        </label>


        <label className="block">

          <span className="block text-sm font-semibold mb-1">
            Description
          </span>

          <textarea
            value={
              expenseForm.description
            }
            onChange={e =>
              setExpenseForm({
                ...expenseForm,
                description:
                  e.target.value
              })
            }
            placeholder="e.g. Transport for supplier delivery"
            className="w-full px-4 py-2.5 rounded-xl border min-h-24"
          />

        </label>


        <label className="block">

          <span className="block text-sm font-semibold mb-1">
            Expense date
          </span>

          <input
            required
            type="date"
            value={
              expenseForm.expense_date
            }
            onChange={e =>
              setExpenseForm({
                ...expenseForm,
                expense_date:
                  e.target.value
              })
            }
            className="w-full px-4 py-2.5 rounded-xl border"
          />

        </label>


        <button
          type="submit"
          className="w-full py-3 rounded-xl font-semibold"
          style={{
            background: COLORS.espresso,
            color: COLORS.cream
          }}
        >
          Record Expense
        </button>

      </form>


      <div className="bg-white rounded-3xl p-5 shadow-sm">

        <div className="flex justify-between items-center gap-3 mb-4">

          <div>
            <h3 className="font-bold text-lg">
              Expenses
            </h3>

            <p
              className="text-sm"
              style={{
                color: COLORS.muted
              }}
            >
              {reportDate}
            </p>
          </div>

          <b>
            {money(
              expenses.reduce(
                (total, expense) =>
                  total +
                  Number(
                    expense.amount_kes
                  ),
                0
              )
            )}
          </b>

        </div>


        {expenses.length ? (
          <div className="space-y-3">

            {expenses.map(expense => (
              <div
                key={expense.id}
                className="border rounded-xl p-3"
              >

                <div className="flex justify-between gap-3">

                  <div>
                    <b>
                      {expense.category}
                    </b>

                    {expense.description && (
                      <p
                        className="text-sm mt-1"
                        style={{
                          color: COLORS.muted
                        }}
                      >
                        {expense.description}
                      </p>
                    )}
                  </div>

                  <b>
                    {money(
                      expense.amount_kes
                    )}
                  </b>

                </div>

                <button
                  onClick={() =>
                    deleteExpense(
                      expense.id
                    )
                  }
                  className="mt-2 text-sm font-semibold"
                  style={{
                    color: '#b91c1c'
                  }}
                >
                  Delete
                </button>

              </div>
            ))}

          </div>
        ) : (
          <Empty
            text="No expenses recorded for this date."
          />
        )}

      </div>

    </div>


    {monthlyReport &&
      monthlyReport.expense_breakdown?.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm">

          <h3 className="font-bold text-lg mb-4">
            Monthly Expense Breakdown
          </h3>

          <div className="space-y-3">

            {monthlyReport.expense_breakdown.map(
              item => (
                <div
                  key={item.category}
                  className="flex justify-between border-b pb-2"
                >
                  <span>
                    {item.category}
                  </span>

                  <b>
                    {money(
                      item.amount_kes
                    )}
                  </b>
                </div>
              )
            )}

          </div>

        </div>
      )}


    {report && (
      <div className="grid sm:grid-cols-3 gap-4">

        <Card
          title="Total debt"
          value={money(
            report.total_debt_kes
          )}
        />

        <Card
          title="Best shopkeeper"
          value={
            report.best_shopkeeper?.name ||
            '—'
          }
        />

        <Card
          title="Largest debtor"
          value={
            report.largest_debtor?.name ||
            '—'
          }
        />

      </div>
    )}

  </div>
)}

      {stockEditor && (
        <Modal
          title={
            stockEditor.mode === 'restock'
              ? `Add stock — ${stockEditor.product.name}`
              : `Remove stock — ${stockEditor.product.name}`
          }
          close={() => setStockEditor(null)}
        >

          <form
            onSubmit={changeStock}
            className="space-y-4"
          >

            <p
              className="text-sm"
              style={{
                color: COLORS.muted
              }}
            >
              Current stock:{' '}
              <b>
                {stockEditor.product.stock_quantity}
              </b>
            </p>

            <Input
              label={
                stockEditor.mode === 'restock'
                  ? 'Units to add'
                  : 'Units to remove'
              }
              value={stockEditor.value}
              onChange={v =>
                setStockEditor({
                  ...stockEditor,
                  value: v
                })
              }
              min="1"
              step="1"
              autoFocus
            />

            <label className="block">

              <span className="block text-sm font-semibold mb-1">
                Reason
              </span>

              <textarea
                required
                value={
                  stockEditor.reason || ''
                }
                onChange={e =>
                  setStockEditor({
                    ...stockEditor,
                    reason: e.target.value
                  })
                }
                placeholder={
                  stockEditor.mode === 'restock'
                    ? 'e.g. New stock received from supplier'
                    : 'e.g. Damaged stock, expired stock, stock count correction'
                }
                className="w-full px-4 py-2.5 rounded-xl border min-h-24 resize-y"
              />

            </label>

            <button
              type="submit"
              className="w-full font-semibold py-3 rounded-xl"
              style={{
                background: COLORS.espresso,
                color: COLORS.cream
              }}
            >
              {stockEditor.mode === 'restock'
                ? 'Add Stock'
                : 'Remove Stock'}
            </button>

          </form>

        </Modal>
      )}

      {history && (
        <Modal
          title={`Inventory history — ${history.product.name}`}
          close={() => setHistory(null)}
        >

          <div className="space-y-3 max-h-96 overflow-y-auto">

            {history.movements.length ? (
              history.movements.map(m => (
                <div
                  key={m.id}
                  className="border rounded-xl p-3"
                >

                  <div className="flex justify-between gap-3">

                    <b className="capitalize">
                      {m.movement_type}
                    </b>

                    <b>
                      {m.stock_after <
                      m.stock_before
                        ? '−'
                        : '+'}
                      {m.quantity}
                    </b>

                  </div>

                  <small
                    className="block"
                    style={{
                      color: COLORS.muted
                    }}
                  >
                    Stock {m.stock_before} →{' '}
                    {m.stock_after} ·{' '}
                    {new Date(
                      m.created_at
                    ).toLocaleString()}
                  </small>

                  {m.notes && (
                    <small
                      className="block mt-1"
                      style={{
                        color: COLORS.muted
                      }}
                    >
                      {m.notes}
                    </small>
                  )}

                </div>
              ))
            ) : (
              <Empty text="No stock movements recorded yet." />
            )}

          </div>

        </Modal>
      )}

    </section>
  );
}


function Input({
  label,
  value,
  onChange,
  min = '0',
  step = '1',
  autoFocus
}) {
  return (
    <label className="block">

      <span className="block text-sm font-semibold mb-1">
        {label}
      </span>

      <input
        required
        autoFocus={autoFocus}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={e =>
          onChange(e.target.value)
        }
        className="w-full px-4 py-2.5 rounded-xl border"
      />

    </label>
  );
}


function Badge({ product }) {
  const [
    label,
    bg,
    color
  ] = statusStyles[getStatus(product)];

  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{
        background: bg,
        color
      }}
    >
      {label}
    </span>
  );
}


function Inventory({
  product,
  onRestock,
  onAdjust,
  onHistory
}) {
  return (
    <div className="border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">

      <div>

        <div className="flex flex-wrap items-center gap-2">
          <b>{product.name}</b>
          <Badge product={product} />
        </div>

        <small
          className="block mt-1"
          style={{
            color: COLORS.muted
          }}
        >
          Current stock{' '}
          <b>{product.stock_quantity}</b> ·
          Low-stock level{' '}
          {product.minimum_stock}
        </small>

      </div>

      <div className="flex flex-wrap gap-2">

        <button
          onClick={onRestock}
          className="px-3 py-1.5 rounded-lg font-semibold text-sm"
          style={{
            background: COLORS.espresso,
            color: COLORS.cream
          }}
        >
          Add Stock
        </button>

        <button
          onClick={onAdjust}
          className="px-3 py-1.5 rounded-lg border text-sm font-semibold"
        >
          Remove Stock
        </button>

        <button
          onClick={onHistory}
          className="px-3 py-1.5 rounded-lg border text-sm font-semibold"
        >
          History
        </button>

      </div>

    </div>
  );
}


function Modal({
  title,
  children,
  close
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,.45)'
      }}
    >

      <div className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-xl">

        <div className="flex justify-between gap-3 mb-4">

          <h3 className="font-bold text-lg">
            {title}
          </h3>

          <button
            onClick={close}
            className="text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        {children}

      </div>

    </div>
  );
}


function Card({
  title,
  value
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">

      <p
        className="text-sm"
        style={{
          color: COLORS.muted
        }}
      >
        {title}
      </p>

      <p
        className="text-2xl font-black mt-1"
        style={{
          color: COLORS.ink
        }}
      >
        {value}
      </p>

    </div>
  );
}


function Empty({ text }) {
  return (
    <p
      className="bg-white rounded-2xl p-5"
      style={{
        color: COLORS.muted
      }}
    >
      {text}
    </p>
  );
}