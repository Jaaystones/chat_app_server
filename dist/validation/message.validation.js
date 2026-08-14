"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMessagesQuerySchema = exports.editMessageSchema = exports.sendMessageSchema = void 0;
const zod_1 = require("zod");
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().trim().min(1, 'Message content is required').max(5000),
});
exports.editMessageSchema = exports.sendMessageSchema;
exports.listMessagesQuerySchema = zod_1.z.object({
    before: zod_1.z.string().uuid().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
//# sourceMappingURL=message.validation.js.map