import { extract, computePackId } from "../client/src/lib/lanternExtract";

// Mock Text
const text = "Apple Inc. reported $5 million in revenue on January 1, 2023. 'Great result,' said Tim.";

console.log("--- SMOKE TEST: Lantern Extraction ---");

// 1. Test Extraction
try {
    const start = performance.now();
    const result = extract(text, { mode: "balanced" });
    const duration = performance.now() - start;

    console.log(`[PASS] Extraction completed in ${duration.toFixed(2)}ms`);
    console.log(`- Entities: ${result.items.entities.length}`);
    console.log(`- Quotes: ${result.items.quotes.length}`);
    console.log(`- Metrics: ${result.items.metrics.length}`);
    console.log(`- Timeline: ${result.items.timeline.length}`);

    if (result.items.entities.length === 0) throw new Error("Failed to extract entities");
    if (result.items.metrics.length === 0) throw new Error("Failed to extract metrics");

    // 2. Test Determinism (ID Generation)
    const id1 = computePackId({ items: result.items }, "hash1");
    const id2 = computePackId({ items: result.items }, "hash1");

    if (id1 !== id2) throw new Error("Determinism Check Failed: IDs do not match");
    console.log(`[PASS] Determinism Check (ID: ${id1})`);

    console.log("\n✅ SMOKE TEST PASSED");
    process.exit(0);
} catch (e) {
    console.error("\n❌ SMOKE TEST FAILED", e);
    process.exit(1);
}
