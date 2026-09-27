import { prisma } from "../config/prisma.js";
import type { ProductGetPayload } from "../generated/prisma/models.js";
import type { Prisma } from "../generated/prisma/client.js";

const detailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: "asc" as const } },
  optionTypes: true,
  variants: { include: { inventory: true, images: true } },
  attributes: { orderBy: { position: "asc" as const } },
  type: true,
  polish: true,
  stone: true,
  pearlColour: true,
} as const;

const listInclude = {
  category: { select: { id: true, slug: true, name: true } },
  images: { orderBy: { position: "asc" as const }, take: 1 },
  variants: { include: { inventory: true } },
  attributes: { orderBy: { position: "asc" as const } },
  type: { select: { id: true, name: true } },
  polish: { select: { id: true, name: true } },
  stone: { select: { id: true, name: true } },
  pearlColour: { select: { id: true, name: true } },
} as const;

export type ProductDetail = ProductGetPayload<{ include: typeof detailInclude }>;

type ProductWriteData = {
  categoryId?: string;
  name?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured?: boolean;
  isNew?: boolean;
  tags?: string[];
  badges?: string[];
  codAllowed?: boolean;
  insured?: boolean;
  typeId?: string;
  polishId?: string;
  stoneId?: string;
  occasions?: string[];
  displaySoldCount?: number;
  pearlType?: string;
  pearlGrade?: string;
  pearlSizeMm?: number;
  pearlColourId?: string;
  pearlLustre?: string;
  pond?: string;
  harvestBatch?: string;
  monthsInWater?: number;
  setting?: string;
  purity?: string;
  attributes?: { label: string; value: string }[];
  seoTitle?: string;
  seoMeta?: string;
  seoOgImage?: string;
};

export const productRepository = {
  create(data: ProductWriteData & { categoryId: string; name: string; slug: string }): Promise<ProductGetPayload<object>> {
    const { attributes, ...rest } = data;
    return prisma.product.create({
      data: {
        ...rest,
        ...(attributes?.length
          ? { attributes: { create: attributes.map((a, i) => ({ label: a.label, value: a.value, position: i })) } }
          : {}),
      },
    });
  },

  update(id: string, data: ProductWriteData): Promise<ProductGetPayload<object>> {
    const { attributes, ...rest } = data;
    return prisma.product.update({
      where: { id },
      data: {
        ...rest,
        // `attributes` sent at all means "replace the full list" — clear
        // what's there and write the new set in one nested write.
        ...(attributes !== undefined
          ? { attributes: { deleteMany: {}, create: attributes.map((a, i) => ({ label: a.label, value: a.value, position: i })) } }
          : {}),
      },
    });
  },

  findAll(categoryId?: string): Promise<ProductGetPayload<{ include: typeof listInclude }>[]> {
    return prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string): Promise<ProductDetail | null> {
    return prisma.product.findUnique({ where: { id }, include: detailInclude });
  },

  // The admin UI manages exactly one photo per product today (no gallery
  // yet) — re-uploading replaces that same slot instead of adding another
  // row, matching how a category's image/banner already overwrite in place.
  async upsertPrimaryImage(productId: string, url: string, alt?: string) {
    const existing = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: "asc" },
    });
    if (existing) {
      return prisma.productImage.update({ where: { id: existing.id }, data: { url, alt } });
    }
    return prisma.productImage.create({ data: { productId, url, alt, position: 0 } });
  },

  async createVariant(data: {
    productId: string;
    sku: string;
    options: Record<string, string>;
    price: number;
    mrp: number;
    weightG?: number;
    dims?: Record<string, unknown>;
    barcode?: string;
    onHand: number;
    lowStockThreshold: number;
  }) {
    return prisma.variant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        options: data.options,
        price: data.price,
        mrp: data.mrp,
        weightG: data.weightG,
        dims: data.dims as Prisma.InputJsonValue | undefined,
        barcode: data.barcode,
        inventory: {
          create: { onHand: data.onHand, lowStockThreshold: data.lowStockThreshold },
        },
      },
      include: { inventory: true },
    });
  },

  findVariant(variantId: string) {
    return prisma.variant.findUnique({ where: { id: variantId } });
  },

  updateVariant(
    variantId: string,
    data: { price?: number; mrp?: number; onHand?: number; status?: "ACTIVE" | "ARCHIVED" }
  ) {
    const { onHand, ...variantData } = data;
    return prisma.variant.update({
      where: { id: variantId },
      data: {
        ...variantData,
        ...(onHand !== undefined ? { inventory: { update: { onHand } } } : {}),
      },
      include: { inventory: true },
    });
  },
};
