import Template from "../models/Template.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

export const getTemplates = asyncHandler(async (req, res) => {
    const templates = await Template.find({
        $or: [{ author: req.user._id }, { isPublic: true }]
    });
    return sendSuccess(res, HTTP_STATUS.OK, "Templates retrieved", templates);
});

export const createTemplate = asyncHandler(async (req, res) => {
    const { title, content, modality, bodyPart, isPublic } = req.body;
    const template = await Template.create({
        title,
        content,
        modality,
        bodyPart,
        isPublic,
        author: req.user._id
    });
    return sendSuccess(res, HTTP_STATUS.CREATED, "Template created", template);
});

export const updateTemplate = asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id);
    if (!template) throw new AppError("Template not found", HTTP_STATUS.NOT_FOUND);
    if (template.author.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized", HTTP_STATUS.FORBIDDEN);
    }

    const updated = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, HTTP_STATUS.OK, "Template updated", updated);
});

export const deleteTemplate = asyncHandler(async (req, res) => {
    const template = await Template.findById(req.params.id);
    if (!template) throw new AppError("Template not found", HTTP_STATUS.NOT_FOUND);
    if (template.author.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized", HTTP_STATUS.FORBIDDEN);
    }

    await template.deleteOne();
    return sendSuccess(res, HTTP_STATUS.OK, "Template deleted", null);
});
