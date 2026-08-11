import redis from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Higher-order function to create a caching middleware for Express routes.
 * @param {number} duration Cache duration in seconds
 */
export const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create a unique key based on the original URL and user ID (if multi-tenant/private)
        // Adding user ID ensures users don't see each other's cached data if it's private
        const key = `cache:${req.user?._id || 'guest'}:${req.originalUrl}`;

        try {
            const cachedData = await redis.get(key);

            if (cachedData) {
                // logger.debug(`Cache hit for ${key}`);
                const data = JSON.parse(cachedData);
                return res.status(200).json(data);
            }

            // If not in cache, patch res.json to catch the response and save it to Redis
            res.originalJson = res.json;
            res.json = (body) => {
                res.originalJson(body);

                // Only cache successful responses
                if (res.statusCode === 200) {
                    redis.set(key, JSON.stringify(body), 'EX', duration)
                        .catch(err => logger.error('Redis set error:', err));
                }
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error);
            next(); // Proceed without caching if Redis fails
        }
    };
};

/**
 * Utility to clear specific cache patterns
 * @param {string} pattern Glob-style pattern (e.g., "cache:user123:*")
 */
export const clearCache = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            logger.info(`Cleared ${keys.length} cache keys for pattern: ${pattern}`);
        }
    } catch (error) {
        logger.error('Error clearing cache:', error);
    }
};
