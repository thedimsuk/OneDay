import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { SiteHeader } from "@/components/site-header";
import { requireUserPage } from "@/lib/auth-guard";
import { readAllProducts } from "@/lib/product-store";
import type { Size } from "@/lib/products";

const validSizes: Size[] = ["S", "M", "L", "XL", "XXL"];

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; product?: string; size?: string; qty?: string; items?: string }>;
}) {
  const params = await searchParams;
  if (params.order) {
    redirect(`/checkout/payment?order=${encodeURIComponent(params.order)}`);
  }

  const session = await requireUserPage("/checkout");
  const products = await readAllProducts();
  if (!products.length) redirect("/products");
  const productId = params.product;
  const product = products.find((item) => item.id === productId) ?? products[0];
  if (product.stock < 1) redirect(`/products/${encodeURIComponent(product.id)}`);
  const sizeParam = params.size;
  const size = validSizes.includes(sizeParam as Size) ? (sizeParam as Size) : "M";
  const quantityParam = Number(params.qty);
  const quantity = Math.max(1, Math.min(product.stock, Number(quantityParam) || 1));
  const cartItems = parseCheckoutItems(params.items)
    .map((item) => {
      const itemProduct = products.find((productItem) => productItem.id === item.productId);
      if (!itemProduct) {
        return null;
      }
      if (itemProduct.stock < 1) return null;

      return {
        product: itemProduct,
        size: validSizes.includes(item.size as Size) ? (item.size as Size) : "M",
        quantity: Math.max(1, Math.min(itemProduct.stock, Number(item.quantity) || 1)),
      };
    })
    .filter((item): item is { product: typeof product; size: Size; quantity: number } => Boolean(item));

  return (
    <>
      <SiteHeader />
      <CheckoutForm
        product={product}
        initialSize={size}
        initialQuantity={quantity}
        accountEmail={session.email}
        checkoutItems={cartItems.length ? cartItems : undefined}
      />
    </>
  );
}

function parseCheckoutItems(raw?: string) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Array<{ productId?: string; size?: string; quantity?: number }>;
    return Array.isArray(parsed)
      ? parsed.filter((item) => item.productId && item.size && item.quantity)
      : [];
  } catch {
    return [];
  }
}
