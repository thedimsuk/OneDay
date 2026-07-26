"use server";

import { redirect } from "next/navigation";

export async function createProductAction() {
  redirect("/admin/products");
}
