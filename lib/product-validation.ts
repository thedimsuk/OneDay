import type { ProductRecordInput } from "@/lib/product-store";

const tags = new Set<ProductRecordInput["tag"]>(["new", "popular", "discount"]);
function integer(value: unknown, field: string, min = 0, max = 1_000_000_000) {
  if (value === undefined) return undefined;
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new Error(`${field} tidak valid.`);
  return result;
}
function string(value: unknown, field: string, max: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${field} tidak valid.`);
  return value.trim();
}

export function validateProductUpdate(raw: Partial<ProductRecordInput>) {
  const allowed = new Set(["name", "sku", "price", "discountPrice", "shortDescription", "description", "weightGram", "category", "stock", "active", "tag", "sizeTemplate"]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error("Field produk tidak diizinkan.");
  if (raw.sizeTemplate) {
    for (const size of ["S", "M", "L", "XL", "XXL"] as const) {
      const row = raw.sizeTemplate[size];
      if (!row || !Number.isSafeInteger(row.chest) || !Number.isSafeInteger(row.length) || !Number.isSafeInteger(row.shoulder) ||
          row.chest < 1 || row.length < 1 || row.shoulder < 1 || row.chest > 300 || row.length > 300 || row.shoulder > 300) {
        throw new Error(`Ukuran ${size} tidak valid.`);
      }
    }
  }
  const update: Partial<ProductRecordInput> = {
    name: string(raw.name, "Nama", 160), sku: string(raw.sku, "SKU", 80),
    price: integer(raw.price, "Harga", 1), discountPrice: integer(raw.discountPrice, "Harga diskon", 0),
    shortDescription: string(raw.shortDescription, "Deskripsi singkat", 300),
    description: string(raw.description, "Deskripsi", 5000), weightGram: integer(raw.weightGram, "Berat", 1, 100_000),
    category: string(raw.category, "Kategori", 100), stock: integer(raw.stock, "Stok", 0, 1_000_000),
    active: typeof raw.active === "boolean" ? raw.active : undefined,
    tag: raw.tag === undefined ? undefined : tags.has(raw.tag) ? raw.tag : (() => { throw new Error("Tag tidak valid."); })(),
    sizeTemplate: raw.sizeTemplate,
  };
  return Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)) as Partial<ProductRecordInput>;
}

export function hasImageSignature(buffer: Buffer, mime: string) {
  return mime === "image/webp" && readWebpSize(buffer) !== null;
}

export function readWebpSize(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    const frameStart = 20;
    if (buffer[frameStart + 3] !== 0x9d || buffer[frameStart + 4] !== 0x01 || buffer[frameStart + 5] !== 0x2a) {
      return null;
    }

    return {
      width: buffer.readUInt16LE(frameStart + 6) & 0x3fff,
      height: buffer.readUInt16LE(frameStart + 8) & 0x3fff,
    };
  }

  return null;
}

export function isFourByFiveWebp(buffer: Buffer, mime: string) {
  if (mime !== "image/webp") {
    return false;
  }

  const size = readWebpSize(buffer);
  return Boolean(size && size.width > 0 && size.height > 0 && size.width * 5 === size.height * 4);
}
