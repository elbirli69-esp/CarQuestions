import { cochesNetProvider } from "@/lib/sources/coches-net/provider";

async function main(): Promise<void> {
  console.log("Smoke: search BMW X1 2019 diesel...");
  const search = await cochesNetProvider.searchComparables({
    brand: "BMW",
    model: "X1",
    year: 2019,
    mileage: 75000,
    fuel: "diesel",
    limit: 10,
  });
  console.log("listings:", search.listings.length);
  console.log("notes:", search.notes.slice(0, 4).join("\n"));

  const url =
    "https://www.coches.net/bmw-x1-sdrive18d-5p-diesel-2019-en-madrid-71004278-covo.aspx";
  console.log("\nSmoke: extract URL...");
  const extract = await cochesNetProvider.extractListing(url);
  console.log("status:", extract.status, extract.message);
  console.log("vehicle:", {
    price: extract.vehicle?.advertisedPrice,
    km: extract.vehicle?.mileage,
    power: extract.vehicle?.power,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
