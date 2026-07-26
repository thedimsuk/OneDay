import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import type { Address, Order, OrderItem } from "@prisma/client";
import { syncFinanceForOrder } from "@/lib/finance";

export type OrderRecord = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  notificationAt?: string;
  status: string;
  product: {
    lineId?: string;
    id: string;
    name: string;
    sku: string;
    size: string;
    quantity: number;
    unitPrice: number;
    thumbnail: string;
    canceledQuantity?: number;
    refundedQuantity?: number;
    refundTotal?: number;
    refundStatus?: string;
  };
  items?: Array<{
    lineId?: string;
    id: string;
    name: string;
    sku: string;
    size: string;
    quantity: number;
    unitPrice: number;
    thumbnail: string;
    canceledQuantity?: number;
    refundedQuantity?: number;
    refundTotal?: number;
    refundStatus?: string;
  }>;
  buyer: {
    name: string;
    phone: string;
    email: string;
    note: string;
  };
  address: {
    recipient: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    village: string;
    rt: string;
    rw: string;
    postalCode: string;
    note: string;
  };
  voucherCode: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: string;
  paymentVerifiedAt?: string;
  paidAt?: string;
  completedAt?: string;
  courier?: string;
  trackingNumber?: string;
  adminNote?: string;
  subtotal: number;
  voucherDiscount: number;
  shipping: number;
  total: number;
};

export type VoucherEligibility = {
  code: string;
  available: boolean;
  reason: string;
  percent: number;
};

const pendingReservationMs = 30 * 60 * 1000;
const shippingFee = 18_000;
const ordersFile = path.join(process.cwd(), "data", "import-orders.json");

type OrderWithAddressAndItems = Order & {
  address: Address;
  items: OrderItem[];
};

const statusToEnum: Record<string, "PENDING" | "PAID" | "PACKED" | "SHIPPED" | "DONE" | "CANCELED"> = {
  "Menunggu Pembayaran": "PENDING",
  "Pesanan Masuk": "PAID",
  Diproses: "PAID",
  Dikemas: "PACKED",
  Dikirim: "SHIPPED",
  Selesai: "DONE",
  Dibatalkan: "CANCELED",
};

function toDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function orderFromDb(order: OrderWithAddressAndItems): OrderRecord {
  const item = order.items[0];
  const items = order.items.map((orderItem) => ({
    lineId: orderItem.id,
    id: orderItem.productId,
    name: orderItem.productName,
    sku: orderItem.productSku,
    size: orderItem.size,
    quantity: orderItem.quantity,
    unitPrice: Number(orderItem.price),
    thumbnail: orderItem.thumbnail,
    canceledQuantity: orderItem.canceledQuantity,
    refundedQuantity: orderItem.refundedQuantity,
    refundTotal: Number(orderItem.refundTotal),
    refundStatus: orderItem.refundStatus ?? "",
  }));

  return {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    notificationAt: order.notificationAt?.toISOString(),
    status: order.statusLabel,
    product: {
      lineId: item?.id,
      id: item?.productId ?? "",
      name: item?.productName ?? "",
      sku: item?.productSku ?? "",
      size: item?.size ?? "",
      quantity: item?.quantity ?? 0,
      unitPrice: item ? Number(item.price) : 0,
      thumbnail: item?.thumbnail ?? "",
      canceledQuantity: item?.canceledQuantity ?? 0,
      refundedQuantity: item?.refundedQuantity ?? 0,
      refundTotal: item ? Number(item.refundTotal) : 0,
      refundStatus: item?.refundStatus ?? "",
    },
    items,
    buyer: {
      name: order.buyerName,
      phone: order.buyerPhone,
      email: order.buyerEmail,
      note: order.buyerNote ?? "",
    },
    address: {
      recipient: order.address.recipient,
      phone: order.address.phone,
      province: order.address.province,
      city: order.address.city,
      district: order.address.district,
      village: order.address.village,
      rt: order.address.rt,
      rw: order.address.rw,
      postalCode: order.address.postalCode,
      note: order.address.note ?? "",
    },
    voucherCode: order.voucherCode ?? "",
    paymentMethod: order.paymentMethod ?? undefined,
    paymentReference: order.paymentReference ?? undefined,
    paymentStatus: order.paymentStatus ?? undefined,
    paymentVerifiedAt: order.paymentVerifiedAt?.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    completedAt: order.completedAt?.toISOString(),
    courier: order.courier ?? "",
    trackingNumber: order.trackingNumber ?? "",
    adminNote: order.adminNote ?? "",
    subtotal: Number(order.originalTotal),
    voucherDiscount: Number(order.discountTotal),
    shipping: Number(order.shippingTotal),
    total: Number(order.grandTotal),
  };
}

