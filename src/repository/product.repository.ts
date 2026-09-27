import { prisma } from "../config/prisma.js";
import type { ProductGetPayload } from "../generated/prisma/models.js";
import type { Prisma } from "../generated/prisma/client.js";

const detailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: "asc" as const } },
  optionTypes: true,
  variants: { include: { inventory: true, images: true } },
} as const;

export type ProductDetail = ProductGetPayload<{ include: typeof detailInclude }>;

export const productRepository = {
  create(data: {
    categoryId: string;
    name: string;
    slug: string;
    subtitle?: string;
    description?: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    featured?: boolean;
    isNew?: boolean;
    tags?: string[];
    badges?: string[];
    codAllowed?: boolean;
    insured?: boolean;
    pearlType?: string;
    pearlGrade?: string;
    pearlSizeMm?: number;
    pearlColour?: string;
    pearlLustre?: string;
    pond?: string;
    harvestBatch?: string;
    monthsInWater?: number;
    setting?: string;
    purity?: string;
    seoTitle?: string;
    seoMeta?: string;
    seoOgImage?: string;
  }): Promise<ProductGetPayload<object>> {
    return prisma.product.create({ data });
  },

  findAll(
    categoryId?: string
  ): Promise<
    ProductGetPayload<{
      include: {
        category: { select: { slug: true; name: true } };
        images: { orderBy: { position: "asc" }; take: 1 };
      };
    }>[]
  > {
    return prisma.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: { select: { slug: true, name: true } },
        images: { orderBy: { position: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string): Promise<ProductDetail | null> {
    return prisma.product.findUnique({ where: { id }, include: detailInclude });
  },

  createImage(data: { productId: string; url: string; alt?: string; position: number }) {
    return prisma.productImage.create({ data });
  },

  countImages(productId: string): Promise<number> {
    return prisma.productImage.count({ where: { productId } });
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
};
