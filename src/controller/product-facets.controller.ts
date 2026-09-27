import { prisma } from "../config/prisma.js";
import { createFacetRepository } from "../repository/facet.repository.js";
import { createFacetService } from "../services/facet.service.js";
import { createFacetController } from "./facet.controller.js";

// Concrete admin-managed facet lookups the storefront filters/renders by —
// see facet.repository.ts / facet.service.ts / facet.controller.ts for the
// shared CRUD they're built from.
export const productTypeController = createFacetController(
  createFacetService(createFacetRepository(prisma.productType), "PRODUCT_TYPE_NOT_FOUND")
);

export const polishController = createFacetController(
  createFacetService(createFacetRepository(prisma.polish), "POLISH_NOT_FOUND")
);

export const stoneController = createFacetController(
  createFacetService(createFacetRepository(prisma.stone), "STONE_NOT_FOUND")
);

export const pearlColourController = createFacetController(
  createFacetService(createFacetRepository(prisma.pearlColour), "PEARL_COLOUR_NOT_FOUND")
);
