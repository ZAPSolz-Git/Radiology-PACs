import Macro from "../models/Macro.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

export const getMacros = asyncHandler(async (req, res) => {
    const macros = await Macro.find({ author: req.user._id });
    return sendSuccess(res, HTTP_STATUS.OK, "Macros retrieved", macros);
});

export const createMacro = asyncHandler(async (req, res) => {
    const { key, expansion } = req.body;
    const macro = await Macro.create({
        key,
        expansion,
        author: req.user._id
    });
    return sendSuccess(res, HTTP_STATUS.CREATED, "Macro created", macro);
});

export const updateMacro = asyncHandler(async (req, res) => {
    const macro = await Macro.findById(req.params.id);
    if (!macro) throw new AppError("Macro not found", HTTP_STATUS.NOT_FOUND);
    if (macro.author.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized", HTTP_STATUS.FORBIDDEN);
    }

    const updated = await Macro.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, HTTP_STATUS.OK, "Macro updated", updated);
});

export const deleteMacro = asyncHandler(async (req, res) => {
    const macro = await Macro.findById(req.params.id);
    if (!macro) throw new AppError("Macro not found", HTTP_STATUS.NOT_FOUND);
    if (macro.author.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized", HTTP_STATUS.FORBIDDEN);
    }

    await macro.deleteOne();
    return sendSuccess(res, HTTP_STATUS.OK, "Macro deleted", null);
});
