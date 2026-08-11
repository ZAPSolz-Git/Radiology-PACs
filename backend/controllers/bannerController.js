import Banner from "../models/Banner.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import fs from "fs";
import path from "path";

/**
 * @desc    Get all active banners
 * @route   GET /api/banners
 * @access  Private
 */
export const getBanners = asyncHandler(async (req, res) => {
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    return sendSuccess(res, HTTP_STATUS.OK, "Banners retrieved", banners);
});

/**
 * @desc    Get all banners (for management)
 * @route   GET /api/banners/all
 * @access  Private (Admin/QA)
 */
export const getAllBanners = asyncHandler(async (req, res) => {
    const banners = await Banner.find().sort({ createdAt: -1 });
    return sendSuccess(res, HTTP_STATUS.OK, "All banners retrieved", banners);
});

/**
 * @desc    Create a new banner
 * @route   POST /api/banners
 * @access  Private (Admin/QA)
 */
export const createBanner = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const bannerFile = req.file;

    if (!bannerFile) {
        throw new AppError("Banner image is required", HTTP_STATUS.BAD_REQUEST);
    }

    // Save image to uploads/banners
    const bannerDir = path.join("uploads", "banners");
    if (!fs.existsSync(bannerDir)) fs.mkdirSync(bannerDir, { recursive: true });

    const fileName = `banner_${Date.now()}${path.extname(bannerFile.originalname)}`;
    const filePath = path.join(bannerDir, fileName);
    fs.writeFileSync(filePath, bannerFile.buffer);

    const imageUrl = `/uploads/banners/${fileName}`;

    const banner = await Banner.create({
        title,
        description,
        imageUrl,
    });

    return sendSuccess(res, HTTP_STATUS.CREATED, "Banner created successfully", banner);
});

/**
 * @desc    Update banner details
 * @route   PATCH /api/banners/:id
 * @access  Private (Admin/QA)
 */
export const updateBanner = asyncHandler(async (req, res) => {
    const { title, description, isActive } = req.body;
    const bannerFile = req.file;

    const banner = await Banner.findById(req.params.id);
    if (!banner) throw new AppError("Banner not found", HTTP_STATUS.NOT_FOUND);

    if (title) banner.title = title;
    if (description !== undefined) banner.description = description;
    if (isActive !== undefined) banner.isActive = isActive;

    if (bannerFile) {
        // Upload new image
        const bannerDir = path.join("uploads", "banners");
        const fileName = `banner_${Date.now()}${path.extname(bannerFile.originalname)}`;
        const filePath = path.join(bannerDir, fileName);
        fs.writeFileSync(filePath, bannerFile.buffer);

        // Update URL
        banner.imageUrl = `/uploads/banners/${fileName}`;
    }

    await banner.save();

    return sendSuccess(res, HTTP_STATUS.OK, "Banner updated successfully", banner);
});

/**
 * @desc    Delete a banner
 * @route   DELETE /api/banners/:id
 * @access  Private (Admin/QA)
 */
export const deleteBanner = asyncHandler(async (req, res) => {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) throw new AppError("Banner not found", HTTP_STATUS.NOT_FOUND);

    // Optionally delete the file from disk
    const filePath = path.join(process.cwd(), banner.imageUrl);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error("Failed to delete banner file:", err);
        }
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Banner deleted successfully");
});
