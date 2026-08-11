import bcrypt from "bcryptjs";
import ApiKey from "../models/ApiKey.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/index.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";

/**
 * Check whether `ip` (a plain IPv4 string) falls inside `cidr`.
 * Supports both exact IPs ("203.0.113.5") and CIDR ranges ("198.51.100.0/24").
 * IPv6-mapped IPv4 addresses should be normalised before calling this.
 */
const ipMatchesCidr = (ip, cidr) => {
    // No slash → treat as exact match
    if (!cidr.includes("/")) return ip === cidr;

    const [network, prefixStr] = cidr.split("/");
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

    const ipToInt = (addr) =>
        addr.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
};

/**
 * API Key Authentication Middleware
 * 
 * Two-step lookup for performance:
 *   1. Find by keyPrefix (indexed, first 16 chars) — O(1) lookup
 *   2. bcrypt-compare only that single document — never iterate all keys
 * 
 * Usage: router.get('/endpoint', apiKeyAuth, requireScope('read:cases'), handler)
 */
export const apiKeyAuth = asyncHandler(async (req, res, next) => {
    // 1. Extract key from header
    const rawKey = req.headers["armorray-api-key"];

    if (!rawKey || typeof rawKey !== "string" || rawKey.length < 20) {
        throw new AppError("Missing or invalid API key", HTTP_STATUS.UNAUTHORIZED);
    }

    // 2. Extract the first 16 characters as the prefix for indexed lookup
    const prefix = rawKey.substring(0, 16);

    // 3. Find by prefix (indexed query — single document lookup)
    const apiKey = await ApiKey.findOne({ keyPrefix: prefix });

    if (!apiKey) {
        logAudit({
            category: AUDIT_CATEGORIES.EXTERNAL_API,
            action: "API Key Auth Failed",
            req,
            status: AUDIT_STATUS.FAILURE,
            severity: AUDIT_SEVERITY.HIGH,
            details: `Unknown API key prefix: ${prefix}`,
        });
        throw new AppError("Invalid API key", HTTP_STATUS.UNAUTHORIZED);
    }

    // 4. bcrypt-compare the full raw key against the stored hash
    const isMatch = await bcrypt.compare(rawKey, apiKey.keyHash);

    if (!isMatch) {
        logAudit({
            category: AUDIT_CATEGORIES.EXTERNAL_API,
            action: "API Key Auth Failed",
            req,
            status: AUDIT_STATUS.FAILURE,
            severity: AUDIT_SEVERITY.HIGH,
            details: `Key hash mismatch for partner: ${apiKey.partnerName}`,
        });
        throw new AppError("Invalid API key", HTTP_STATUS.UNAUTHORIZED);
    }

    // 5. Check if key is active
    if (!apiKey.isActive) {
        throw new AppError("API key has been revoked", HTTP_STATUS.UNAUTHORIZED);
    }

    // 6. Check expiry
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        throw new AppError("API key has expired", HTTP_STATUS.UNAUTHORIZED);
    }

    // 7. Enforce IP whitelist
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
        const clientIp = req.ip || req.connection?.remoteAddress || "";
        // Normalize IPv6-mapped IPv4 (e.g. "::ffff:127.0.0.1" → "127.0.0.1")
        const normalizedIp = clientIp.replace(/^::ffff:/, "");

        const isAllowed = apiKey.ipWhitelist.some((allowed) => {
            const normalizedAllowed = allowed.replace(/^::ffff:/, "").trim();
            return ipMatchesCidr(normalizedIp, normalizedAllowed);
        });

        if (!isAllowed) {
            logAudit({
                category: AUDIT_CATEGORIES.EXTERNAL_API,
                action: "IP Whitelist Rejected",
                req,
                status: AUDIT_STATUS.FAILURE,
                severity: AUDIT_SEVERITY.HIGH,
                details: `IP ${normalizedIp} not in whitelist for partner: ${apiKey.partnerName}`,
            });
            throw new AppError(
                "Request origin not allowed for this API key",
                HTTP_STATUS.FORBIDDEN
            );
        }
    }

    // 8. Attach partner context to request (analogous to req.user in protect middleware)
    req.apiPartner = {
        id: apiKey._id.toString(),
        partnerName: apiKey.partnerName,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
    };

    // 9. Update lastUsedAt — fire-and-forget (no await)
    ApiKey.updateOne(
        { _id: apiKey._id },
        { $set: { lastUsedAt: new Date() } }
    ).catch((err) => {
        console.error("[apiKeyAuth] Failed to update lastUsedAt:", err.message);
    });

    next();
});

/**
 * Scope Guard Middleware
 * 
 * Usage: requireScope('read:cases')  or  requireScope('read:cases', 'write:reports')
 * Must be placed AFTER apiKeyAuth in the middleware chain.
 */
export const requireScope = (...requiredScopes) => {
    return (req, res, next) => {
        if (!req.apiPartner) {
            throw new AppError("API key authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const hasAllScopes = requiredScopes.every((scope) =>
            req.apiPartner.scopes.includes(scope)
        );

        if (!hasAllScopes) {
            logAudit({
                category: AUDIT_CATEGORIES.EXTERNAL_API,
                action: "Scope Check Failed",
                req,
                status: AUDIT_STATUS.FAILURE,
                severity: AUDIT_SEVERITY.MEDIUM,
                details: `Partner "${req.apiPartner.partnerName}" lacks scopes: ${requiredScopes.join(", ")}. Has: ${req.apiPartner.scopes.join(", ")}`,
            });
            throw new AppError(
                `Insufficient permissions. Required scopes: ${requiredScopes.join(", ")}`,
                HTTP_STATUS.FORBIDDEN
            );
        }

        next();
    };
};
