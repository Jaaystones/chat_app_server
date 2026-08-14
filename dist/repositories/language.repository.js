"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.languageRepository = {
    findByCode(code) {
        return prisma_1.prisma.language.findUnique({ where: { code } });
    },
    listActive() {
        return prisma_1.prisma.language.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    },
};
//# sourceMappingURL=language.repository.js.map