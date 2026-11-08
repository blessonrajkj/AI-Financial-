import axios from 'axios';

// In-flight promise registry to deduplicate simultaneous identical GET requests
const inFlightRequests = new Map();

// Short-lived response memory cache (TTL in milliseconds)
const responseCache = new Map();

/**
 * Executes a GET request with in-flight deduplication and short-term caching.
 * Prevents identical concurrent requests (e.g., Navbar + Dashboard) from firing multiple HTTP calls.
 */
export const cachedGet = async (url, options = {}, ttlMs = 10000) => {
  const cacheKey = url;
  const now = Date.now();

  // Return fresh cached response if valid
  if (responseCache.has(cacheKey)) {
    const { data, expiry } = responseCache.get(cacheKey);
    if (now < expiry) {
      return data;
    }
    responseCache.delete(cacheKey);
  }

  // Deduplicate in-flight requests (share active promise)
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = axios.get(url, { ...options, timeout: options.timeout || 10000 })
    .then(res => {
      inFlightRequests.delete(cacheKey);
      if (ttlMs > 0) {
        responseCache.set(cacheKey, { data: res.data, expiry: Date.now() + ttlMs });
      }
      return res.data;
    })
    .catch(err => {
      inFlightRequests.delete(cacheKey);
      throw err;
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};

/**
 * Clears all cached responses and pending request trackers.
 * Must be called when mutations occur (transactions added/edited/deleted, budgets modified).
 */
export const clearApiCache = () => {
  responseCache.clear();
  inFlightRequests.clear();
};
