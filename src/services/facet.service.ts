import { createFacetRepository } from "../repository/facet.repository.js";
import { NotFoundError } from "../middlewares/errorHandler.js";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createFacetService(
  repository: ReturnType<typeof createFacetRepository>,
  notFoundCode: string
) {
  return {
    create(data: { name: string; slug?: string; hex?: string; position?: number }) {
      const slug = data.slug?.trim() || slugify(data.name);
      return repository.create({ ...data, slug });
    },

    list() {
      return repository.findAll();
    },

    async getById(id: string) {
      const row = await repository.findById(id);
      if (!row) throw NotFoundError("Not found", notFoundCode);
      return row;
    },

    async remove(id: string) {
      await this.getById(id); // 404s if it doesn't exist
      await repository.delete(id);
    },
  };
}
