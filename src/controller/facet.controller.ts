import type { Request, Response } from "express";
import { z } from "zod";
import { createFacetService } from "../services/facet.service.js";

const createFacetSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  hex: z.string().min(1).optional(),
  position: z.coerce.number().int().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

export function createFacetController(service: ReturnType<typeof createFacetService>) {
  return {
    async create(req: Request, res: Response) {
      const data = createFacetSchema.parse(req.body);
      const row = await service.create(data);
      res.status(201).json({ data: row });
    },

    async list(_req: Request, res: Response) {
      const rows = await service.list();
      res.status(200).json({ data: rows });
    },

    async getById(req: Request, res: Response) {
      const { id } = idParamSchema.parse(req.params);
      const row = await service.getById(id);
      res.status(200).json({ data: row });
    },

    async remove(req: Request, res: Response) {
      const { id } = idParamSchema.parse(req.params);
      await service.remove(id);
      res.status(204).send();
    },
  };
}
