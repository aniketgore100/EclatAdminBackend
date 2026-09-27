import { prisma } from "../config/prisma.js";
import { homepageSectionRepository, type HomepageSectionRow } from "../repository/homepage-section.repository.js";
import { AppError, NotFoundError } from "../middlewares/errorHandler.js";
import {
  PINNED_SECTION_TYPES,
  SECTION_CONTENT_SCHEMAS,
  SECTION_SETTINGS_SCHEMAS,
  extractProductIds,
  type HomepageSectionType,
} from "../homepage/section-registry.js";

const STATUS_KEY = "homepage.status";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validateContent(type: HomepageSectionType, content: unknown) {
  const schema = SECTION_CONTENT_SCHEMAS[type];
  const result = schema.safeParse(content);
  if (!result.success) {
    throw new AppError(400, "INVALID_SECTION_CONTENT", "This section's content is invalid", result.error.flatten());
  }
  return result.data;
}

// Where a newly created/duplicated section lands — always just after the
// last non-pinned section, never past FOOTER's fixed end-of-list sentinel
// order (which would otherwise push it "below" the footer).
async function nextOrder(): Promise<number> {
  const rows = await homepageSectionRepository.findAll();
  const draggableOrders = rows
    .filter((r) => !PINNED_SECTION_TYPES.includes(r.type as HomepageSectionType))
    .map((r) => r.order);
  return (draggableOrders.length ? Math.max(...draggableOrders) : -1) + 1;
}

function validateSettings(type: HomepageSectionType, settings: unknown) {
  const schema = SECTION_SETTINGS_SCHEMAS[type];
  if (!schema) return settings ?? undefined;
  const result = schema.safeParse(settings ?? {});
  if (!result.success) {
    throw new AppError(400, "INVALID_SECTION_SETTINGS", "This section's settings are invalid", result.error.flatten());
  }
  return result.data;
}

async function assertProductsExist(content: unknown) {
  const ids = Array.from(extractProductIds(content));
  if (!ids.length) return;
  const found = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const foundIds = new Set(found.map((p: { id: string }) => p.id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw new AppError(400, "PRODUCT_NOT_FOUND", `Referenced product(s) not found: ${missing.join(", ")}`);
  }
}

export const homepageSectionService = {
  list(): Promise<HomepageSectionRow[]> {
    return homepageSectionRepository.findAll();
  },

  async getById(id: string): Promise<HomepageSectionRow> {
    const row = await homepageSectionRepository.findById(id);
    if (!row) throw NotFoundError("Section not found", "SECTION_NOT_FOUND");
    return row;
  },

  async create(data: {
    type: HomepageSectionType;
    key?: string;
    name: string;
    enabled?: boolean;
    content: unknown;
    settings?: unknown;
  }): Promise<HomepageSectionRow> {
    const content = validateContent(data.type, data.content);
    const settings = validateSettings(data.type, data.settings);
    await assertProductsExist(content);

    const key = data.key?.trim() || `${slugify(data.type)}-${slugify(data.name)}`;
    return homepageSectionRepository.create({
      type: data.type,
      key,
      name: data.name,
      order: await nextOrder(),
      enabled: data.enabled ?? true,
      content: content as object,
      settings: settings as object | undefined,
    });
  },

  async update(
    id: string,
    data: Partial<{ name: string; enabled: boolean; content: unknown; settings: unknown }>
  ): Promise<HomepageSectionRow> {
    const row = await this.getById(id);
    const patch: Partial<{ name: string; enabled: boolean; content: object; settings: object | null }> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.content !== undefined) {
      const content = validateContent(row.type as HomepageSectionType, data.content);
      await assertProductsExist(content);
      patch.content = content as object;
    }
    if (data.settings !== undefined) {
      patch.settings = (validateSettings(row.type as HomepageSectionType, data.settings) as object) ?? null;
    }
    return homepageSectionRepository.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    const row = await this.getById(id);
    if (PINNED_SECTION_TYPES.includes(row.type as HomepageSectionType)) {
      throw new AppError(409, "SECTION_PINNED", "This section is site-wide chrome and can't be deleted.");
    }
    await homepageSectionRepository.delete(id);
  },

  async duplicate(id: string): Promise<HomepageSectionRow> {
    const row = await this.getById(id);
    if (PINNED_SECTION_TYPES.includes(row.type as HomepageSectionType)) {
      throw new AppError(409, "SECTION_PINNED", "This section is site-wide chrome and can't be duplicated.");
    }
    return homepageSectionRepository.create({
      type: row.type as HomepageSectionType,
      key: `${row.key}-copy-${Date.now().toString(36)}`,
      name: `${row.name} (copy)`,
      order: await nextOrder(),
      enabled: false,
      content: row.content as object,
      settings: (row.settings as object | null) ?? undefined,
    });
  },

  async reorder(ids: string[]): Promise<void> {
    const rows = await homepageSectionRepository.findAll();
    const draggable = new Set(rows.filter((r) => !PINNED_SECTION_TYPES.includes(r.type as HomepageSectionType)).map((r) => r.id));
    const valid = ids.filter((id) => draggable.has(id));
    if (valid.length !== draggable.size) {
      throw new AppError(400, "INVALID_REORDER", "Reorder list must include exactly the current non-pinned sections.");
    }
    await homepageSectionRepository.reorder(valid);
  },

  async getStatus(): Promise<{ isLive: boolean; publishedAt: string | null }> {
    const row = await prisma.content.findUnique({ where: { key: STATUS_KEY } });
    const json = (row?.json as { isLive?: boolean; publishedAt?: string } | undefined) ?? {};
    return { isLive: json.isLive ?? false, publishedAt: json.publishedAt ?? null };
  },

  async publish(): Promise<{ isLive: boolean; publishedAt: string | null }> {
    await homepageSectionRepository.publishAll();
    const publishedAt = new Date().toISOString();
    await prisma.content.upsert({
      where: { key: STATUS_KEY },
      create: { key: STATUS_KEY, json: { isLive: true, publishedAt } },
      update: { json: { isLive: true, publishedAt } },
    });
    return { isLive: true, publishedAt };
  },

  async unpublish(): Promise<{ isLive: boolean; publishedAt: string | null }> {
    const current = await this.getStatus();
    await prisma.content.upsert({
      where: { key: STATUS_KEY },
      create: { key: STATUS_KEY, json: { isLive: false, publishedAt: current.publishedAt } },
      update: { json: { isLive: false, publishedAt: current.publishedAt } },
    });
    return { isLive: false, publishedAt: current.publishedAt };
  },
};
