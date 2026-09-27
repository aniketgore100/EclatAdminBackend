// Shared CRUD for the storefront's admin-managed facet lookups —
// ProductType, Polish, Stone, PearlColour. Identical shape (name, slug,
// position, isActive, optional hex), so one factory backs all four instead
// of four near-duplicate repository files.
type FacetRow = {
  id: string;
  name: string;
  slug: string;
  hex?: string | null;
  position: number;
  isActive: boolean;
};

type FacetDelegate = {
  create: (args: { data: { name: string; slug: string; hex?: string; position?: number } }) => Promise<FacetRow>;
  findMany: (args: { orderBy: { position: "asc" } }) => Promise<FacetRow[]>;
  findUnique: (args: { where: { id: string } }) => Promise<FacetRow | null>;
  count: (args: { where: { id: string } }) => Promise<number>;
  delete: (args: { where: { id: string } }) => Promise<FacetRow>;
};

export function createFacetRepository(delegate: FacetDelegate) {
  return {
    create(data: { name: string; slug: string; hex?: string; position?: number }) {
      return delegate.create({ data });
    },

    findAll(): Promise<FacetRow[]> {
      return delegate.findMany({ orderBy: { position: "asc" } });
    },

    findById(id: string): Promise<FacetRow | null> {
      return delegate.findUnique({ where: { id } });
    },

    delete(id: string): Promise<FacetRow> {
      return delegate.delete({ where: { id } });
    },
  };
}
