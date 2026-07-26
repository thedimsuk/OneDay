import type { MetadataRoute } from "next";
import { readAllProducts } from "@/lib/product-store";
import { absoluteUrl } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await readAllProducts();
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/products"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...products.map((product) => ({
      url: absoluteUrl(`/products/${product.id}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: product.stock > 0 ? 0.8 : 0.4,
    })),
  ];
}
