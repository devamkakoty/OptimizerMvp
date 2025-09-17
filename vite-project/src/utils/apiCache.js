// Simple in-memory cache for API responses
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Generate cache key
  getCacheKey(endpoint, params = {}) {
    const paramsStr = Object.keys(params).length > 0 ? JSON.stringify(params) : '';
    return `${endpoint}${paramsStr}`;
  }

  // Check if cache entry is valid
  isValid(entry) {
    return entry && (Date.now() - entry.timestamp) < this.cacheTimeout;
  }

  // Get from cache
  get(endpoint, params = {}) {
    const key = this.getCacheKey(endpoint, params);
    const entry = this.cache.get(key);
    
    if (this.isValid(entry)) {
      console.log(`Cache hit for: ${endpoint}`);
      return entry.data;
    }
    
    console.log(`Cache miss for: ${endpoint}`);
    return null;
  }

  // Set cache entry
  set(endpoint, data, params = {}) {
    const key = this.getCacheKey(endpoint, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`Cached: ${endpoint}`);
  }

  // Clear specific cache entry
  clear(endpoint, params = {}) {
    const key = this.getCacheKey(endpoint, params);
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const apiCache = new ApiCache();