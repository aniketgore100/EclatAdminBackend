import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler.js";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}

// Fixed-window, in-memory limiter. Fine for a single instance; swap for a
// Redis-backed version with the same signature once this needs to scale
// beyond one instance (matches the storefront's rateLimit.ts convention).
export function rateLimit(opts: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, opts.windowMs).unref();
  void sweep;

  return function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
    const key = `${opts.keyPrefix}:${req.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (bucket.count >= opts.max) {
      next(new AppError(429, "RATE_LIMITED", opts.message ?? "Too many requests. Try again later."));
      return;
    }

    bucket.count += 1;
    next();
  };
}
