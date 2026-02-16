const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const s = pkg.scripts?.["test:integration"] || "";

if (!s.includes("DATABASE_URL=postgresql://")) {
  console.error("ERROR: test:integration must include DATABASE_URL=postgresql://...");
  process.exit(1);
}

console.log("OK: test:integration includes DATABASE_URL=postgresql://");
