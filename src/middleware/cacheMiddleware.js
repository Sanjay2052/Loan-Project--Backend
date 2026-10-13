/**
 * In-memory response cache with tag-based invalidation.
 *
 * Usage in routes:
 *   router.get('/', cacheMiddleware(30000, ['reports']), getReports);
 *
 * Invalidation in controllers:
 *   clearCacheByTag('reports');          // clears all entries tagged 'reports'
 *   clearCacheByPrefix('/api/reports');  // legacy prefix-based clear (still supported)
 */
const cache = new Map(); // key → { data, statusCode, expiresAt, tags }

// ─── Middleware factory ─────────────────────────────────────────────────────

function cacheMiddleware(ttl = 30000, tags = []) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      res.set('X-Cache', 'HIT');
      return res.status(cached.statusCode).json(cached.data);
    }

    if (cached) cache.delete(key); // remove stale entry

    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Only cache successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data,
          statusCode: res.statusCode,
          expiresAt: Date.now() + ttl,
          tags: tags.slice(),
        });
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// ─── Invalidation helpers ───────────────────────────────────────────────────

function clearCache() {
  cache.clear();
}

function clearCacheByPrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function clearCacheByTag(tag) {
  for (const [key, entry] of cache.entries()) {
    if (entry.tags && entry.tags.includes(tag)) cache.delete(key);
  }
}

/**
 * Convenience: invalidate multiple tags at once.
 *   clearCacheTags(['reports', 'loans']);
 */
function clearCacheTags(tagList) {
  for (const [key, entry] of cache.entries()) {
    if (entry.tags && entry.tags.some((t) => tagList.includes(t))) {
      cache.delete(key);
    }
  }
}

module.exports = {
  cacheMiddleware,
  clearCache,
  clearCacheByPrefix,
  clearCacheByTag,
  clearCacheTags,
};
