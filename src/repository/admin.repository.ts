import { prisma } from "../config/prisma.js";
import type { AdminUserGetPayload, AdminSessionGetPayload } from "../generated/prisma/models.js";

export const adminRepository = {
  findByEmail(email: string): Promise<AdminUserGetPayload<object> | null> {
    return prisma.adminUser.findUnique({ where: { email } });
  },

  createSession(data: {
    adminUserId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AdminSessionGetPayload<object>> {
    return prisma.adminSession.create({ data });
  },

  findSessionById(
    id: string
  ): Promise<AdminSessionGetPayload<{ include: { adminUser: true } }> | null> {
    return prisma.adminSession.findUnique({
      where: { id },
      include: { adminUser: true },
    });
  },

  revokeSession(id: string): Promise<AdminSessionGetPayload<object>> {
    return prisma.adminSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  updateSessionRefreshToken(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date
  ): Promise<AdminSessionGetPayload<object>> {
    return prisma.adminSession.update({
      where: { id },
      data: { refreshTokenHash, expiresAt },
    });
  },
};
