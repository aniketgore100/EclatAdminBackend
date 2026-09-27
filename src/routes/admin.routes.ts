import { Router } from "express";
import { authController } from "../controller/auth.controller.js";
import { categoryController } from "../controller/category.controller.js";
import { productController } from "../controller/product.controller.js";
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
adminRoutes.delete("/categories/:id", requireAdminAuth, categoryController.remove);
// Direct-to-S3 image upload: presign -> browser PUTs straight to S3 -> confirm
adminRoutes.post("/categories/:id/image/presign", requireAdminAuth, categoryController.presignImage);
adminRoutes.post("/categories/:id/image/confirm", requireAdminAuth, categoryController.confirmImage);

// Products — always tagged to a category via categoryId (see createProductSchema)
adminRoutes.post("/products", requireAdminAuth, productController.create);
adminRoutes.get("/products", requireAdminAuth, productController.list);
adminRoutes.get("/products/:id", requireAdminAuth, productController.getById);
adminRoutes.post("/products/:id/variants", requireAdminAuth, productController.createVariant);
adminRoutes.post("/products/:id/image/presign", requireAdminAuth, productController.presignImage);
adminRoutes.post("/products/:id/image/confirm", requireAdminAuth, productController.confirmImage);
