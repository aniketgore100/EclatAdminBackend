import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { HomepageSectionGetPayload } from "../generated/prisma/models.js";
import type { HomepageSectionType } from "../homepage/section-registry.js";

export type HomepageSectionRow = HomepageSectionGetPayload<object>;

export const homepageSectionRepository = {
  findAll(): Promise<HomepageSectionRow[]> {
    return prisma.homepageSection.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  },

  findById(id: string): Promise<HomepageSectionRow | null> {
    return prisma.homepageSection.findUnique({ where: { id } });
  },

  create(data: {
    type: HomepageSectionType;
    key: string;
    name: string;
    order: number;
    enabled: boolean;
    content: object;
    settings?: object;
  }): Promise<HomepageSectionRow> {
    return prisma.homepageSection.create({ data });
  },

  update(
    id: string,
    data: Partial<{ name: string; order: number; enabled: boolean; content: object; settings: object | null }>
  ): Promise<HomepageSectionRow> {
    const { settings, ...rest } = data;
    return prisma.homepageSection.update({
      where: { id },
      data: {
        ...rest,
        ...(settings !== undefined ? { settings: settings === null ? Prisma.JsonNull : settings } : {}),
      },
    });
  },

  delete(id: string): Promise<HomepageSectionRow> {
    return prisma.homepageSection.delete({ where: { id } });
  },

  reorder(ids: string[]): Promise<unknown> {
    return prisma.$transaction(ids.map((id, index) => prisma.homepageSection.update({ where: { id }, data: { order: index } })));
  },

  // Copies every row's draft state (content/settings/order/enabled) into its
  // published mirror in one statement — atomic, and there's always a stable
  // live version even while later edits are in progress.
  publishAll(): Promise<unknown> {
    return prisma.$executeRaw`
      UPDATE "homepage_sections"
      SET "publishedOrder" = "order",
          "publishedEnabled" = "enabled",
          "publishedContent" = "content",
          "publishedSettings" = "settings",
          "publishedAt" = now()
    `;
  },
};
