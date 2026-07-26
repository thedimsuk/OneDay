import { prisma } from "@/lib/prisma";
import type { FinanceEntry as DbFinanceEntry } from "@prisma/client";

type FinanceEntryType = "Pemasukan" | "Pengeluaran";

export type FinanceEntry = {
  id: string;
  orderId: string;
  type: FinanceEntryType;
  categoryCode: string;
  category: string;
  description: string;
  amount: number;
  recordedAt: string;
};

export type FinanceCategorySummary = {
  code: string;
  name: string;
  type: FinanceEntryType;
  total: number;
  count: number;
};

const financeCategories = {
  sales: {
    code: "PENJUALAN_PRODUK",
    name: "Penjualan Produk",
    type: "Pemasukan" as const,
    dbType: "INCOME" as const,
  },
  shipping: {
    code: "ONGKIR",
    name: "Ongkir",
    type: "Pengeluaran" as const,
    dbType: "EXPENSE" as const,
  },
};

function financeEntryFromDb(entry: DbFinanceEntry): FinanceEntry {
  return {
    id: entry.id,
    orderId: entry.orderId,
    type: entry.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
    categoryCode: entry.categoryCode,
    category: entry.category,
    description: entry.description,
    amount: Number(entry.amount),
    recordedAt: entry.recordedAt.toISOString(),
  };
}

function describeOrderItems(items: Array<{ productName: string; size: string; quantity: number }>, fallback: string) {
  if (!items.length) {
    return fallback;
  }

  return items.map((item) => `${item.productName} (${item.size || "-"}) x${item.quantity}`).join(", ");
}

export async function syncFinanceForOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  const paymentSettled = order?.paymentStatus === "Sudah Dibayar" || order?.paymentStatus === "Refund Sebagian Berhasil";
  if (!order || !paymentSettled || order.statusLabel === "Dibatalkan") {
    await prisma.financeEntry.deleteMany({ where: { orderId } });
    return;
  }
    const recordedAt = order.paidAt ?? order.paymentVerifiedAt ?? order.completedAt ?? order.createdAt;
    const incomeId = `${order.id}-income`;
    const expenseId = `${order.id}-shipping-expense`;
    const description = describeOrderItems(order.items, order.id);

    await prisma.financeEntry.upsert({
      where: { id: incomeId },
      update: {
        description,
        amount: order.grandTotal,
        recordedAt,
      },
      create: {
        id: incomeId,
        orderId: order.id,
        type: financeCategories.sales.dbType,
        categoryCode: financeCategories.sales.code,
        category: financeCategories.sales.name,
        description,
        amount: order.grandTotal,
        recordedAt,
      },
    });

    if (order.shippingTotal > 0) {
      await prisma.financeEntry.upsert({
        where: { id: expenseId },
        update: {
          description: `Biaya kirim untuk ${order.id}`,
          amount: order.shippingTotal,
          recordedAt,
        },
        create: {
          id: expenseId,
          orderId: order.id,
          type: financeCategories.shipping.dbType,
          categoryCode: financeCategories.shipping.code,
          category: financeCategories.shipping.name,
          description: `Biaya kirim untuk ${order.id}`,
          amount: order.shippingTotal,
          recordedAt,
        },
      });
    } else {
      await prisma.financeEntry.deleteMany({
        where: { id: expenseId },
      });
    }
}

export async function readFinanceEntries() {
  const entries = await prisma.financeEntry.findMany({
    orderBy: { recordedAt: "desc" },
  });

  return entries.map(financeEntryFromDb);
}

