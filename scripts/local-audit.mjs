const baseUrl = process.env.AUDIT_URL || "http://127.0.0.1:3001";
const routes = ["/", "/products", "/login", "/api/products", "/robots.txt", "/sitemap.xml"];

async function checkRoute(path) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    headers: {
      "User-Agent": "ONEDAY-local-audit/1.0",
    },
  });

  return {
    path,
    status: response.status,
    cacheControl: response.headers.get("cache-control") || "",
    contentType: response.headers.get("content-type") || "",
  };
}

const results = await Promise.all(routes.map(checkRoute));
const failures = [];

for (const result of results) {
  const okStatus = result.status >= 200 && result.status < 400;
  if (!okStatus) failures.push(`${result.path}: status ${result.status}`);

  if (result.path === "/api/products" && !/s-maxage=60/.test(result.cacheControl)) {
    failures.push(`${result.path}: cache-control public catalog tidak sesuai (${result.cacheControl || "-"})`);
  }
}

console.table(results);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Local route/cache audit: OK");
}
