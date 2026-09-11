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

export function isValidPhone(v) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length === 10 && (d.startsWith('07') || d.startsWith('01'))) return true;
  if (d.length === 12 && d.startsWith('254') && (d[3] === '7' || d[3] === '1')) return true;
  if (d.length === 9 && (d[0] === '7' || d[0] === '1')) return true;
  return false;
}
