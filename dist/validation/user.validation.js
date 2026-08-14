"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQuerySchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z
    .object({
    firstName: zod_1.z.string().trim().min(1).max(100).optional(),
    lastName: zod_1.z.string().trim().min(1).max(100).optional(),
    preferredLanguage: zod_1.z.string().trim().toLowerCase().min(2).max(10).optional(),
    country: zod_1.z.string().trim().min(1).max(100).optional(),
    avatarUrl: zod_1.z.string().trim().url().optional(),
    autoTranslate: zod_1.z.boolean().optional(),
    showOriginalByDefault: zod_1.z.boolean().optional(),
})
    .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });
exports.searchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(1, 'Search query is required').max(100),
});
//# sourceMappingURL=user.validation.js.map