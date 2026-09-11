import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { COLORS, money } from '../constants';
import { CATEGORIES, CATEGORY_COLORS } from '../components/ui';

const emptyForm = { slug: '', name: '', description: '', price_kes: '', tag: '', category: '', image_url: '', is_featured: false, is_active: true, sort_order: 0 };

function isAuthError(message) {
  return /401|invalid|expired|authorization/i.test(message || '');
}

export default function ProductsPanel({ token, onAuthError }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.adminGetProducts(token);
      setProducts(data);
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, onAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      slug: p.slug,
      name: p.name,
      description: p.description || '',
      price_kes: p.price_kes,
      tag: p.tag || '',
      category: p.category || '',
      image_url: p.image_url || '',
      is_featured: p.is_featured,
      is_active: p.is_active,
      sort_order: p.sort_order,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setForm(emptyForm);
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, price_kes: Number(form.price_kes), sort_order: Number(form.sort_order) || 0 };
      if (editingId === 'new') {
        await api.adminCreateProduct(token, payload);
      } else {
        await api.adminUpdateProduct(token, editingId, payload);
      }
      cancel();
      load();
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.adminDeleteProduct(token, id);
      load();
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    }
  };

  if (loading) return <p style={{ color: COLORS.muted }}>Loading products…</p>;

  return (
    <div>
      {error && (
        <p className="mb-3" style={{ color: COLORS.flamingo }}>
          {error}
        </p>
      )}

      {editingId ? (
        <form onSubmit={save} className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-3">
          <h3 className="font-bold ff-display" style={{ color: COLORS.ink }}>
            {editingId === 'new' ? 'New Product' : 'Edit Product'}
          </h3>
          {editingId === 'new' && (
            <input
              required
              placeholder="Slug (e.g. classic-mandazi)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: COLORS.border, color: COLORS.ink }}
            />
          )}
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <input
            required
            type="number"
            min="0"
            placeholder="Price (KES)"
            value={form.price_kes}
            onChange={(e) => setForm({ ...form, price_kes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <input
            placeholder="Tag (optional, e.g. Bestseller)"
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          >
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            placeholder="Image URL (optional - paste a link to a photo)"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          {form.image_url && (
            <img src={form.image_url} alt="Preview" className="w-20 h-20 object-cover rounded-xl" style={{ border: `1px solid ${COLORS.border}` }} />
          )}
          <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Show in Today's Specials
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active (visible on site)
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-full font-semibold disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ background: COLORS.espresso, color: COLORS.cream }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-5 py-2.5 rounded-full font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ background: '#fff', color: COLORS.ink, border: `1px solid ${COLORS.border}` }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={startNew}
          className="mb-6 px-5 py-2.5 rounded-full font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{ background: COLORS.marigold, color: COLORS.espresso }}
        >
          + New Product
        </button>
      )}

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {p.image_url && (
                <img src={p.image_url} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
              )}
              <div>
              <p className="font-bold flex items-center gap-2 flex-wrap" style={{ color: COLORS.ink }}>
                {p.category && CATEGORY_COLORS[p.category] && (
                  <span className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: CATEGORY_COLORS[p.category] }} />
                )}
                {p.name}
                {!p.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.border, color: COLORS.muted }}>
                    Hidden
                  </span>
                )}
                {p.is_featured && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.creamDark, color: COLORS.eyebrow }}>
                    Special
                  </span>
                )}
              </p>
              <p className="text-sm font-mono" style={{ color: COLORS.muted }}>
                {money(p.price_kes)}
              </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(p)} className="text-sm font-semibold px-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.cream, color: COLORS.ink }}>
                Edit
              </button>
              <button onClick={() => remove(p.id)} className="text-sm font-semibold px-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.cream, color: COLORS.flamingo }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
