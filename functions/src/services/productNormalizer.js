const admin = require("firebase-admin");
const logger = require("../utils/logger");

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function tokenContainmentMatch(needle, haystack) {
  const needleTokens = needle.toLowerCase().split(/\s+/);
  const haystackTokens = haystack.toLowerCase().split(/\s+/);
  return needleTokens.every(t => haystackTokens.includes(t));
}

class ProductNormalizer {
  constructor() {
    this._db = null;
  }

  get db() {
    if (!this._db) {
      this._db = admin.firestore();
    }
    return this._db;
  }

  async normalize(tenantId, rawProduct) {
    if (!rawProduct || rawProduct === "unknown") return rawProduct;

    const normalized = toTitleCase(rawProduct.trim());

    let catalog = [];
    try {
      const snapshot = await this.db.collection("tenants/" + tenantId + "/products").get();
      snapshot.forEach(doc => catalog.push(doc.data().canonicalName));
    } catch (err) {
      logger.warn("ProductNormalizer: failed to read product catalog", { tenantId, error: err.message });
      return normalized;
    }

    // 1. Exact match
    if (catalog.includes(normalized)) {
      return normalized;
    }

    // 2. Token containment: "Rice" matches "Bags Of Rice"
    for (const canonical of catalog) {
      if (tokenContainmentMatch(normalized, canonical)) {
        logger.info("ProductNormalizer: token-containment snap", { raw: rawProduct, canonical });
        return canonical;
      }
    }

    // 3. Levenshtein fuzzy match (distance <= 2 on any word pair)
    const inputTokens = normalized.toLowerCase().split(/\s+/);
    let bestCanonical = null;
    let bestDist = Infinity;

    for (const canonical of catalog) {
      const canonTokens = canonical.toLowerCase().split(/\s+/);
      for (const it of inputTokens) {
        for (const ct of canonTokens) {
          const d = levenshtein(it, ct);
          if (d < bestDist) {
            bestDist = d;
            bestCanonical = canonical;
          }
        }
      }
    }

    if (bestDist <= 2 && bestCanonical) {
      const inputLen = Math.max(...inputTokens.map(t => t.length));
      const canonLen = Math.max(...bestCanonical.toLowerCase().split(/\s+/).map(t => t.length));
      if (inputLen >= 3 && Math.abs(inputLen - canonLen) <= 2) {
        logger.info("ProductNormalizer: levenshtein snap", {
          raw: rawProduct,
          canonical: bestCanonical,
          distance: bestDist,
        });
        return bestCanonical;
      }
    }

    // 4. New product: add to catalog
    try {
      const productRef = this.db
        .collection("tenants/" + tenantId + "/products")
        .doc(normalized.toLowerCase().replace(/\s+/g, "-"));
      await productRef.set({ canonicalName: normalized }, { merge: true });
      logger.info("ProductNormalizer: new product added to catalog", { tenantId, product: normalized });
    } catch (err) {
      logger.warn("ProductNormalizer: failed to write product catalog", { tenantId, error: err.message });
    }

    return normalized;
  }
}

const productNormalizer = new ProductNormalizer();
module.exports = { productNormalizer, toTitleCase, levenshtein, tokenContainmentMatch };
