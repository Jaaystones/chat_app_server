"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getById = exports.list = exports.create = void 0;
const conversation_service_1 = require("../services/conversations/conversation.service");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { participantId } = req.body;
    const { conversation, created } = await conversation_service_1.conversationService.createDirect(req.userId, participantId);
    res.status(created ? 201 : 200).json({ conversation });
});
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const conversations = await conversation_service_1.conversationService.listForUser(req.userId);
    res.status(200).json({ conversations });
});
exports.getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const conversation = await conversation_service_1.conversationService.getByIdForUser(req.params.id, req.userId);
    res.status(200).json({ conversation });
});
//# sourceMappingURL=conversation.controller.js.map