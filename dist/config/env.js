"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().min(1, 'REDIS_URL is required'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('30d'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    TRANSLATION_PROVIDER: zod_1.z.enum(['libretranslate', 'deepl', 'google', 'mock']).default('mock'),
    LIBRETRANSLATE_URL: zod_1.z.string().default('http://localhost:5000'),
    DEEPL_API_KEY: zod_1.z.string().optional(),
    GOOGLE_TRANSLATE_API_KEY: zod_1.z.string().optional(),
});
function loadEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    return parsed.data;
}
exports.env = loadEnv();
//# sourceMappingURL=env.js.map