"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number');
exports.registerSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(100),
    lastName: zod_1.z.string().trim().min(1).max(100),
    username: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
    email: zod_1.z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    preferredLanguage: zod_1.z.string().trim().toLowerCase().min(2).max(10),
    country: zod_1.z.string().trim().min(1).max(100).optional(),
});
exports.loginSchema = zod_1.z.object({
    identifier: zod_1.z.string().trim().min(1, 'Email or username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
//# sourceMappingURL=auth.validation.js.map