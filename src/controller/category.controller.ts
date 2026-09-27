import type { Request, Response } from "express";
import { z } from "zod";
import { categoryService } from "../services/category.service.js";

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  position: z.coerce.number().int().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const SUPPORTED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
const presignSchema = z.object({
  contentType: z.enum(SUPPORTED_IMAGE_TYPES),
  type: z.enum(["image", "banner"]).default("image"),
});
const confirmSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["image", "banner"]).default("image"),
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


  async presignImage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { contentType, type } = presignSchema.parse(req.body);
    const result = await categoryService.presignImage(id, type, contentType);
    res.status(200).json({ data: result });
  },

  async confirmImage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { key, type } = confirmSchema.parse(req.body);
    const category = await categoryService.confirmImage(id, type, key);
    res.status(200).json({ data: category });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await categoryService.remove(id);
    res.status(204).send();
  },
};
