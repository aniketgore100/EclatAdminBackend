import type { Request, Response } from "express";
import { z } from "zod";
import { productService } from "../services/product.service.js";

// All four facets are optional: the storefront already defaults each one
// when absent (p.colour ?? "White", p.stone ?? "No stone", p.polish ??
// "Gold polish", and `type` falls back through the product's category) —
// confirmed by an audit of every render site in the storefront. Requiring
// typeId/pearlColourId here just caused avoidable validation failures for
// no real benefit, since nothing downstream actually needs them set.
const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  featured: z.coerce.boolean().optional(),
  isNew: z.coerce.boolean().optional(),
  tags: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  codAllowed: z.coerce.boolean().optional(),
  insured: z.coerce.boolean().optional(),

  // Storefront filter-drawer facets — optional (see note above).
  typeId: z.string().uuid().optional(),
  polishId: z.string().uuid().optional(),
  stoneId: z.string().uuid().optional(),
  occasions: z.array(z.string()).optional(),
  displaySoldCount: z.coerce.number().int().nonnegative().optional(),

  // Pearl Passport (PRD §5.4)
  pearlType: z.string().optional(),
  pearlGrade: z.string().optional(),
  pearlSizeMm: z.coerce.number().optional(),
  pearlColourId: z.string().uuid().optional(),
  pearlLustre: z.string().optional(),
  pond: z.string().optional(),
  harvestBatch: z.string().optional(),
  monthsInWater: z.coerce.number().int().optional(),
  // Doubles as the metal/material facet the storefront shows (e.g. "925
  // Silver", "Stretch cord") — there's no separate metal column.
  setting: z.string().optional(),
  purity: z.string().optional(),

  // Free-form per-product spec rows — deliberately not fixed columns, since
  // which properties apply varies by product (a necklace has a chain length
  // and clasp; an earring doesn't, but might have a post type). Sending
  // `attributes` on an update replaces the product's full attribute list.
  attributes: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),

  seoTitle: z.string().optional(),
  seoMeta: z.string().optional(),
  seoOgImage: z.string().optional(),
});

// Same shape as create, everything optional — a PATCH only touches the
// fields actually sent.
const updateProductSchema = createProductSchema.partial();

const listQuerySchema = z.object({ categoryId: z.string().uuid().optional() });
const idParamSchema = z.object({ id: z.string().uuid() });
const variantIdParamSchema = z.object({ id: z.string().uuid(), variantId: z.string().uuid() });
const SUPPORTED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
const presignSchema = z.object({ contentType: z.enum(SUPPORTED_IMAGE_TYPES) });
const confirmSchema = z.object({ key: z.string().min(1), alt: z.string().optional() });

const createVariantSchema = z.object({
  sku: z.string().min(1),
  options: z.record(z.string(), z.string()),
  price: z.coerce.number().int().nonnegative(),
  mrp: z.coerce.number().int().nonnegative(),
  weightG: z.coerce.number().optional(),
  dims: z.record(z.string(), z.unknown()).optional(),
  barcode: z.string().optional(),
  onHand: z.coerce.number().int().nonnegative().optional(),
  lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
});

const updateVariantSchema = z.object({
  price: z.coerce.number().int().nonnegative().optional(),
  mrp: z.coerce.number().int().nonnegative().optional(),
  onHand: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const productController = {
  async create(req: Request, res: Response) {
    const data = createProductSchema.parse(req.body);
    const product = await productService.create(data);
    res.status(201).json({ data: product });
  },

  async list(req: Request, res: Response) {
    const { categoryId } = listQuerySchema.parse(req.query);
    const products = await productService.list(categoryId);
    res.status(200).json({ data: products });
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const product = await productService.getById(id);
    res.status(200).json({ data: product });
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);
    const product = await productService.update(id, data);
    res.status(200).json({ data: product });
  },

  async presignImage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { contentType } = presignSchema.parse(req.body);
    const result = await productService.presignImage(id, contentType);
    res.status(200).json({ data: result });
  },

  async confirmImage(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { key, alt } = confirmSchema.parse(req.body);
    const image = await productService.confirmImage(id, key, alt);
    res.status(201).json({ data: image });
  },

  async createVariant(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const data = createVariantSchema.parse(req.body);
    const variant = await productService.createVariant(id, data);
    res.status(201).json({ data: variant });
  },

  async updateVariant(req: Request, res: Response) {
    const { id, variantId } = variantIdParamSchema.parse(req.params);
    const data = updateVariantSchema.parse(req.body);
    const variant = await productService.updateVariant(id, variantId, data);
    res.status(200).json({ data: variant });
  },
};
