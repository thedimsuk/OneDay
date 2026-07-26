import { readFile } from "fs/promises";
import path from "path";
import type { Product as DbProduct, SizeRow } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { products as baseProducts, sizeChart, type Product, type Size } from "@/lib/products";

export type ProductRecordInput = Product & {
  sizeTemplate?: Record<Size, { chest: number; length: number; shoulder: number }>;
};

const dataDir = path.join(process.cwd(), "data");
const productsFile = path.join(dataDir, "import-products.json");
const productOverridesFile = path.join(dataDir, "import-product-overrides.json");
const sizes: Size[] = ["S", "M", "L", "XL", "XXL"];
const productCatalogCacheTag = "product-catalog";

type ProductOverrides = {
  deletedIds: string[];
  products: Record<string, Partial<ProductRecordInput>>;
};

type ProductWithSizes = DbProduct & { sizeRows: SizeRow[] };

function parseGallery(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function serializeGallery(value: string[] | undefined) {
  return JSON.stringify(value ?? []);
}

async function readCustomProductsJson(): Promise<ProductRecordInput[]> {
  try {
    const raw = await readFile(productsFile, "utf8");
    return JSON.parse(raw) as ProductRecordInput[];
  } catch {
    return [];
  }
}

async function readProductOverridesJson(): Promise<ProductOverrides> {
  try {
    const raw = await readFile(productOverridesFile, "utf8");
    return JSON.parse(raw) as ProductOverrides;
  } catch {
    return { deletedIds: [], products: {} };
  }
}

function productToCreateInput(product: ProductRecordInput) {
  const template = product.sizeTemplate ?? sizeChart;
  const price = Math.max(1, Math.trunc(product.price));
  const discountPrice =
    product.discountPrice && product.discountPrice > 0 && product.discountPrice < price
      ? Math.trunc(product.discountPrice)
      : null;

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price,
    discountPrice,
    thumbnail: product.thumbnail,
    gallery: serializeGallery(product.gallery),
    shortDescription: product.shortDescription,
    description: product.description,
    weightGram: Math.max(1, Math.trunc(product.weightGram)),
    category: product.category,
    stock: Math.max(0, Math.trunc(product.stock)),
    active: product.active,
    tag: product.tag ?? "new",
    sizeRows: {
      create: sizes.map((size) => ({
        size,
        chestCm: template[size]?.chest ?? sizeChart[size].chest,
        lengthCm: template[size]?.length ?? sizeChart[size].length,
        shoulderCm: template[size]?.shoulder ?? sizeChart[size].shoulder,
      })),
    },
  };
}

function productFromDb(product: ProductWithSizes): ProductRecordInput {
  const template = Object.fromEntries(
    product.sizeRows.map((row) => [
      row.size as Size,
      {
        chest: row.chestCm,
        length: row.lengthCm,
        shoulder: row.shoulderCm,
      },
    ]),
  ) as Record<Size, { chest: number; length: number; shoulder: number }>;

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    discountPrice: product.discountPrice === null ? undefined : Number(product.discountPrice),
    thumbnail: product.thumbnail,
    gallery: parseGallery(product.gallery),
    shortDescription: product.shortDescription,
    description: product.description,
    weightGram: product.weightGram,
    category: product.category,
    stock: product.stock,
    active: product.active,
    tag: (product.tag as Product["tag"]) ?? "new",
    sizeTemplate: {
      ...sizeChart,
      ...template,
    },
  };
}

async function seedProductsIfEmpty() {
  const count = await prisma.product.count();
  if (count > 0) {
    return;
  }

  const customProducts = await readCustomProductsJson();
  const overrides = await readProductOverridesJson();
  const seedProducts = [
    ...customProducts,
    ...baseProducts.map((product) => ({
      ...product,
      sizeTemplate: sizeChart,
    })),
  ]
    .filter((product) => !overrides.deletedIds.includes(product.id))
    .map((product) => ({
      ...product,
      ...(overrides.products[product.id] ?? {}),
    }));

  for (const product of seedProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: productToCreateInput(product),
    });
  }
}

async function readAllProductsFresh(): Promise<ProductRecordInput[]> {
  await seedProductsIfEmpty();
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { sizeRows: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map(productFromDb);
}

const readAllProductsCached = unstable_cache(readAllProductsFresh, ["product-catalog"], {
  revalidate: 60,
  tags: [productCatalogCacheTag],
});

export async function readAllProducts(): Promise<ProductRecordInput[]> {
  return readAllProductsCached();
}

function revalidateProductCatalog() {
  revalidateTag(productCatalogCacheTag);
}

export async function addCustomProduct(product: ProductRecordInput) {
  await seedProductsIfEmpty();
  await prisma.product.upsert({
    where: { id: product.id },
    update: {
      name: product.name,
      sku: product.sku,
      price: product.price,
      discountPrice: product.discountPrice ?? null,
      thumbnail: product.thumbnail,
      gallery: serializeGallery(product.gallery),
      shortDescription: product.shortDescription,
      description: product.description,
      weightGram: product.weightGram,
      category: product.category,
      stock: product.stock,
      active: product.active,
      tag: product.tag ?? "new",
    },
    create: productToCreateInput(product),
  });

  revalidateProductCatalog();
  return readAllProducts();
}

export async function updateStoredProduct(productId: string, update: Partial<ProductRecordInput>) {
  await seedProductsIfEmpty();
  const current = await prisma.product.findUnique({ where: { id: productId }, select: { price: true, discountPrice: true } });
  if (!current) throw new Error("Produk tidak ditemukan.");
  const nextPrice = update.price ?? Number(current.price);
  const nextDiscount = update.discountPrice === undefined ? (current.discountPrice === null ? undefined : Number(current.discountPrice)) : update.discountPrice;
  if (nextDiscount !== undefined && nextDiscount > 0 && nextDiscount >= nextPrice) throw new Error("Harga diskon harus lebih kecil dari harga normal.");
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: update.name,
      sku: update.sku,
      price: update.price,
      discountPrice: update.discountPrice === 0 ? null : update.discountPrice,
      thumbnail: update.thumbnail,
      gallery: update.gallery ? serializeGallery(update.gallery) : undefined,
      shortDescription: update.shortDescription,
      description: update.description,
      weightGram: update.weightGram,
      category: update.category,
      stock: update.stock,
      active: update.active,
      tag: update.tag,
    },
  });

  if (update.sizeTemplate) {
    for (const size of sizes) {
      await prisma.sizeRow.upsert({
        where: { productId_size: { productId, size } },
        update: {
          chestCm: update.sizeTemplate[size].chest,
          lengthCm: update.sizeTemplate[size].length,
          shoulderCm: update.sizeTemplate[size].shoulder,
        },
        create: {
          productId,
          size,
          chestCm: update.sizeTemplate[size].chest,
          lengthCm: update.sizeTemplate[size].length,
          shoulderCm: update.sizeTemplate[size].shoulder,
        },
      });
    }
  }

  revalidateProductCatalog();
  return readAllProducts();
}

export async function deleteStoredProduct(productId: string) {
  await seedProductsIfEmpty();
  await prisma.product.update({
    where: { id: productId },
    data: { active: false, stock: 0 },
  });
  revalidateProductCatalog();
  return readAllProducts();
}
