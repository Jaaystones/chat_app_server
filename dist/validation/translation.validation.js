"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateMessageSchema = void 0;
const zod_1 = require("zod");
exports.translateMessageSchema = zod_1.z.object({
    targetLanguage: zod_1.z.string().trim().toLowerCase().min(2).max(10),
});
//# sourceMappingURL=translation.validation.js.map