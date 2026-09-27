import { prisma } from "../config/prisma.js";
import type { CategoryGetPayload } from "../generated/prisma/models.js";

export const categoryRepository = {
  create(data: {
    name: string;
    slug: string;
    description?: string;
    position?: number;
  }): Promise<CategoryGetPayload<object>> {
    return prisma.category.create({ data });
  },

  findAll(): Promise<CategoryGetPayload<object>[]> {
    return prisma.category.findMany({ orderBy: { position: "asc" } });
  },

  findById(id: string): Promise<CategoryGetPayload<object> | null> {
    return prisma.category.findUnique({ where: { id } });
  },

  updateImage(id: string, field: "image" | "banner", url: string): Promise<CategoryGetPayload<object>> {
    return prisma.category.update({
      where: { id },
      data: field === "image" ? { image: url } : { banner: url },
    });
  },

  countProducts(categoryId: string): Promise<number> {
    return prisma.product.count({ where: { categoryId } });
  },

  delete(id: string): Promise<CategoryGetPayload<object>> {
    return prisma.category.delete({ where: { id } });
  },
};
