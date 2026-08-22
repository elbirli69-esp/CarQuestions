import { fetchCochesNetHtml } from "@/lib/sources/coches-net/client";
import { buildSearchUrl } from "@/lib/sources/coches-net/slug";

async function main(): Promise<void> {
  const samples = [
    buildSearchUrl("BMW", "X1", 1, { year: 2019, fuel: "diesel" }),
    buildSearchUrl("BMW", "X1", 1, { year: 2019 }),
    buildSearchUrl("BMW", "X1", 1, { fuel: "diesel" }),
    "https://www.coches.net/bmw/x1/segunda-mano/2019/diesel/",
  ];

  for (const url of samples) {
    console.log("\nURL:", url);
    try {
      const html = await fetchCochesNetHtml(url);
      const adCount = (html.match(/data-ad-id="/g) ?? []).length;
      console.log(`  bytes=${html.length} data-ad-id count=${adCount}`);
      const filterLinks = [...html.matchAll(/href="(\/bmw\/x1\/segunda-mano\/[^"?]+)"/g)]
        .map((m) => m[1])
        .filter((h) => h.split("/").length > 4)
        .slice(0, 15);
      console.log("  sample paths:", filterLinks.join(", "));
    } catch (e) {
      console.log("  error:", e);
    }
  }
}

main();
