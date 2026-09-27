import { Router } from "express";
import { authController } from "../controller/auth.controller.js";
import { categoryController } from "../controller/category.controller.js";
import { categoryTabController } from "../controller/category-tab.controller.js";
import { homepageSectionController } from "../controller/homepage-section.controller.js";
import { productController } from "../controller/product.controller.js";
import {
  pearlColourController,
  polishController,
  productTypeController,
  stoneController,
} from "../controller/product-facets.controller.js";
import { requireAdminAuth } from "../middlewares/authenticate.js";
import { rateLimit } from "../middlewares/rateLimit.js";

export const adminRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyPrefix: "admin-login",
  message: "Too many login attempts. Try again later.",
});

// Auth
adminRoutes.post("/auth/login", loginLimiter, authController.login);
adminRoutes.post("/auth/refresh-token", authController.refresh);
adminRoutes.post("/auth/logout", authController.logout);
adminRoutes.get("/auth/me", requireAdminAuth, authController.me);

// Categories — all require a logged-in admin
adminRoutes.post("/categories", requireAdminAuth, categoryController.create);
adminRoutes.get("/categories", requireAdminAuth, categoryController.list);
adminRoutes.get("/categories/:id", requireAdminAuth, categoryController.getById);
adminRoutes.patch("/categories/:id", requireAdminAuth, categoryController.update);
adminRoutes.delete("/categories/:id", requireAdminAuth, categoryController.remove);
// Direct-to-S3 image upload: presign -> browser PUTs straight to S3 -> confirm
adminRoutes.post("/categories/:id/image/presign", requireAdminAuth, categoryController.presignImage);
adminRoutes.post("/categories/:id/image/confirm", requireAdminAuth, categoryController.confirmImage);

// Category tabs — the Catalogue view's tab bar (e.g. "Live Collection",
// "Featured Collection"), admin-creatable rather than a fixed list.
adminRoutes.post("/category-tabs", requireAdminAuth, categoryTabController.create);
adminRoutes.get("/category-tabs", requireAdminAuth, categoryTabController.list);
adminRoutes.get("/category-tabs/:id", requireAdminAuth, categoryTabController.getById);
adminRoutes.delete("/category-tabs/:id", requireAdminAuth, categoryTabController.remove);

// Product facets — admin-managed lookups the storefront filter drawer and
// product card render by (type/polish/stone/pearl colour), CRUD'd here
// instead of being fixed in code.
adminRoutes.post("/product-types", requireAdminAuth, productTypeController.create);
adminRoutes.get("/product-types", requireAdminAuth, productTypeController.list);
adminRoutes.get("/product-types/:id", requireAdminAuth, productTypeController.getById);
adminRoutes.delete("/product-types/:id", requireAdminAuth, productTypeController.remove);

adminRoutes.post("/polishes", requireAdminAuth, polishController.create);
adminRoutes.get("/polishes", requireAdminAuth, polishController.list);
adminRoutes.get("/polishes/:id", requireAdminAuth, polishController.getById);
adminRoutes.delete("/polishes/:id", requireAdminAuth, polishController.remove);

adminRoutes.post("/stones", requireAdminAuth, stoneController.create);
adminRoutes.get("/stones", requireAdminAuth, stoneController.list);
adminRoutes.get("/stones/:id", requireAdminAuth, stoneController.getById);
adminRoutes.delete("/stones/:id", requireAdminAuth, stoneController.remove);

adminRoutes.post("/pearl-colours", requireAdminAuth, pearlColourController.create);
adminRoutes.get("/pearl-colours", requireAdminAuth, pearlColourController.list);
adminRoutes.get("/pearl-colours/:id", requireAdminAuth, pearlColourController.getById);
adminRoutes.delete("/pearl-colours/:id", requireAdminAuth, pearlColourController.remove);

// Homepage CMS — every section on the storefront homepage (plus site-wide
// chrome: header/announcement bar/footer), admin-editable with a draft ->
// preview -> publish workflow. See src/homepage/section-registry.ts for the
// per-type content shape.
adminRoutes.get("/homepage/status", requireAdminAuth, homepageSectionController.getStatus);
adminRoutes.post("/homepage/publish", requireAdminAuth, homepageSectionController.publish);
adminRoutes.post("/homepage/unpublish", requireAdminAuth, homepageSectionController.unpublish);
adminRoutes.post("/homepage/preview-token", requireAdminAuth, homepageSectionController.createPreviewToken);
adminRoutes.post("/homepage/images/presign", requireAdminAuth, homepageSectionController.presignImage);
adminRoutes.patch("/homepage/sections/reorder", requireAdminAuth, homepageSectionController.reorder);
adminRoutes.post("/homepage/sections", requireAdminAuth, homepageSectionController.create);
adminRoutes.get("/homepage/sections", requireAdminAuth, homepageSectionController.list);
adminRoutes.get("/homepage/sections/:id", requireAdminAuth, homepageSectionController.getById);
adminRoutes.patch("/homepage/sections/:id", requireAdminAuth, homepageSectionController.update);
adminRoutes.delete("/homepage/sections/:id", requireAdminAuth, homepageSectionController.remove);
adminRoutes.post("/homepage/sections/:id/duplicate", requireAdminAuth, homepageSectionController.duplicate);

// Products — always tagged to a category via categoryId (see createProductSchema)
adminRoutes.post("/products", requireAdminAuth, productController.create);
adminRoutes.get("/products", requireAdminAuth, productController.list);
adminRoutes.get("/products/:id", requireAdminAuth, productController.getById);
adminRoutes.patch("/products/:id", requireAdminAuth, productController.update);
adminRoutes.post("/products/:id/variants", requireAdminAuth, productController.createVariant);
adminRoutes.patch("/products/:id/variants/:variantId", requireAdminAuth, productController.updateVariant);
adminRoutes.post("/products/:id/image/presign", requireAdminAuth, productController.presignImage);
adminRoutes.post("/products/:id/image/confirm", requireAdminAuth, productController.confirmImage);
