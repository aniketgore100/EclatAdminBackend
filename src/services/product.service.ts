import { productRepository } from "../repository/product.repository.js";
import { uploadService } from "./upload.service.js";
import { AppError, NotFoundError } from "../middlewares/errorHandler.js";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
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
}

export const productService = {
  create(data: CreateProductInput) {
    const slug = data.slug?.trim() || slugify(data.name);
    return productRepository.create({ ...data, slug });
  },

  list(categoryId?: string) {
    return productRepository.findAll(categoryId);
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw NotFoundError("Product not found", "PRODUCT_NOT_FOUND");
    return product;
  },

  async presignImage(id: string, contentType: string) {
    await this.getById(id); // 404s if the product doesn't exist
    const key = uploadService.buildKey(`products/${id}`, contentType);
    const { uploadUrl, publicUrl } = await uploadService.createPresignedUpload(key, contentType);
    return { uploadUrl, key, publicUrl };
  },

  async confirmImage(id: string, key: string, alt?: string) {
    await this.getById(id); // 404s if the product doesn't exist
    if (!key.startsWith(`products/${id}/`)) {
      throw new AppError(400, "INVALID_UPLOAD_KEY", "Upload key does not belong to this product");
    }
    const url = uploadService.buildPublicUrl(key);
    const position = await productRepository.countImages(id);
    return productRepository.createImage({ productId: id, url, alt, position });
  },

  async createVariant(
    productId: string,
    data: {
      sku: string;
      options: Record<string, string>;
      price: number;
      mrp: number;
      weightG?: number;
      dims?: Record<string, unknown>;
      barcode?: string;
      onHand?: number;
      lowStockThreshold?: number;
    }
  ) {
    await this.getById(productId); // 404s if the product doesn't exist
    return productRepository.createVariant({
      productId,
      sku: data.sku,
      options: data.options,
      price: data.price,
      mrp: data.mrp,
      weightG: data.weightG,
      dims: data.dims,
      barcode: data.barcode,
      onHand: data.onHand ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
    });
  },
};