async function releaseExpiredReservations() {
  const expiredBefore = new Date(Date.now() - pendingReservationMs);
  const expired = await prisma.order.findMany({
    where: { status: "PENDING", stockCommittedAt: { not: null }, createdAt: { lt: expiredBefore } },
    include: { items: true },
  });
  for (const order of expired) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING", stockCommittedAt: { not: null } },
        data: { status: "CANCELED", statusLabel: "Dibatalkan", paymentStatus: "Kedaluwarsa", stockCommittedAt: null },
      });
      if (!claimed.count) return;
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      if (order.voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: order.voucherCode } });
        if (voucher) {
          await tx.userVoucher.deleteMany({ where: { userId: order.userId, voucherId: voucher.id } });
          await tx.voucher.updateMany({ where: { id: voucher.id, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
        }
      }
    });
  }
}

async function readOrdersJson(): Promise<OrderRecord[]> {
  try {
    const raw = await readFile(ordersFile, "utf8");
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return [];
  }
}

async function createOrderInDb(order: OrderRecord) {
  const buyerEmail = order.buyer.email || "user@oneday.local";
  const buyerName = order.buyer.name || order.address.recipient || "ONEDAY User";
  const createdAt = toDate(order.createdAt) ?? new Date();
  const paidAt = toDate(order.paidAt);
  const orderItems = order.items?.length ? order.items : [order.product];

  await prisma.user.upsert({
    where: { email: buyerEmail },
    update: {
      name: buyerName,
    },
    create: {
      email: buyerEmail,
      name: buyerName,
      role: "USER",
    },
  });

  for (const item of orderItems) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        sku: item.sku || item.id,
        price: item.unitPrice,
        discountPrice: null,
        thumbnail: item.thumbnail,
        gallery: "[]",
        shortDescription: item.name,
        description: item.name,
        weightGram: 0,
        category: "Migrated",
        stock: 0,
        active: false,
        tag: "new",
      },
    });
  }

  await prisma.order.upsert({
    where: { id: order.id },
    update: {},
    create: {
      id: order.id,
      user: { connect: { email: buyerEmail } },
      address: {
        create: {
          user: { connect: { email: buyerEmail } },
          recipient: order.address.recipient || buyerName,
          phone: order.address.phone || order.buyer.phone || "-",
          province: order.address.province || "-",
          city: order.address.city || "-",
          district: order.address.district || "-",
          village: order.address.village || "-",
          rt: order.address.rt || "-",
          rw: order.address.rw || "-",
          postalCode: order.address.postalCode || "-",
          note: order.address.note || null,
        },
      },
      status: statusToEnum[order.status] ?? "PAID",
      statusLabel: order.status,
      originalTotal: order.subtotal,
      discountTotal: order.voucherDiscount,
      shippingTotal: order.shipping,
      grandTotal: order.total,
      buyerName,
      buyerPhone: order.buyer.phone || order.address.phone || "-",
      buyerEmail,
      buyerNote: order.buyer.note || order.address.note || null,
      voucherCode: order.voucherCode || null,
      paymentMethod: order.paymentMethod ?? "QRIS_GOPAY",
      paymentReference: order.paymentReference ?? null,
      paymentStatus: order.paymentStatus ?? null,
      paymentVerifiedAt: order.paymentVerifiedAt ? toDate(order.paymentVerifiedAt) : null,
      paidAt,
      completedAt: toDate(order.completedAt),
      courier: order.courier ?? null,
      trackingNumber: order.trackingNumber ?? null,
      adminNote: order.adminNote ?? null,
      notificationAt: createdAt,
      createdAt,
      items: {
        create: orderItems.map((item) => ({
          product: { connect: { id: item.id } },
          productName: item.name,
          productSku: item.sku,
          thumbnail: item.thumbnail,
          size: item.size,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
      },
    },
  });
}

async function seedOrdersIfEmpty() {
  const count = await prisma.order.count();
  if (count > 0) {
    return;
  }

  const orders = await readOrdersJson();
  for (const order of orders.reverse()) {
    await createOrderInDb(order);
  }
}

export async function readOrders(): Promise<OrderRecord[]> {
  await seedOrdersIfEmpty();
  await releaseExpiredReservations();
  const orders = await prisma.order.findMany({
    include: {
      address: true,
      items: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return orders.map(orderFromDb);
}

export type CheckoutOrderInput = {
  items: Array<{ productId: string; size: string; quantity: number }>;
  address: OrderRecord["address"];
  buyer: Pick<OrderRecord["buyer"], "name" | "phone" | "note">;
  voucherCode?: string;
  addressId?: string;
};

function requiredText(value: unknown, max = 200) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) throw new Error("Data checkout tidak lengkap.");
  return text;
}

async function ensureDefaultVouchers() {
  const expiresAt = new Date("2099-12-31T23:59:59.000Z");
  const defaults = [
    { code: "NEW20", type: "NEW_USER" as const, percent: 20 },
    { code: "LOYAL30", type: "LOYALTY_30" as const, percent: 30 },
    { code: "ONEDAY25", type: "ADMIN" as const, percent: 25 },
  ];
  for (const voucher of defaults) {
    await prisma.voucher.upsert({ where: { code: voucher.code }, update: {}, create: { ...voucher, expiresAt } });
  }
}

export async function readVoucherEligibility(
  account: { email: string },
  items: Array<{ productId?: unknown; size?: unknown; quantity?: unknown }> = [],
): Promise<VoucherEligibility[]> {
  await releaseExpiredReservations();
  await ensureDefaultVouchers();

  const email = account.email.toLowerCase();
  const now = new Date();
  const vouchers = await prisma.voucher.findMany({
    where: { active: true },
    include: { products: true },
    orderBy: { code: "asc" },
  });
  const previousOrders = await prisma.order.count({ where: { buyerEmail: email, status: { not: "CANCELED" } } });
  const completedOrders = await prisma.order.count({ where: { buyerEmail: email, status: "DONE" } });
  const usedVoucherIds = new Set(
    (await prisma.userVoucher.findMany({
      where: { user: { email } },
      select: { voucherId: true },
    })).map((voucher) => voucher.voucherId),
  );
  const productIds = [...new Set(items.map((item) => (typeof item.productId === "string" ? item.productId : "")).filter(Boolean))];

  return vouchers.map((voucher) => {
    let available = true;
    let reason = "Bisa dipakai";

    if (voucher.startsAt > now || voucher.expiresAt <= now) {
      available = false;
      reason = "Voucher belum aktif atau sudah kedaluwarsa";
    } else if (voucher.usageQuota != null && voucher.usedCount >= voucher.usageQuota) {
      available = false;
      reason = "Kuota voucher sudah habis";
    } else if (usedVoucherIds.has(voucher.id)) {
      available = false;
      reason = "Voucher sudah pernah dipakai";
    } else if (voucher.type === "NEW_USER" && previousOrders > 0) {
      available = false;
      reason = "Hanya untuk pesanan pertama";
    } else if (voucher.type === "LOYALTY_30" && completedOrders < 3) {
      available = false;
      reason = `Butuh ${3 - completedOrders} transaksi selesai lagi`;
    } else if (!voucher.appliesToAll && productIds.length > 0) {
      const scopedProductIds = new Set(voucher.products.map((link) => link.productId));
      if (!productIds.some((productId) => scopedProductIds.has(productId))) {
        available = false;
        reason = "Tidak berlaku untuk produk di keranjang";
      }
    }

    return {
      code: voucher.code,
      available,
      reason,
      percent: voucher.percent,
    };
  });
}

export async function createCheckoutOrder(input: CheckoutOrderInput, account: { email: string; name: string }) {
  await releaseExpiredReservations();
  await ensureDefaultVouchers();
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 20) throw new Error("Keranjang tidak valid.");
  const normalizedItems = input.items.map((item) => ({
    productId: requiredText(item.productId, 100),
    size: requiredText(item.size, 10),
    quantity: Number(item.quantity),
  }));
  if (normalizedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    throw new Error("Jumlah produk tidak valid.");
  }
  const ids = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true }, include: { sizeRows: true } });
  if (products.length !== ids.length) throw new Error("Produk tidak tersedia.");

  const pricedItems = normalizedItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)!;
    if (!product.sizeRows.some((row) => row.size === item.size)) throw new Error(`Ukuran ${item.size} tidak tersedia.`);
    const unitPrice = Number(product.discountPrice ?? product.price);
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) throw new Error("Harga produk tidak valid.");
    return { product, ...item, unitPrice };
  });
  const quantities = new Map<string, number>();
  for (const item of pricedItems) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const code = input.voucherCode?.trim().toUpperCase() || "";
  const voucher = code ? await prisma.voucher.findFirst({
    where: { code, active: true, startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } },
    include: { products: true },
  }) : null;
  if (code && !voucher) throw new Error("Voucher tidak valid atau kedaluwarsa.");
  if (voucher?.usageQuota != null && voucher.usedCount >= voucher.usageQuota) throw new Error("Kuota voucher sudah habis.");
  if (voucher?.type === "NEW_USER") {
    const previous = await prisma.order.count({ where: { buyerEmail: account.email.toLowerCase(), status: { not: "CANCELED" } } });
    if (previous > 0) throw new Error("Voucher NEW20 hanya untuk pesanan pertama.");
  }
  if (voucher?.type === "LOYALTY_30") {
    const completed = await prisma.order.count({ where: { buyerEmail: account.email.toLowerCase(), status: "DONE" } });
    if (completed < 3) throw new Error("Voucher LOYAL30 memerlukan minimal tiga transaksi selesai.");
  }
  if (voucher) {
    const existingUse = await prisma.userVoucher.findFirst({ where: { voucherId: voucher.id, user: { email: account.email.toLowerCase() } } });
    if (existingUse) throw new Error("Voucher ini sudah pernah digunakan.");
  }
  const eligibleSubtotal = !voucher || voucher.appliesToAll
    ? subtotal
    : pricedItems.filter((item) => voucher.products.some((link) => link.productId === item.productId))
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (voucher && eligibleSubtotal <= 0) throw new Error("Voucher tidak berlaku untuk produk di keranjang.");
  const discount = voucher ? Math.floor(eligibleSubtotal * Math.min(100, Math.max(0, voucher.percent)) / 100) : 0;
  const id = `OD-${randomUUID()}`;
  const paymentReference = `QRIS-${randomUUID()}`;
  const address = input.address;
  const buyerName = requiredText(input.buyer?.name || address?.recipient || account.name, 120);
  const buyerPhone = requiredText(input.buyer?.phone || address?.phone, 30);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: account.email.toLowerCase() }, update: { name: account.name },
      create: { email: account.email.toLowerCase(), name: account.name, emailVerified: new Date() },
    });
    if (voucher) {
      const claimed = await tx.voucher.updateMany({
        where: { id: voucher.id, active: true, ...(voucher.usageQuota == null ? {} : { usedCount: { lt: voucher.usageQuota } }) },
        data: { usedCount: { increment: 1 } },
      });
      if (!claimed.count) throw new Error("Kuota voucher sudah habis.");
      await tx.userVoucher.create({ data: { userId: user.id, voucherId: voucher.id } });
    }
    for (const [productId, quantity] of quantities) {
      const result = await tx.product.updateMany({
        where: { id: productId, active: true, stock: { gte: quantity } }, data: { stock: { decrement: quantity } },
      });
      if (result.count !== 1) throw new Error("Stok produk tidak mencukupi.");
    }
    const existingAddress = input.addressId
      ? await tx.address.findFirst({ where: { id: input.addressId, userId: user.id } })
      : null;
    const savedAddress = existingAddress ?? await tx.address.create({ data: {
      userId: user.id, label: "Checkout", isDefault: false,
      recipient: requiredText(address.recipient, 120), phone: requiredText(address.phone, 30),
      province: requiredText(address.province, 100), city: requiredText(address.city, 100),
      district: requiredText(address.district, 100), village: requiredText(address.village, 100),
      rt: requiredText(address.rt, 10), rw: requiredText(address.rw, 10), postalCode: requiredText(address.postalCode, 10),
      note: typeof address.note === "string" ? address.note.trim().slice(0, 500) || null : null,
    }});
    await tx.order.create({ data: {
      id, userId: user.id, addressId: savedAddress.id, status: "PENDING", statusLabel: "Menunggu Pembayaran",
      originalTotal: subtotal, discountTotal: discount, shippingTotal: shippingFee, grandTotal: subtotal - discount + shippingFee,
      buyerName, buyerPhone, buyerEmail: account.email.toLowerCase(), buyerNote: input.buyer.note?.trim().slice(0, 500) || null,
      voucherCode: voucher?.code ?? null, paymentMethod: "QRIS_GOPAY", paymentReference,
      paymentStatus: "Menunggu Pembayaran QRIS", stockCommittedAt: new Date(),
      adminNote: "Menunggu pembayaran QRIS masuk otomatis dari payment provider.",
      items: { create: pricedItems.map((item) => ({
        productId: item.productId, productName: item.product.name, productSku: item.product.sku,
        thumbnail: item.product.thumbnail, size: item.size, quantity: item.quantity, price: item.unitPrice,
      })) },
    }});
  });
  const created = await prisma.order.findUnique({ where: { id }, include: { address: true, items: true } });
  if (!created) throw new Error("Order gagal dibuat.");
  return orderFromDb(created);
}

