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
}

export type UpdateProductInput = Partial<CreateProductInput>;

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

  async update(id: string, data: UpdateProductInput) {
    await this.getById(id); // 404s if the product doesn't exist
    return productRepository.update(id, data);
  },

  async presignImage(id: string, contentType: string) {
    await this.getById(id); // 404s if the product doesn't exist
    // Stable key: re-uploading this product's primary photo overwrites the
    // same S3 object rather than piling up a new one on every upload.
    const key = uploadService.buildStableKey(`products/${id}`, "primary", contentType);
    const { uploadUrl, publicUrl } = await uploadService.createPresignedUpload(key, contentType);
    return { uploadUrl, key, publicUrl };
  },

  async confirmImage(id: string, key: string, alt?: string) {
    await this.getById(id); // 404s if the product doesn't exist
    if (!key.startsWith(`products/${id}/`)) {
      throw new AppError(400, "INVALID_UPLOAD_KEY", "Upload key does not belong to this product");
    }
    const url = uploadService.buildPublicUrl(key);
    return productRepository.upsertPrimaryImage(id, url, alt);
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

  async updateVariant(
    productId: string,
    variantId: string,
    data: { price?: number; mrp?: number; onHand?: number; status?: "ACTIVE" | "ARCHIVED" }
  ) {
    const variant = await productRepository.findVariant(variantId);
    if (!variant || variant.productId !== productId) {
      throw NotFoundError("Variant not found", "VARIANT_NOT_FOUND");
    }
    return productRepository.updateVariant(variantId, data);
  },
};
