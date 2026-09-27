import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { adminRepository } from "../repository/admin.repository.js";
import { AppError } from "../middlewares/errorHandler.js";
import { env } from "../config/env.js";

const BCRYPT_ROUNDS = 10;

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Same selector/validator refresh-token pattern as the storefront's customer
// auth: "<sessionId>.<secret>" — sessionId gives an O(1) lookup of the one
// row to check, secret is bcrypt-compared against that row's hash.
function encodeRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

function decodeRefreshToken(token: string): { sessionId: string; secret: string } {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Malformed refresh token");
  }
  return { sessionId: token.slice(0, dot), secret: token.slice(dot + 1) };
}

function signAccessToken(payload: { sub: string; email: string; role: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"],
  });
}

async function issueSession(adminUserId: string, email: string, role: string, meta: RequestMeta) {
  const secret = generateSessionSecret();
  const refreshTokenHash = await bcrypt.hash(secret, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const session = await adminRepository.createSession({
    adminUserId,
    refreshTokenHash,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return {
    accessToken: signAccessToken({ sub: adminUserId, email, role }),
    refreshToken: encodeRefreshToken(session.id, secret),
  };
}

export const authService = {
  async login(email: string, password: string, meta: RequestMeta) {
    const admin = await adminRepository.findByEmail(email);
    // Same generic message whether the email doesn't exist or the password
    // is wrong — don't let the response reveal which one it was.
    if (!admin || !admin.active) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const tokens = await issueSession(admin.id, admin.email, admin.role, meta);
    return {
      ...tokens,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    };
  },

  async refresh(refreshToken: string) {
    const { sessionId, secret } = decodeRefreshToken(refreshToken);
    const session = await adminRepository.findSessionById(sessionId);

    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Session is invalid or expired. Please log in again.");
    }

    const isValid = await bcrypt.compare(secret, session.refreshTokenHash);
    if (!isValid) {
      // Secret didn't match a live session — plausible token theft/reuse.
      await adminRepository.revokeSession(session.id);
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Session is invalid or expired. Please log in again.");
    }

    // Rotate on every use: old secret becomes worthless immediately.
    const newSecret = generateSessionSecret();
    const newHash = await bcrypt.hash(newSecret, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await adminRepository.updateSessionRefreshToken(session.id, newHash, expiresAt);

    return {
      accessToken: signAccessToken({
        sub: session.adminUserId,
        email: session.adminUser.email,
        role: session.adminUser.role,
      }),
      refreshToken: encodeRefreshToken(session.id, newSecret),
    };
  },

  async logout(refreshToken: string) {
    const { sessionId, secret } = decodeRefreshToken(refreshToken);
    const session = await adminRepository.findSessionById(sessionId);
    if (!session || session.revokedAt) {
      return; // already logged out — logout is idempotent, not an error
    }

    const isValid = await bcrypt.compare(secret, session.refreshTokenHash);
    if (!isValid) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    await adminRepository.revokeSession(session.id);
  },
};