export async function markOrderPaidFromProvider({
  orderId,
  paymentReference,
  amount,
}: {
  orderId?: string;
  paymentReference?: string;
  amount: number;
}) {
  if (!orderId && !paymentReference) return { ok: false, reason: "Referensi order wajib diisi." };
  await releaseExpiredReservations();
  const order = await prisma.order.findFirst({
    where: {
      ...(orderId ? { id: orderId } : {}),
      ...(paymentReference ? { paymentReference } : {}),
    },
    select: {
      id: true,
      grandTotal: true,
      status: true,
      stockCommittedAt: true,
    },
  });

  if (!order) {
    return { ok: false, reason: "Order tidak ditemukan." };
  }

  if (order.status === "PAID" || order.status === "PACKED" || order.status === "SHIPPED" || order.status === "DONE") {
    await syncFinanceForOrder(order.id);
    return { ok: true, orderId: order.id };
  }
  if (order.status !== "PENDING" || !order.stockCommittedAt) return { ok: false, reason: "Order sudah dibatalkan atau kedaluwarsa." };

  if (Number(order.grandTotal) !== amount) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "Perlu Dicek",
        adminNote: `Nominal pembayaran masuk tidak cocok. Sistem menerima ${amount}, total order ${Number(order.grandTotal)}.`,
      },
    });
    return { ok: false, reason: "Nominal pembayaran tidak cocok." };
  }

  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "PENDING", stockCommittedAt: { not: null } },
    data: {
      status: "PAID",
      statusLabel: "Pesanan Masuk",
      paymentStatus: "Sudah Dibayar",
      paidAt: new Date(),
      paymentVerifiedAt: new Date(),
      adminNote: "Pembayaran QRIS sudah terkonfirmasi otomatis. Pesanan masuk dan siap diproses admin.",
      notificationAt: new Date(),
    },
  });

  if (!claimed.count) {
    const latest = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
    if (latest && latest.status !== "PENDING" && latest.status !== "CANCELED") return { ok: true, orderId: order.id };
    return { ok: false, reason: "Order sudah dibatalkan atau kedaluwarsa." };
  }

  await syncFinanceForOrder(order.id);

  return { ok: true, orderId: order.id };
}

