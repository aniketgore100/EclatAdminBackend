import { z } from "zod";

// Keep in sync with the `HomepageSectionType` enum in prisma/schema.prisma
// (and with the identical copy of this file in Eclat's catalogue module —
// the two backends don't share a package, so this registry is duplicated
// deliberately rather than introducing a cross-repo dependency).
export const HOMEPAGE_SECTION_TYPES = [
  "ANNOUNCEMENT_BAR",
  "HEADER",
  "HERO",
  "TRUST_STRIP",
  "CATEGORY_NAV",
  "HIGHLIGHTS",
  "ECLAT_EDIT",
  "BANNER",
  "OCCASIONS",
  "FEATURED_COLLECTION",
  "CURATED_EDITS",
  "PEARL_MOOD",
  "SHOP_THE_LOOK",
  "TESTIMONIALS",
  "JOURNAL",
  "PEARL_GUIDE",
  "MOST_SEARCHED",
  "NEWSLETTER",
  "FOOTER",
] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

// These three render on every page (site chrome), not just the homepage —
// the admin UI pins them: content-editable, but not reorderable/duplicable/
// deletable, since removing your own header/footer would break every route.
export const PINNED_SECTION_TYPES: readonly HomepageSectionType[] = ["HEADER", "ANNOUNCEMENT_BAR", "FOOTER"];

const productId = z.string().uuid();
const image = z.string().min(1);
const text = z.string().min(1);

const link = z.object({ label: text, to: text });

const heroSlide = z.object({
  image,
  imageMobile: z.string().optional(),
  alt: text,
  collection: text,
  kicker: text,
  line: text,
  slug: text,
});

const highlightsTab = z.object({
  id: text,
  label: text,
  icon: text,
  slug: text,
  cta: text,
  productIds: z.array(productId).min(1),
});

const reelTile = z
  .object({
    image,
    imageMobile: z.string().optional(),
    alt: text,
    caption: text,
    linkType: z.enum(["product", "custom"]),
    productId: productId.optional(),
    to: z.string().optional(),
    label: z.string().optional(),
  })
  .refine((t) => (t.linkType === "product" ? !!t.productId : !!t.to && !!t.label), {
    message: "Product tiles need a product; custom tiles need a link and label.",
  });

const occasionItem = z.object({
  slug: text,
  label: text,
  image,
  imageMobile: z.string().optional(),
  position: z.string().optional(),
  note: text,
  productIds: z.array(productId).default([]),
});

const editTile = z.object({
  slug: text,
  kicker: text,
  title: text,
  image,
  imageMobile: z.string().optional(),
  alt: text,
  position: z.string().optional(),
  productIds: z.array(productId).min(1),
});

const lookSide = z.object({ label: text, image, imageMobile: z.string().optional(), alt: text, productId });

const hotspot = z.object({
  productId,
  label: text,
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
});

const testimonialEntry = z.object({
  name: text,
  city: text,
  quote: text,
  rating: z.coerce.number().int().min(1).max(5),
  image,
});

const trustStat = z.object({ value: text, label: text });

const journalPost = z.object({ image, title: text, readTime: text, slug: text });

const design = z.object({ productId, label: text, colour: text, lede: text });

const searchChip = z.object({ label: text, type: z.enum(["category", "collection", "query"]), value: text });
const searchGroup = z.object({ title: text, chips: z.array(searchChip).min(1), productIds: z.array(productId).default([]) });

const footerColumn = z.object({ title: text, links: z.array(link).min(1) });

// Per-type content schema. `content` on the row is validated against
// whichever of these matches the row's `type`.
export const SECTION_CONTENT_SCHEMAS: Record<HomepageSectionType, z.ZodTypeAny> = {
  ANNOUNCEMENT_BAR: z.object({ messages: z.array(text).min(1) }),
  HEADER: z.object({ navLinks: z.array(link).min(1), whatsappNumber: text }),
  HERO: z.object({ slides: z.array(heroSlide).min(1), promises: z.array(text) }),
  TRUST_STRIP: z.object({ items: z.array(z.object({ icon: text, label: text })).min(1) }),
  CATEGORY_NAV: z.object({
    items: z
      .array(z.object({ name: text, slug: text, image, position: z.string().optional() }))
      .min(1),
  }),
  HIGHLIGHTS: z.object({ eyebrow: text, title: text, sub: text, tabs: z.array(highlightsTab).min(1) }),
  ECLAT_EDIT: z.object({ eyebrow: text, title: text, sub: text, tiles: z.array(reelTile).min(1) }),
  BANNER: z.object({ image, imageMobile: z.string().optional(), alt: text, link: z.string().optional() }),
  OCCASIONS: z.object({ eyebrow: text, title: text, sub: text, items: z.array(occasionItem).min(1) }),
  FEATURED_COLLECTION: z.object({
    eyebrow: text,
    title: text,
    sub: text,
    heroImage: image,
    heroImageMobile: z.string().optional(),
    heroAlt: text,
    collectionSlug: text,
    ctaLabel: text,
    ringText: z.string().optional(),
    coverTitle: z.string().optional(),
    coverBody: z.string().optional(),
    productIds: z.array(productId).min(1),
  }),
  CURATED_EDITS: z.object({ eyebrow: text, title: text, sub: text, tiles: z.array(editTile).min(1) }),
  PEARL_MOOD: z.object({ eyebrow: text, title: text, sub: text, left: lookSide, right: lookSide }),
  SHOP_THE_LOOK: z.object({
    eyebrow: text,
    title: text,
    lede: text,
    image,
    imageMobile: z.string().optional(),
    alt: text,
    hotspots: z.array(hotspot).min(1),
  }),
  TESTIMONIALS: z.object({
    label: text,
    title: text,
    sub: text,
    ctaLabel: text,
    entries: z.array(testimonialEntry).min(1),
    showTrustBar: z.boolean(),
    trustStats: z.array(trustStat),
    pullQuote: z.string().optional(),
    pullQuoteAttribution: z.string().optional(),
  }),
  JOURNAL: z.object({ eyebrow: text, title: text, ctaLabel: text, posts: z.array(journalPost).min(1) }),
  PEARL_GUIDE: z.object({ eyebrow: text, title: text, designs: z.array(design).min(1) }),
  MOST_SEARCHED: z.object({
    eyebrow: text,
    title: text,
    sub: text,
    popularChips: z.array(text).min(1),
    groups: z.array(searchGroup).min(1),
  }),
  NEWSLETTER: z.object({ eyebrow: text, title: text, sub: text }),
  FOOTER: z.object({
    tagline: text,
    whatsappNumber: text,
    instagramUrl: z.string().optional(),
    columns: z.array(footerColumn).min(1),
    paymentMethodsText: text,
    copyrightText: text,
  }),
};

export const SECTION_SETTINGS_SCHEMAS: Partial<Record<HomepageSectionType, z.ZodTypeAny>> = {
  HERO: z.object({ slideDurationMs: z.coerce.number().int().positive().optional() }),
  FEATURED_COLLECTION: z.object({ layout: z.enum(["grid", "orbit", "wave"]) }),
};

// Recursively collects every product id referenced anywhere in a section's
// content (any `productId` field, any `productIds` array) — used to
// validate references exist and to resolve them to real product data on the
// storefront read path, without needing a per-type extractor.
export function extractProductIds(value: unknown, acc: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) extractProductIds(item, acc);
  } else if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === "productId" && typeof val === "string") acc.add(val);
      else if (key === "productIds" && Array.isArray(val)) {
        for (const id of val) if (typeof id === "string") acc.add(id);
      } else {
        extractProductIds(val, acc);
      }
    }
  }
  return acc;
}
