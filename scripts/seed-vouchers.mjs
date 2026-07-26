import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  { code: "NEW20", type: "NEW_USER", percent: 20 },
  { code: "LOYAL30", type: "LOYALTY_30", percent: 30 },
  { code: "ONEDAY25", type: "ADMIN", percent: 25 },
];

try {
  const expiresAt = new Date("2099-12-31T23:59:59.000Z");
  for (const voucher of defaults) {
    await prisma.voucher.upsert({
      where: { code: voucher.code },
      update: {
        active: true,
        appliesToAll: true,
        expiresAt,
        percent: voucher.percent,
        type: voucher.type,
      },
      create: {
        ...voucher,
        active: true,
        appliesToAll: true,
        expiresAt,
      },
    });
  }

  console.log(`Voucher default siap: ${defaults.map((voucher) => voucher.code).join(", ")}`);
} finally {
  await prisma.$disconnect();
}
