/**
 * Extracts the real client IP address from a request object.
 * Handles X-Forwarded-For headers (for proxies like Nginx) and strips IPv6 prefixes.
 * @param {import('express').Request} req - The express request object
 * @returns {string} The normalized client IP address
 */
export const getClientIp = (req) => {
    if (!req) return 'Unknown';

    // 1. Try X-Forwarded-For (usually comma separated if multiple proxies)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // The first IP in the list is the original client
        const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
        return normalizeIp(clientIp);
    }

    // 2. Fallback to Express req.ip (populated if trust proxy is on)
    if (req.ip) {
        return normalizeIp(req.ip);
    }

    // 3. Last resort fallback
    return normalizeIp(
        req.connection?.remoteAddress || 
        req.socket?.remoteAddress || 
        'Internal'
    );
};

/**
 * Strips IPv6 prefixes like ::ffff: and trims whitespace
 * @param {string} ip - The raw IP address string
 * @returns {string} The cleaned IP address
 */
const normalizeIp = (ip) => {
    if (!ip || typeof ip !== 'string') return 'Unknown';
    let cleaned = ip.trim();
    // Strip IPv6 prefix for IPv4-mapped addresses
    if (cleaned.startsWith('::ffff:')) {
        cleaned = cleaned.substring(7);
    }
    // Handle localhost IPv6
    if (cleaned === '::1') {
        return '127.0.0.1';
    }
    return cleaned;
};
