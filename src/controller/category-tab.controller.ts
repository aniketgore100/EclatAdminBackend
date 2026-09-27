import { prisma } from "../config/prisma.js";
import { createFacetRepository } from "../repository/facet.repository.js";
import { createFacetService } from "../services/facet.service.js";
import { createFacetController } from "./facet.controller.js";

// Admin-managed tabs for the Catalogue view (e.g. "Live Collection",
// "Featured Collection") — built on the same shared CRUD as the product
// facet lookups (type/polish/stone/pearl colour).
export const categoryTabController = createFacetController(
  createFacetService(createFacetRepository(prisma.categoryTab), "CATEGORY_TAB_NOT_FOUND")
);