export function summarizeFinance(entries: FinanceEntry[]) {
  const income = entries.filter((entry) => entry.type === "Pemasukan").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = entries.filter((entry) => entry.type === "Pengeluaran").reduce((sum, entry) => sum + entry.amount, 0);
  const categoryMap = new Map<string, FinanceCategorySummary>();

  for (const entry of entries) {
    const key = entry.categoryCode;
    const current = categoryMap.get(key) ?? {
      code: entry.categoryCode,
      name: entry.category,
      type: entry.type,
      total: 0,
      count: 0,
    };

    categoryMap.set(key, {
      ...current,
      total: current.total + entry.amount,
      count: current.count + 1,
    });
  }

  return {
    income,
    expense,
    profit: income - expense,
    categories: Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function financeEntriesToCsv(entries: FinanceEntry[]) {
  const summary = summarizeFinance(entries);
  const rows = [
    ["LAPORAN KEUANGAN ONEDAY"],
    ["Dibuat", new Date().toLocaleString("id-ID")],
    [],
    ["RINGKASAN UTAMA"],
    ["Total Pemasukan", String(summary.income)],
    ["Total Pengeluaran", String(summary.expense)],
    ["Saldo / Laba", String(summary.profit)],
    [],
    ["RINGKASAN KATEGORI"],
    ["Kode Kategori", "Kategori", "Tipe", "Jumlah Transaksi", "Total"],
    ...summary.categories.map((category) => [
      category.code,
      category.name,
      category.type,
      String(category.count),
      String(category.total),
    ]),
    [],
    ["DETAIL TRANSAKSI"],
    ["Tanggal", "Tipe", "Kode Kategori", "Kategori", "Order", "Deskripsi", "Nominal"],
    ...entries.map((entry) => [
      new Date(entry.recordedAt).toLocaleString("id-ID"),
      entry.type,
      entry.categoryCode,
      entry.category,
      entry.orderId,
      entry.description,
      String(entry.amount),
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const safe = /^[=+\-@]/.test(cell) ? `'${cell}` : cell;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(";"),
    )
    .join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rupiahNumber(value: number) {
  return value.toLocaleString("id-ID");
}

export function financeEntriesToExcelHtml(entries: FinanceEntry[]) {
  const summary = summarizeFinance(entries);
  const generatedAt = new Date().toLocaleString("id-ID");

  const categoryRows = summary.categories
    .map((category) => {
      const typeClass = category.type === "Pemasukan" ? "income" : "expense";
      return `
        <tr>
          <td class="code">${escapeHtml(category.code)}</td>
          <td>${escapeHtml(category.name)}</td>
          <td class="${typeClass}">${escapeHtml(category.type)}</td>
          <td class="number">${category.count}</td>
          <td class="money ${typeClass}">${rupiahNumber(category.total)}</td>
        </tr>`;
    })
    .join("");

  const detailRows = entries
    .map((entry, index) => {
      const typeClass = entry.type === "Pemasukan" ? "income" : "expense";
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(new Date(entry.recordedAt).toLocaleString("id-ID"))}</td>
          <td class="${typeClass}">${escapeHtml(entry.type)}</td>
          <td class="code">${escapeHtml(entry.categoryCode)}</td>
          <td>${escapeHtml(entry.category)}</td>
          <td class="code">${escapeHtml(entry.orderId)}</td>
          <td>${escapeHtml(entry.description)}</td>
          <td class="money ${typeClass}">${rupiahNumber(entry.amount)}</td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #111827; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 22px; }
    th, td { border: 1px solid #111827; padding: 8px 10px; vertical-align: top; }
    th { background: #111827; color: #ffffff; font-weight: 700; text-align: left; }
    .title { background: #ffe66d; color: #111827; font-size: 22px; font-weight: 800; }
    .meta { background: #f3f4f6; }
    .section { background: #2563eb; color: #ffffff; font-size: 16px; font-weight: 800; }
    .income { background: #dcfce7; color: #166534; font-weight: 700; }
    .expense { background: #fee2e2; color: #991b1b; font-weight: 700; }
    .profit { background: #dbeafe; color: #1e40af; font-weight: 800; }
    .code { font-family: Consolas, monospace; font-weight: 700; }
    .money, .number { text-align: right; }
    .hint { background: #fef3c7; color: #92400e; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <tr><td class="title" colspan="5">LAPORAN KEUANGAN ONEDAY</td></tr>
    <tr><td class="meta">Dibuat</td><td colspan="4">${escapeHtml(generatedAt)}</td></tr>
    <tr><td class="hint" colspan="5">Hijau = pemasukan, Merah = pengeluaran, Biru = saldo/laba. File ini bisa dibuka di Excel atau LibreOffice Calc.</td></tr>
  </table>

  <table>
    <tr><td class="section" colspan="2">RINGKASAN UTAMA</td></tr>
    <tr><td>Total Pemasukan</td><td class="money income">${rupiahNumber(summary.income)}</td></tr>
    <tr><td>Total Pengeluaran</td><td class="money expense">${rupiahNumber(summary.expense)}</td></tr>
    <tr><td>Saldo / Laba</td><td class="money profit">${rupiahNumber(summary.profit)}</td></tr>
  </table>

  <table>
    <tr><td class="section" colspan="5">RINGKASAN KATEGORI</td></tr>
    <tr>
      <th>Kode Kategori</th>
      <th>Kategori</th>
      <th>Tipe</th>
      <th>Jumlah Transaksi</th>
      <th>Total</th>
    </tr>
    ${categoryRows || '<tr><td colspan="5">Belum ada data kategori.</td></tr>'}
  </table>

  <table>
    <tr><td class="section" colspan="8">DETAIL TRANSAKSI UNTUK AUDIT</td></tr>
    <tr>
      <th>No</th>
      <th>Tanggal</th>
      <th>Tipe</th>
      <th>Kode Kategori</th>
      <th>Kategori</th>
      <th>Order</th>
      <th>Deskripsi</th>
      <th>Nominal</th>
    </tr>
    ${detailRows || '<tr><td colspan="8">Belum ada transaksi tercatat.</td></tr>'}
  </table>
</body>
</html>`;
}
