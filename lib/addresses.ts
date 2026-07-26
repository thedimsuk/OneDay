import { prisma } from "@/lib/prisma";

export type AddressInput = {
  label: string; recipient: string; phone: string; province: string; city: string;
  district: string; village: string; rt: string; rw: string; postalCode: string; note?: string;
};

function text(value: unknown, field: string, max = 120) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > max) throw new Error(`${field} tidak valid.`);
  return result;
}

function validateAddress(input: AddressInput) {
  return {
    label: text(input.label, "Label", 40), recipient: text(input.recipient, "Penerima"),
    phone: text(input.phone, "Nomor HP", 30), province: text(input.province, "Provinsi"),
    city: text(input.city, "Kota"), district: text(input.district, "Kecamatan"), village: text(input.village, "Kelurahan"),
    rt: text(input.rt, "RT", 10), rw: text(input.rw, "RW", 10), postalCode: text(input.postalCode, "Kode pos", 10),
    note: typeof input.note === "string" ? input.note.trim().slice(0, 500) || null : null,
  };
}

export async function readAddresses(email: string) {
  return prisma.address.findMany({ where: { user: { email: email.toLowerCase() } }, orderBy: [{ isDefault: "desc" }, { id: "desc" }] });
}

export async function addAddress(email: string, input: AddressInput) {
  const data = validateAddress(input);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new Error("Akun tidak ditemukan.");
    const count = await tx.address.count({ where: { userId: user.id } });
    return tx.address.create({ data: { ...data, userId: user.id, isDefault: count === 0 } });
  });
}

export async function setDefaultAddress(email: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.address.findFirst({ where: { id, user: { email: email.toLowerCase() } } });
    if (!target) throw new Error("Alamat tidak ditemukan.");
    await tx.address.updateMany({ where: { userId: target.userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { isDefault: true } });
  });
}

export async function deleteAddress(email: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.address.findFirst({ where: { id, user: { email: email.toLowerCase() } } });
    if (!target) throw new Error("Alamat tidak ditemukan.");
    const used = await tx.order.count({ where: { addressId: id } });
    if (used) throw new Error("Alamat sudah dipakai oleh pesanan dan tidak dapat dihapus.");
    await tx.address.delete({ where: { id } });
    if (target.isDefault) {
      const replacement = await tx.address.findFirst({ where: { userId: target.userId } });
      if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
  });
}
