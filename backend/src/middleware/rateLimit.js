function createRateLimit({ windowMs, max, key = (req) => req.ip }) {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const identity = key(req) || 'unknown';
    const entry = requests.get(identity);
    const current = !entry || entry.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : entry;

    current.count += 1;
    requests.set(identity, current);

    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return next();
  };
}

module.exports = { createRateLimit };
