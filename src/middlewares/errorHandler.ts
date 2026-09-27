import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const NotFoundError = (message = "Not found", code = "NOT_FOUND") =>
  new AppError(404, code, message);

// Prisma "known request" error codes worth mapping to a specific HTTP status
// instead of a generic 500. Full list: https://pris.ly/d/prisma-schema-errors
const PRISMA_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  P2002: { status: 409, code: "DUPLICATE_ENTRY", message: "A record with these details already exists" },
  P2025: { status: 404, code: "NOT_FOUND", message: "Record not found" },
  P2003: { status: 400, code: "INVALID_REFERENCE", message: "Referenced record does not exist" },
  P2000: { status: 400, code: "VALUE_TOO_LONG", message: "A provided value is too long for its field" },
};

function isBodyParseError(err: unknown): err is SyntaxError & { type?: string } {
  return err instanceof SyntaxError && (err as { type?: string }).type === "entity.parse.failed";
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details ?? null });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: err.issues,
    });
    return;
  }

  if (isBodyParseError(err)) {
    res.status(400).json({ code: "INVALID_JSON", message: "Request body is not valid JSON", details: null });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERROR_MAP[err.code];
    if (mapped) {
      res.status(mapped.status).json({ code: mapped.code, message: mapped.message, details: null });
      return;
    }
    console.error(`Unmapped Prisma error ${err.code} on ${req.method} ${req.originalUrl}:`, err.message);
    res.status(500).json({ code: "DATABASE_ERROR", message: "A database error occurred", details: null });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error(`Prisma validation error on ${req.method} ${req.originalUrl}:`, err.message);
    res.status(500).json({ code: "DATABASE_ERROR", message: "A database error occurred", details: null });
    return;
  }

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong", details: null });
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ code: "ROUTE_NOT_FOUND", message: "Route not found", details: null });
};
