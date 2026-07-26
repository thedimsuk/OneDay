import type { Size } from "@/lib/products";

export type CartItem = {
  productId: string;
  size: Size;
  quantity: number;
};

const cartStorageKey = "oneday_cart_items";
export const cartChangedEvent = "oneday-cart-changed";

export function readCartItems() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(cartStorageKey) || "[]") as CartItem[];
  } catch {
    return [];
  }
}

export function writeCartItems(items: CartItem[]) {
  window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  window.dispatchEvent(new Event(cartChangedEvent));
}

export function addCartItem(item: CartItem) {
  const items = readCartItems();
  const existing = items.find((cartItem) => cartItem.productId === item.productId && cartItem.size === item.size);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.unshift(item);
  }

  writeCartItems(items);
  return items;
}

export function removeCartItems(itemsToRemove: Array<Pick<CartItem, "productId" | "size">>) {
  const removeKeys = new Set(itemsToRemove.map((item) => `${item.productId}:${item.size}`));
  const items = readCartItems().filter((item) => !removeKeys.has(`${item.productId}:${item.size}`));
  writeCartItems(items);
  return items;
}

export function countCartItems(items = readCartItems()) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
