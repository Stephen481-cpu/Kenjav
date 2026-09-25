function createRateLimit({ windowMs, max, key = (req) => req.ip }) {
  const requests = new Map();
  let lastSweep = Date.now();

  return (req, res, next) => {
    const now = Date.now();

    // Expired entries are only ever overwritten, never removed, so this map
    // grows for the life of the process. Piggyback a periodic sweep on
    // normal request traffic (instead of a setInterval that would need its
    // own cleanup) to drop stale entries once per window.
    if (now - lastSweep > windowMs) {
      for (const [k, v] of requests) {
        if (v.resetAt <= now) requests.delete(k);
      }
      lastSweep = now;
    }

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