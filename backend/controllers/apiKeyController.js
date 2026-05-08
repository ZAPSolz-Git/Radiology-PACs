import crypto from "crypto";
import bcrypt from "bcryptjs";
import ApiKey from "../models/ApiKey.js";
import Case from "../models/Case.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import { logAudit, AUDIT_CATEGORIES, AUDIT_STATUS, AUDIT_SEVERITY } from "../utils/auditLogger.js";

/**
 * @desc    Generate a new API key for an external partner
 * @route   POST /api/admin/api-keys
 * @access  Private (Admin only)
 * 
 * The raw key is returned ONCE in the response and never stored.
 */
export const createApiKey = asyncHandler(async (req, res) => {
    const { partnerName, scopes, expiresAt, ipWhitelist, rateLimit } = req.body;

    if (!partnerName || !partnerName.trim()) {
        throw new AppError("Partner name is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Generate a cryptographically random API key
    // Format: ak_<partnerSlug>_<32 random hex chars>
    const partnerSlug = partnerName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 8);
    const randomPart = crypto.randomBytes(32).toString("hex");
    const rawKey = `ak_${partnerSlug}_${randomPart}`;

    // Extract first 16 characters as the indexed prefix
    const keyPrefix = rawKey.substring(0, 16);

    // Check prefix uniqueness (extremely unlikely collision, but be safe)
    const existing = await ApiKey.findOne({ keyPrefix });
    if (existing) {
        // Regenerate — this is astronomically rare
        throw new AppError("Key generation collision. Please try again.", HTTP_STATUS.CONFLICT);
    }

    // Hash the full key with bcrypt
    const salt = await bcrypt.genSalt(12);
    const keyHash = await bcrypt.hash(rawKey, salt);

    // Parse IP whitelist from comma-separated string if needed
    let parsedIpWhitelist = [];
    if (ipWhitelist) {
        if (typeof ipWhitelist === "string") {
            parsedIpWhitelist = ipWhitelist.split(",").map((ip) => ip.trim()).filter(Boolean);
        } else if (Array.isArray(ipWhitelist)) {
            parsedIpWhitelist = ipWhitelist.map((ip) => ip.trim()).filter(Boolean);
        }
    }

    const apiKey = await ApiKey.create({
        partnerName: partnerName.trim(),
        keyHash,
        keyPrefix,
        scopes: scopes || ["read:cases"],
        expiresAt: expiresAt || null,
        ipWhitelist: parsedIpWhitelist,
        rateLimit: rateLimit || 100,
        createdBy: req.user._id,
    });

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "API Key Created",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.HIGH,
        details: `Admin "${req.user.name}" created API key for partner "${partnerName}"`,
        resourceType: "ApiKey",
        resourceId: apiKey._id,
        metadata: { partnerName, scopes: apiKey.scopes, keyPrefix },
    });

    // Return the raw key ONCE — it will never be retrievable again
    return sendSuccess(res, HTTP_STATUS.CREATED, "API key created. Copy the key now — it will not be shown again.", {
        _id: apiKey._id,
        partnerName: apiKey.partnerName,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        ipWhitelist: apiKey.ipWhitelist,
        rateLimit: apiKey.rateLimit,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        // ⚠️ ONE-TIME FIELD — never returned again
        rawKey,
    });
});

/**
 * @desc    List all API keys (without hashes/raw keys)
 * @route   GET /api/admin/api-keys
 * @access  Private (Admin only)
 */
export const listApiKeys = asyncHandler(async (req, res) => {
    const keys = await ApiKey.find()
        .select("partnerName keyPrefix scopes isActive expiresAt lastUsedAt rateLimit ipWhitelist createdAt createdBy")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean();

    return sendSuccess(res, HTTP_STATUS.OK, "API keys retrieved", keys);
});

/**
 * @desc    Update an API key (scopes, IP whitelist, rate limit, active status)
 * @route   PATCH /api/admin/api-keys/:id
 * @access  Private (Admin only)
 */
