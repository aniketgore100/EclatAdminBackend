import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { homepageSectionService } from "../services/homepage-section.service.js";
import { HOMEPAGE_SECTION_TYPES } from "../homepage/section-registry.js";
import { uploadService } from "../services/upload.service.js";

const sectionType = z.enum(HOMEPAGE_SECTION_TYPES);

const createSchema = z.object({
  type: sectionType,
  key: z.string().min(1).optional(),
  name: z.string().min(1),
  enabled: z.boolean().optional(),
  content: z.unknown(),
  settings: z.unknown().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  content: z.unknown().optional(),
  settings: z.unknown().optional(),
});

const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

const idParamSchema = z.object({ id: z.string().uuid() });

const PREVIEW_TOKEN_TTL_MS = 30 * 60 * 1000;
const SUPPORTED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
const imagePresignSchema = z.object({
  sectionId: z.string().uuid(),
  // Caller-chosen slot identifier (e.g. "slides.0.image") so a section with
  // several image fields (HERO's 3 slides, OCCASIONS' 7 items, ...) gets a
  // stable key per slot — re-uploading to the same slot overwrites in place.
  field: z.string().min(1),
  contentType: z.enum(SUPPORTED_IMAGE_TYPES),
});

export const homepageSectionController = {
  async list(_req: Request, res: Response) {
    const rows = await homepageSectionService.list();
    res.status(200).json({ data: rows });
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const row = await homepageSectionService.getById(id);
    res.status(200).json({ data: row });
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const row = await homepageSectionService.create(data);
    res.status(201).json({ data: row });
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateSchema.parse(req.body);
    const row = await homepageSectionService.update(id, data);
    res.status(200).json({ data: row });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await homepageSectionService.remove(id);
    res.status(204).send();
  },

  async duplicate(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const row = await homepageSectionService.duplicate(id);
    res.status(201).json({ data: row });
  },

  async reorder(req: Request, res: Response) {
    const { ids } = reorderSchema.parse(req.body);
    await homepageSectionService.reorder(ids);
    const rows = await homepageSectionService.list();
    res.status(200).json({ data: rows });
  },

  async getStatus(_req: Request, res: Response) {
    const status = await homepageSectionService.getStatus();
    res.status(200).json({ data: status });
  },

  async publish(_req: Request, res: Response) {
    const status = await homepageSectionService.publish();
    res.status(200).json({ data: status });
  },

  async unpublish(_req: Request, res: Response) {
    const status = await homepageSectionService.unpublish();
    res.status(200).json({ data: status });
  },

  // Issues a short-lived token the storefront's homepage route can exchange
  // for the DRAFT content — both backends read the same DB row, no signing
  // secret needs to be shared between the two services.
  async createPreviewToken(_req: Request, res: Response) {
    const expiresAt = new Date(Date.now() + PREVIEW_TOKEN_TTL_MS);
    const row = await prisma.homepagePreviewToken.create({ data: { expiresAt } });
    res.status(201).json({ data: { token: row.token, expiresAt: row.expiresAt } });
  },

  // The browser PUTs directly to S3 with this URL, then includes the
  // returned publicUrl in its next `content` PATCH — there's no separate
  // "confirm" step since the URL just becomes part of that JSON blob rather
  // than a dedicated column to update server-side.
  async presignImage(req: Request, res: Response) {
    const { sectionId, field, contentType } = imagePresignSchema.parse(req.body);
    const key = uploadService.buildStableKey(`homepage/${sectionId}`, field.replace(/[^a-zA-Z0-9._-]/g, "_"), contentType);
    const { uploadUrl, publicUrl } = await uploadService.createPresignedUpload(key, contentType);
    res.status(200).json({ data: { uploadUrl, publicUrl } });
  },
};