export async function cancelOrderItemForUser({
  orderId,
  orderItemId,
  account,
}: {
  orderId: string;
  orderItemId: string;
  account: { email: string };
}) {
  const email = account.email.toLowerCase();
  let message = "Item pesanan dibatalkan dan refund berhasil dicatat.";

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, buyerEmail: email },
      include: { items: true },
    });

    if (!order) throw new Error("Pesanan tidak ditemukan.");
    if (!["Menunggu Pembayaran", "Pesanan Masuk", "Diproses"].includes(order.statusLabel)) {
      throw new Error("Pesanan ini sudah tidak bisa dibatalkan dari profil.");
    }

    const item = order.items.find((candidate) => candidate.id === orderItemId);
    if (!item) throw new Error("Item pesanan tidak ditemukan.");

    const activeQuantity = item.quantity - item.canceledQuantity;
    if (activeQuantity < 1) throw new Error("Item ini sudah dibatalkan seluruhnya.");

    const activeUnitsBefore = order.items.reduce((sum, current) => sum + current.quantity - current.canceledQuantity, 0);
    const isLastActiveUnit = activeUnitsBefore <= 1;
    const grossRefund = Number(item.price);
    const discountShare = Number(order.originalTotal) > 0
      ? Math.min(grossRefund, Math.floor((grossRefund * Number(order.discountTotal)) / Number(order.originalTotal)))
      : 0;
    const productRefund = Math.max(0, grossRefund - discountShare);
    const shippingRefund = isLastActiveUnit ? Number(order.shippingTotal) : 0;
    const refundAmount = productRefund + shippingRefund;
    const paidOrder = order.paymentStatus === "Sudah Dibayar" || Boolean(order.paidAt || order.paymentVerifiedAt);
    const refundStatus = paidOrder ? "Refund Berhasil" : "Pembatalan Berhasil";

    await tx.orderItem.update({
      where: { id: item.id },
      data: {
        canceledQuantity: { increment: 1 },
        refundedQuantity: { increment: paidOrder ? 1 : 0 },
        refundTotal: { increment: refundAmount },
        refundStatus,
        canceledAt: new Date(),
        refundedAt: paidOrder ? new Date() : null,
      },
    });

    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: 1 } },
    });

    if (isLastActiveUnit) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELED",
          statusLabel: "Dibatalkan",
          originalTotal: 0,
          discountTotal: 0,
          shippingTotal: 0,
          grandTotal: 0,
          paymentStatus: paidOrder ? "Refund Berhasil" : "Dibatalkan",
          stockCommittedAt: null,
          adminNote: paidOrder
            ? `Semua item dibatalkan user. Refund berhasil dicatat sebesar ${refundAmount}.`
            : "Semua item dibatalkan user sebelum pembayaran.",
        },
      });

      if (order.voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: order.voucherCode } });
        if (voucher) {
          await tx.userVoucher.deleteMany({ where: { userId: order.userId, voucherId: voucher.id } });
          await tx.voucher.updateMany({ where: { id: voucher.id, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
        }
      }
      message = paidOrder ? "Pesanan dibatalkan penuh dan refund berhasil dicatat." : "Pesanan dibatalkan penuh sebelum pembayaran.";
      return;
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        originalTotal: { decrement: grossRefund },
        discountTotal: { decrement: discountShare },
        grandTotal: { decrement: productRefund },
        paymentStatus: paidOrder ? "Refund Sebagian Berhasil" : order.paymentStatus,
        adminNote: paidOrder
          ? `User membatalkan 1 item (${item.productName} ${item.size}). Refund berhasil dicatat sebesar ${refundAmount}.`
          : `User membatalkan 1 item (${item.productName} ${item.size}) sebelum pembayaran.`,
      },
    });
  });

  await syncFinanceForOrder(orderId);

  const order = (await readOrders()).find((item) => item.id === orderId);
  return { order, message };
}