export const updateApiKey = asyncHandler(async (req, res) => {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
        throw new AppError("API key not found", HTTP_STATUS.NOT_FOUND);
    }

    const { scopes, ipWhitelist, rateLimit, isActive } = req.body;

    if (scopes !== undefined) apiKey.scopes = scopes;
    if (rateLimit !== undefined) apiKey.rateLimit = rateLimit;
    if (isActive !== undefined) apiKey.isActive = isActive;

    if (ipWhitelist !== undefined) {
        if (typeof ipWhitelist === "string") {
            apiKey.ipWhitelist = ipWhitelist.split(",").map((ip) => ip.trim()).filter(Boolean);
        } else if (Array.isArray(ipWhitelist)) {
            apiKey.ipWhitelist = ipWhitelist.map((ip) => ip.trim()).filter(Boolean);
        } else {
            apiKey.ipWhitelist = [];
        }
    }

    await apiKey.save();

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "API Key Updated",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.MEDIUM,
        details: `Admin "${req.user.name}" updated API key for partner "${apiKey.partnerName}"`,
        resourceType: "ApiKey",
        resourceId: apiKey._id,
    });

    return sendSuccess(res, HTTP_STATUS.OK, "API key updated", {
        _id: apiKey._id,
        partnerName: apiKey.partnerName,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        isActive: apiKey.isActive,
        ipWhitelist: apiKey.ipWhitelist,
        rateLimit: apiKey.rateLimit,
    });
});

/**
 * @desc    Revoke (hard delete) an API key
 * @route   DELETE /api/admin/api-keys/:id
 * @access  Private (Admin only)
 */
export const revokeApiKey = asyncHandler(async (req, res) => {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
        throw new AppError("API key not found", HTTP_STATUS.NOT_FOUND);
    }

    const partnerName = apiKey.partnerName;
    const keyPrefix = apiKey.keyPrefix;

    await apiKey.deleteOne();

    logAudit({
        category: AUDIT_CATEGORIES.EXTERNAL_API,
        action: "API Key Revoked",
        req,
        status: AUDIT_STATUS.SUCCESS,
        severity: AUDIT_SEVERITY.CRITICAL,
        details: `Admin "${req.user.name}" permanently revoked API key for partner "${partnerName}" (prefix: ${keyPrefix})`,
        resourceType: "ApiKey",
        resourceId: req.params.id,
    });

    return sendSuccess(res, HTTP_STATUS.OK, "API key revoked permanently. The partner will lose access immediately.");
});

/**
 * @desc    Get partners available for case assignment (with workload)
 * @route   GET /api/qa/partners
 * @access  Private (QA, Admin)
 */
export const getPartnersForAssignment = asyncHandler(async (req, res) => {
    console.log('[getPartnersForAssignment] Fetching partners...');

    // Get active partners with read:cases and write:reports scopes
    const partners = await ApiKey.find({
        isActive: true,
        scopes: { $all: ['read:cases', 'write:reports'] }
    })
        .select('partnerName keyPrefix scopes isActive rateLimit createdAt')
        .lean();

    console.log(`[getPartnersForAssignment] Found ${partners.length} partners with required scopes`);

    // Compute workload for each partner (count of active cases assigned to them)
    const activeStatuses = ['Assigned', 'In_Progress', 'Rep_Correction', 'QA_Audit', 'QA_Review'];

    const partnersWithWorkload = await Promise.all(
        partners.map(async (partner) => {
            try {
                const currentWorkload = await Case.countDocuments({
                    assignedPartner: partner._id,
                    status: { $in: activeStatuses }
                });
                return {
                    _id: partner._id,
                    partnerName: partner.partnerName,
                    keyPrefix: partner.keyPrefix,
                    scopes: partner.scopes,
                    isActive: partner.isActive,
                    rateLimit: partner.rateLimit,
                    createdAt: partner.createdAt,
                    currentWorkload,
                    online: true // Partners are "online" if their API key is active
                };
            } catch (err) {
                console.error(`[getPartnersForAssignment] Error computing workload for ${partner.partnerName}:`, err.message);
                return {
                    _id: partner._id,
                    partnerName: partner.partnerName,
                    keyPrefix: partner.keyPrefix,
                    scopes: partner.scopes,
                    isActive: partner.isActive,
                    rateLimit: partner.rateLimit,
                    createdAt: partner.createdAt,
                    currentWorkload: 0,
                    online: true
                };
            }
        })
    );

    console.log('[getPartnersForAssignment] Returning:', partnersWithWorkload.length, 'partners');
    return sendSuccess(res, HTTP_STATUS.OK, "Partners retrieved", partnersWithWorkload);
});
