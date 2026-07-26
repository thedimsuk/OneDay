export type Size = "S" | "M" | "L" | "XL" | "XXL";

export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number;
  thumbnail: string;
  gallery: string[];
  shortDescription: string;
  description: string;
  weightGram: number;
  category: string;
  stock: number;
  active: boolean;
  tag: "new" | "popular" | "discount";
  sizeTemplate?: Record<Size, { chest: number; length: number; shoulder: number }>;
};

export const products: Product[] = [
  {
    id: "od-001",
    name: "KEEP MOVING Oversized Tee",
    sku: "OD-KM-TEE-BLK",
    price: 259000,
    discountPrice: 219000,
    thumbnail: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80",
    gallery: [],
    shortDescription: "Cotton combed 24s, boxy fit, screen print ONEDAY.",
    description: "T-shirt oversized dengan bahan lembut, potongan streetwear, dan grafis ONEDAY yang clean.",
    weightGram: 280,
    category: "T-Shirt",
    stock: 64,
    active: true,
    tag: "new",
  },
  {
    id: "od-002",
    name: "After Class Cargo Pants",
    sku: "OD-AC-CARGO-OLV",
    price: 399000,
    thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    gallery: [],
    shortDescription: "Relaxed cargo dengan pocket utility dan waistband nyaman.",
    description: "Celana cargo ringan untuk daily rotation, cukup rapi buat kuliah dan cukup kuat buat jalan seharian.",
    weightGram: 520,
    category: "Pants",
    stock: 31,
    active: true,
    tag: "popular",
  },
  {
    id: "od-003",
    name: "Midnight Rush Hoodie",
    sku: "OD-MR-HOOD-GRY",
    price: 459000,
    discountPrice: 349000,
    thumbnail: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
    gallery: [],
    shortDescription: "Heavy fleece hoodie dengan drop shoulder dan embroidery kecil.",
    description: "Hoodie premium untuk malam panjang, kelas pagi, dan perjalanan yang belum selesai.",
    weightGram: 760,
    category: "Hoodie",
    stock: 22,
    active: true,
    tag: "discount",
  },
  {
    id: "od-004",
    name: "Side Quest Coach Jacket",
    sku: "OD-SQ-JKT-NVY",
    price: 529000,
    thumbnail: "https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?auto=format&fit=crop&w=900&q=80",
    gallery: [],
    shortDescription: "Jaket ringan water-repellent dengan snap button.",
    description: "Layer harian dengan siluet santai, cocok untuk motoran ringan dan hangout sore.",
    weightGram: 610,
    category: "Outerwear",
    stock: 18,
    active: true,
    tag: "popular",
  },
  {
    id: "od-005",
    name: "Doodle Crown Cap",
    sku: "OD-DC-CAP-CRM",
    price: 179000,
    discountPrice: 149000,
    thumbnail: "https://images.unsplash.com/photo-1572307480813-ceb0e59d8325?auto=format&fit=crop&w=900&q=80",
    gallery: [],
    shortDescription: "Cap six-panel dengan patch doodle crown.",
    description: "Aksesori ringan dengan aksen doodle khas ONEDAY untuk menutup outfit.",
    weightGram: 180,
    category: "Accessories",
    stock: 45,
    active: true,
    tag: "discount",
  },
  {
    id: "od-006",
    name: "Campus Run Shirt",
    sku: "OD-CR-SHIRT-WHT",
    price: 289000,
    thumbnail: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
    gallery: [],
    shortDescription: "Shirt relaxed fit dengan panel label woven.",
    description: "Kemeja santai yang tetap clean, dibuat untuk transisi kelas, studio, dan weekend.",
    weightGram: 340,
    category: "Shirt",
    stock: 39,
    active: true,
    tag: "new",
  },
];

export const sizeChart: Record<Size, { chest: number; length: number; shoulder: number }> = {
  S: { chest: 50, length: 68, shoulder: 43 },
  M: { chest: 53, length: 71, shoulder: 46 },
  L: { chest: 56, length: 74, shoulder: 48 },
  XL: { chest: 59, length: 77, shoulder: 51 },
  XXL: { chest: 62, length: 80, shoulder: 54 },
};

export function getProductById(id: string) {
  return products.find((product) => product.id === id) ?? null;
}
