const cache = new Map();

function cacheMiddleware(ttl = 30000) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl}`;

    const cached = cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.status(cached.statusCode).json(cached.data);
    }

    // Remove expired entry
    if (cached) {
      cache.delete(key);
    }

    const originalJson = res.json.bind(res);

    res.json = (data) => {
      cache.set(key, {
        data,
        statusCode: res.statusCode,
        expiresAt: Date.now() + ttl,
      });

      res.set('X-Cache', 'MISS');

      return originalJson(data);
    };

    next();
  };
}

function clearCache() {
  cache.clear();
}

function clearCacheByPrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

module.exports = {
  cacheMiddleware,
  clearCache,
  clearCacheByPrefix,
};
