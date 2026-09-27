import { prisma } from "../config/prisma.js";
import type { CategoryGetPayload } from "../generated/prisma/models.js";

// Every read also carries the tab this category belongs to (Catalogue
// view's tab bar), so the admin UI can preselect/filter without a second
// round trip.
const withTab = { categoryTab: { select: { id: true, name: true, slug: true } } } as const;

export const categoryRepository = {
  create(data: {
    name: string;
    slug: string;
    description?: string;
    eyebrow?: string;
    title?: string;
    text?: string;
    caption?: string;
    position?: number;
    categoryTabId?: string;
  }): Promise<CategoryGetPayload<{ include: typeof withTab }>> {
    return prisma.category.create({ data, include: withTab });
  },

  findAll(): Promise<CategoryGetPayload<{ include: typeof withTab }>[]> {
    return prisma.category.findMany({ orderBy: { position: "asc" }, include: withTab });
  },

  findById(id: string): Promise<CategoryGetPayload<{ include: typeof withTab }> | null> {
    return prisma.category.findUnique({ where: { id }, include: withTab });
  },

  update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      eyebrow?: string;
      title?: string;
      text?: string;
      caption?: string;
      position?: number;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      categoryTabId?: string;
    }
  ): Promise<CategoryGetPayload<{ include: typeof withTab }>> {
    return prisma.category.update({ where: { id }, data, include: withTab });
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
