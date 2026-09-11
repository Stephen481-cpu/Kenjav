function generateOrderCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KJ-${num}`;
}

function isValidPhone(v) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length === 10 && (d.startsWith('07') || d.startsWith('01'))) return true;
  if (d.length === 12 && d.startsWith('254') && (d[3] === '7' || d[3] === '1')) return true;
  if (d.length === 9 && (d[0] === '7' || d[0] === '1')) return true;
  return false;
}

module.exports = { generateOrderCode, isValidPhone };
