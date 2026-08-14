"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const prisma_1 = require("../config/prisma");
exports.userRepository = {
    findById(id) {
        return prisma_1.prisma.user.findUnique({ where: { id } });
    },
    findByEmail(email) {
        return prisma_1.prisma.user.findUnique({ where: { email } });
    },
    findByUsername(username) {
        return prisma_1.prisma.user.findUnique({ where: { username } });
    },
    findByEmailOrUsername(identifier) {
        return prisma_1.prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { username: identifier }] },
        });
    },
    create(data) {
        return prisma_1.prisma.user.create({ data });
    },
    update(id, data) {
        return prisma_1.prisma.user.update({ where: { id }, data });
    },
    // updateMany rather than update: a socket can outlive its user (deleted
    // account, or in tests, a reset DB) — this must no-op, not throw, when the
    // row is already gone.
    async updateStatus(id, status, lastSeen) {
        const result = await prisma_1.prisma.user.updateMany({
            where: { id },
            data: { status, ...(lastSeen ? { lastSeen } : {}) },
        });
        return result.count > 0;
    },
    search(query, excludeUserId, take = 20) {
        return prisma_1.prisma.user.findMany({
            where: {
                id: { not: excludeUserId },
                OR: [
                    { id: query },
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                ],
            },
            take,
            orderBy: { username: 'asc' },
        });
    },
};
//# sourceMappingURL=user.repository.js.map