import type { Request, Response } from "express";
import { z } from "zod";
import { categoryService } from "../services/category.service.js";

// Category doubles as the storefront's curated home-page tile (formerly a
// separate Collection model) — eyebrow/title/text/caption are that tile's
// marketing copy.
const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  caption: z.string().optional(),
  position: z.coerce.number().int().optional(),
  categoryTabId: z.string().uuid().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  caption: z.string().optional(),
  position: z.coerce.number().int().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  categoryTabId: z.string().uuid().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const SUPPORTED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
// `image` = home page tile thumbnail, `banner` = this category's own page
// hero — deliberately two different uploads, not the same picture twice.
const presignSchema = z.object({
  contentType: z.enum(SUPPORTED_IMAGE_TYPES),
  field: z.enum(["image", "banner"]).default("image"),
});
const confirmSchema = z.object({
  key: z.string().min(1),
  field: z.enum(["image", "banner"]).default("image"),
});

export const categoryController = {
  async create(req: Request, res: Response) {
    const data = createCategorySchema.parse(req.body);
    const category = await categoryService.create(data);
    res.status(201).json({ data: category });
  },

  async list(_req: Request, res: Response) {
    const categories = await categoryService.list();
    res.status(200).json({ data: categories });
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const category = await categoryService.getById(id);
    res.status(200).json({ data: category });
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateCategorySchema.parse(req.body);
    const category = await categoryService.update(id, data);
    res.status(200).json({ data: category });
  },


  async presignImage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { contentType, field } = presignSchema.parse(req.body);
    const result = await categoryService.presignImage(id, field, contentType);
    res.status(200).json({ data: result });
  },

  async confirmImage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { key, field } = confirmSchema.parse(req.body);
    const category = await categoryService.confirmImage(id, field, key);
    res.status(200).json({ data: category });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await categoryService.remove(id);
    res.status(204).send();
  },
};
