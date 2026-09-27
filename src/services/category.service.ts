import { categoryRepository } from "../repository/category.repository.js";
import { uploadService } from "./upload.service.js";
import { AppError, NotFoundError } from "../middlewares/errorHandler.js";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const categoryService = {
  create(data: { name: string; slug?: string; description?: string; position?: number }) {
    const slug = data.slug?.trim() || slugify(data.name);
    return categoryRepository.create({
      name: data.name,
      slug,
      description: data.description,
      position: data.position ?? 0,
    });
  },

  list() {
    return categoryRepository.findAll();
  },

  async getById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw NotFoundError("Category not found", "CATEGORY_NOT_FOUND");
    return category;
  },

  async presignImage(id: string, field: "image" | "banner", contentType: string) {
    await this.getById(id); // 404s if the category doesn't exist
    const key = uploadService.buildKey(`categories/${id}`, contentType);
    const { uploadUrl, publicUrl } = await uploadService.createPresignedUpload(key, contentType);
    return { uploadUrl, key, publicUrl, field };
  },

  async confirmImage(id: string, field: "image" | "banner", key: string) {
    await this.getById(id); // 404s if the category doesn't exist
      if (!key.startsWith(`categories/${id}/`)) {
      throw new AppError(400, "INVALID_UPLOAD_KEY", "Upload key does not belong to this category");
    }
    const url = uploadService.buildPublicUrl(key);
    return categoryRepository.updateImage(id, field, url);
  },

  async remove(id: string) {
    await this.getById(id); // 404s if the category doesn't exist
    const productCount = await categoryRepository.countProducts(id);
    if (productCount > 0) {
      throw new AppError(
        409,
        "CATEGORY_HAS_PRODUCTS",
        `Cannot delete: ${productCount} product(s) still belong to this category. Move or delete them first.`
      );
    }
    await categoryRepository.delete(id);
  },
};
