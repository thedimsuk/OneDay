export const privateNoStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export const publicCatalogHeaders = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
} as const;
