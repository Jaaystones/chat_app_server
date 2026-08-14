"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// `./env` must be imported before `@prisma/client` — Prisma's generated
// client auto-loads a plain `.env` on first require (independent of
// NODE_ENV), and since dotenv never overrides an already-set key, whichever
// loader runs first wins for every variable, not just Prisma's own. Importing
// our NODE_ENV-aware env.ts first ensures ours wins and Prisma's own load
// becomes a harmless no-op.
const env_1 = require("./env");
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient({
    log: env_1.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
//# sourceMappingURL=prisma.js.map