export async function updateOrder(orderId: string, update: Partial<OrderRecord>) {
  const current = await prisma.order.findUnique({
    where: { id: orderId },
    select: { completedAt: true, paidAt: true, paymentVerifiedAt: true, statusLabel: true },
  });

  if (!current) {
    return readOrders();
  }

  let statusLabel = update.status ?? current.statusLabel;
  if (update.paymentStatus === "Sudah Dibayar" && statusLabel === "Menunggu Pembayaran") {
    statusLabel = "Pesanan Masuk";
  }

  const completedAt = statusLabel === "Selesai" && !current.completedAt
    ? new Date()
    : update.status && statusLabel !== "Selesai"
      ? null
      : undefined;
  const paidAt = update.paidAt
    ? toDate(update.paidAt)
    : update.paymentStatus === "Sudah Dibayar" && !current.paidAt
      ? new Date()
      : undefined;
  const paymentVerifiedAt = update.paymentVerifiedAt
    ? toDate(update.paymentVerifiedAt)
    : update.paymentStatus === "Sudah Dibayar" && !current.paymentVerifiedAt
      ? new Date()
      : undefined;

  const allowedTransitions: Record<string, string[]> = {
    "Menunggu Pembayaran": ["Pesanan Masuk", "Dibatalkan"],
    "Pesanan Masuk": ["Diproses"], Diproses: ["Dikemas"],
    Dikemas: ["Dikirim"], Dikirim: ["Selesai"], Selesai: [], Dibatalkan: [],
  };
  if (update.status && update.status !== current.statusLabel && !allowedTransitions[current.statusLabel]?.includes(update.status)) {
    throw new Error("Perubahan status pesanan tidak diizinkan.");
  }
  if (current.statusLabel === "Menunggu Pembayaran" && statusLabel === "Pesanan Masuk" && update.paymentStatus !== "Sudah Dibayar") {
    throw new Error("Order hanya dapat diproses setelah pembayaran terverifikasi.");
  }

  await prisma.$transaction(async (tx) => {
    if (statusLabel === "Dibatalkan") {
      const reserved = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (reserved?.stockCommittedAt) {
        const canceled = await tx.order.updateMany({
          where: { id: orderId, status: "PENDING", stockCommittedAt: { not: null } },
          data: { status: "CANCELED", statusLabel: "Dibatalkan", paymentStatus: "Dibatalkan", stockCommittedAt: null, adminNote: update.adminNote },
        });
        if (!canceled.count) throw new Error("Order yang sudah dibayar tidak dapat dibatalkan tanpa proses refund.");
        for (const item of reserved.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        if (reserved.voucherCode) {
          const voucher = await tx.voucher.findUnique({ where: { code: reserved.voucherCode } });
          if (voucher) {
            await tx.userVoucher.deleteMany({ where: { userId: reserved.userId, voucherId: voucher.id } });
            await tx.voucher.updateMany({ where: { id: voucher.id, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
          }
        }
      }
      if (!reserved?.stockCommittedAt) throw new Error("Reservasi stok order tidak ditemukan.");
      return;
    }
    await tx.order.update({
    where: { id: orderId },
    data: {
      status: statusToEnum[statusLabel] ?? "PAID",
      statusLabel,
      paymentStatus: update.paymentStatus,
      paymentMethod: update.paymentMethod,
      paymentReference: update.paymentReference,
      paymentVerifiedAt,
      paidAt,
      completedAt,
      courier: update.courier,
      trackingNumber: update.trackingNumber,
      adminNote: update.adminNote,
      stockCommittedAt: undefined,
    },
  });
  });

  await syncFinanceForOrder(orderId);

  return readOrders();
}
