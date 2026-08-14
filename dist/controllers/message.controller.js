"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.list = void 0;
const message_service_1 = require("../services/messaging/message.service");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { before, limit } = req.validatedQuery;
    const page = await message_service_1.messageService.listMessages(req.params.id, req.userId, {
        before,
        limit,
    });
    res.status(200).json(page);
});
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { content } = req.body;
    const message = await message_service_1.messageService.sendMessage(req.params.id, req.userId, content);
    res.status(201).json({ message });
});
exports.update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { content } = req.body;
    const message = await message_service_1.messageService.editMessage(req.params.id, req.userId, content);
    res.status(200).json({ message });
});
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await message_service_1.messageService.deleteMessage(req.params.id, req.userId);
    res.status(204).send();
});
//# sourceMappingURL=message.controller.js.map