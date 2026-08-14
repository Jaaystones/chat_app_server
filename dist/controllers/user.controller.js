"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getById = exports.search = exports.updateMe = void 0;
const user_service_1 = require("../services/users/user.service");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.updateMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const user = await user_service_1.userService.updateProfile(req.userId, body);
    res.status(200).json({ user });
});
exports.search = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q } = req.validatedQuery;
    const users = await user_service_1.userService.search(q, req.userId);
    res.status(200).json({ users });
});
exports.getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_service_1.userService.getById(req.params.id);
    res.status(200).json({ user });
});
//# sourceMappingURL=user.controller.js.map