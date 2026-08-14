import { Prisma, User } from '@prisma/client';
import { prisma } from '../config/prisma';

export const userRepository = {
  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  },

  findByEmailOrUsername(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });
  },

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  // updateMany rather than update: a socket can outlive its user (deleted
  // account, or in tests, a reset DB) — this must no-op, not throw, when the
  // row is already gone.
  async updateStatus(id: string, status: 'ONLINE' | 'OFFLINE', lastSeen?: Date): Promise<boolean> {
    const result = await prisma.user.updateMany({
      where: { id },
      data: { status, ...(lastSeen ? { lastSeen } : {}) },
    });
    return result.count > 0;
  },

  search(query: string, excludeUserId: string, take = 20): Promise<User[]> {
    return prisma.user.findMany({
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
