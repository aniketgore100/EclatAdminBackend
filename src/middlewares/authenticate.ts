import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string;
      adminEmail?: string;
      adminRole?: string;
    }
  }
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

function isAccessTokenPayload(decoded: unknown): decoded is AccessTokenPayload {
  return (
    typeof decoded === "object" &&
    decoded !== null &&
    typeof (decoded as Record<string, unknown>).sub === "string" &&
    typeof (decoded as Record<string, unknown>).email === "string" &&
    typeof (decoded as Record<string, unknown>).role === "string"
  );
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (!isAccessTokenPayload(decoded)) {
      throw new AppError(401, "UNAUTHORIZED", "Malformed access token");
    }
    req.adminId = decoded.sub;
    req.adminEmail = decoded.email;
    req.adminRole = decoded.role;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired access token");
  }
}
