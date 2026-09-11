export const COLORS = {
  espresso: '#2A1810',
  espressoDeep: '#1E1109',
  marigold: '#E2971D',
  marigoldLight: '#F0B429',
  cream: '#FBF0DC',
  creamDark: '#F3DFB0',
  flamingo: '#E0356B',
  jade: '#1D7A5C',
  ink: '#3D2817',
  muted: '#6B5744',
  eyebrow: '#B9791A',
  border: '#EEE0C4',
};

export function money(n) {
  return `KES ${Number(n).toLocaleString()}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const STATUS_COLORS = {
  red: { bg: '#E0356B', fg: '#fff' },
  yellow: { bg: '#F0B429', fg: '#2A1810' },
  green: { bg: '#1D7A5C', fg: '#fff' },
  neutral: { bg: '#EEE0C4', fg: '#3D2817' },
};
