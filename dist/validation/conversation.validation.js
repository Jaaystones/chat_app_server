"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversationSchema = void 0;
const zod_1 = require("zod");
exports.createConversationSchema = zod_1.z.object({
    participantId: zod_1.z.string().trim().min(1, 'participantId is required'),
});
//# sourceMappingURL=conversation.validation.js.map