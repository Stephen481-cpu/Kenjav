import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { COLORS } from '../constants';

const emptyForm = { badge: 'HOT DEAL', title: '', description: '', is_active: true };

function isAuthError(message) {
  return /401|invalid|expired|authorization/i.test(message || '');
}

export default function OffersPanel({ token, onAuthError }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.adminGetOffers(token);
      setOffers(data);
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

  const startEdit = (o) => {
    setEditingId(o.id);
    setForm({ badge: o.badge, title: o.title, description: o.description || '', is_active: o.is_active });
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
      if (editingId === 'new') await api.adminCreateOffer(token, form);
      else await api.adminUpdateOffer(token, editingId, form);
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
    if (!window.confirm('Delete this offer?')) return;
    try {
      await api.adminDeleteOffer(token, id);
      load();
    } catch (err) {
      if (isAuthError(err.message)) onAuthError();
      else setError(err.message);
    }
  };

  if (loading) return <p style={{ color: COLORS.muted }}>Loading offers…</p>;

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
        Only one offer can be active at a time — it shows as a banner at the top of the site.
      </p>
      {error && (
        <p className="mb-3" style={{ color: COLORS.flamingo }}>
          {error}
        </p>
      )}

      {editingId ? (
        <form onSubmit={save} className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-3">
          <h3 className="font-bold ff-display" style={{ color: COLORS.ink }}>
            {editingId === 'new' ? 'New Offer' : 'Edit Offer'}
          </h3>
          <input
            placeholder="Badge (e.g. HOT DEAL)"
            value={form.badge}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <input
            required
            placeholder="Title (e.g. Buy 6 Get 1 Free)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <textarea
            placeholder="Description (e.g. Order any 6 classic mandazis)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ borderColor: COLORS.border, color: COLORS.ink }}
          />
          <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Show live on site now
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
          + New Offer
        </button>
      )}

      <div className="space-y-3">
        {offers.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold flex items-center gap-2 flex-wrap" style={{ color: COLORS.ink }}>
                {o.title}
                {o.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.jade, color: '#fff' }}>
                    Live
                  </span>
                )}
              </p>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {o.description}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(o)} className="text-sm font-semibold px-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.cream, color: COLORS.ink }}>
                Edit
              </button>
              <button onClick={() => remove(o.id)} className="text-sm font-semibold px-3 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400" style={{ background: COLORS.cream, color: COLORS.flamingo }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
