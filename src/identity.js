/**
 * BookLeaf — Identity Unification Module
 *
 * Links author identities across platforms using:
 * 1. Exact email matching
 * 2. Phone number normalization + fuzzy match
 * 3. Name token similarity (Jaro-Winkler)
 * 4. Social handle pattern matching
 *
 * Any match below CONFIDENCE_THRESHOLD is flagged for manual review.
 */

const CONFIDENCE_THRESHOLD = 0.80; // 80% — escalate below this

// ─── Sample identity store (mock CRM profiles) ───────────────────────────────
const AUTHOR_PROFILES = [
  {
    internal_id: "auth_005",
    canonical_name: "Sara Johnson",
    canonical_email: "sara.johnson@xyz.com",
    phone: "+919876543210",
    dashboard_name: "Sara J.",
    instagram: null,
    linked_identities: [],
  },
  {
    internal_id: "auth_001",
    canonical_name: "Priya Sharma",
    canonical_email: "priya.sharma@gmail.com",
    phone: "+919988776655",
    dashboard_name: "Priya S.",
    instagram: "@priyawrites",
    linked_identities: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize phone: strip spaces/dashes/parens, ensure +91 prefix for India */
function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) cleaned = "+91" + cleaned.slice(1);
  if (cleaned.length === 10) cleaned = "+91" + cleaned;
  return cleaned;
}

/** Jaro similarity between two strings (0–1) */
function jaroSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
}

/** Jaro-Winkler similarity (boosts prefix matches) */
function jaroWinkler(s1, s2) {
  const jaro = jaroSimilarity(s1.toLowerCase(), s2.toLowerCase());
  let prefixLen = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i].toLowerCase() === s2[i].toLowerCase()) prefixLen++;
    else break;
  }
  return jaro + prefixLen * 0.1 * (1 - jaro);
}

/** Token-based name similarity: "Sara J." vs "Sara Johnson" */
function nameSimilarity(name1, name2) {
  const tokens1 = name1.toLowerCase().replace(/\./g, "").split(/\s+/);
  const tokens2 = name2.toLowerCase().replace(/\./g, "").split(/\s+/);

  let score = 0;
  let comparisons = 0;

  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      // Abbreviated token: "j" matches "johnson" if first char matches
      if (t1.length === 1 && t2.startsWith(t1)) { score += 0.7; comparisons++; continue; }
      if (t2.length === 1 && t1.startsWith(t2)) { score += 0.7; comparisons++; continue; }
      const sim = jaroWinkler(t1, t2);
      if (sim > 0.6) { score += sim; comparisons++; }
    }
  }

  return comparisons > 0 ? Math.min(score / comparisons, 1) : 0;
}

/** Social handle similarity: "@sarapoetry23" vs "Sara Johnson" */
function handleSimilarity(handle, canonicalName) {
  if (!handle) return 0;
  const clean = handle.replace(/^@/, "").toLowerCase();
  const nameLower = canonicalName.toLowerCase().replace(/\s/g, "");
  const firstName = canonicalName.split(" ")[0].toLowerCase();

  if (clean.includes(nameLower)) return 0.95;
  if (clean.includes(firstName)) return 0.75;
  return jaroWinkler(clean, nameLower) * 0.6; // scale down for handles
}

// ─── Core Identity Matcher ────────────────────────────────────────────────────

/**
 * Match an incoming identity signal to an existing author profile.
 * @param {Object} incoming - { email?, phone?, name?, instagram? }
 * @returns {Array} - Ranked matches with confidence scores
 */
export function matchIdentity(incoming) {
  const results = [];

  for (const profile of AUTHOR_PROFILES) {
    const signals = [];

    // 1. Email exact match (highest weight)
    if (incoming.email && profile.canonical_email) {
      if (incoming.email.toLowerCase() === profile.canonical_email.toLowerCase()) {
        signals.push({ channel: "email", confidence: 0.99, method: "exact" });
      } else if (incoming.email.split("@")[0] === profile.canonical_email.split("@")[0]) {
        signals.push({ channel: "email", confidence: 0.6, method: "username_match" });
      }
    }

    // 2. Phone normalization + match
    if (incoming.phone && profile.phone) {
      const norm1 = normalizePhone(incoming.phone);
      const norm2 = normalizePhone(profile.phone);
      if (norm1 && norm2 && norm1 === norm2) {
        signals.push({ channel: "phone", confidence: 0.97, method: "exact_normalized" });
      }
    }

    // 3. Name token similarity
    if (incoming.name && profile.canonical_name) {
      const nameSim = nameSimilarity(incoming.name, profile.canonical_name);
      if (nameSim > 0.4) {
        signals.push({ channel: "name", confidence: nameSim, method: "jaro_winkler_token" });
      }
    }

    // 4. Dashboard name similarity
    if (incoming.name && profile.dashboard_name) {
      const dashSim = nameSimilarity(incoming.name, profile.dashboard_name);
      if (dashSim > 0.4) {
        signals.push({ channel: "dashboard_name", confidence: dashSim * 0.9, method: "jaro_winkler" });
      }
    }

    // 5. Instagram handle
    if (incoming.instagram && profile.instagram) {
      if (incoming.instagram.toLowerCase() === profile.instagram.toLowerCase()) {
        signals.push({ channel: "instagram", confidence: 0.85, method: "exact" });
      }
    }
    if (incoming.instagram && profile.canonical_name) {
      const handleSim = handleSimilarity(incoming.instagram, profile.canonical_name);
      if (handleSim > 0.3) {
        signals.push({ channel: "instagram_fuzzy", confidence: handleSim, method: "handle_name_match" });
      }
    }

    if (signals.length === 0) continue;

    // Aggregate: weighted average, boosted by multiple signals
    const avgConf = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const multiBoost = signals.length > 1 ? 0.05 * (signals.length - 1) : 0;
    const finalConf = Math.min(avgConf + multiBoost, 0.99);

    results.push({
      profile_id: profile.internal_id,
      canonical_name: profile.canonical_name,
      canonical_email: profile.canonical_email,
      confidence: parseFloat(finalConf.toFixed(3)),
      signals,
      action: finalConf >= CONFIDENCE_THRESHOLD ? "auto_link" : "manual_review",
      needs_verification: finalConf < CONFIDENCE_THRESHOLD,
    });
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Unify a new platform identity into the author profile store.
 * Links if confidence ≥ threshold, flags for review otherwise.
 */
export function unifyIdentity(incoming) {
  const matches = matchIdentity(incoming);

  if (matches.length === 0) {
    return {
      status: "new_author",
      message: "No existing profile found. Create new author record.",
      matches: [],
    };
  }

  const best = matches[0];

  if (best.action === "auto_link") {
    return {
      status: "linked",
      message: `Automatically linked to profile: ${best.canonical_name} (${best.canonical_email})`,
      linked_to: best.profile_id,
      confidence: best.confidence,
      matches,
    };
  }

  return {
    status: "needs_review",
    message: `Best match: ${best.canonical_name} at ${Math.round(best.confidence * 100)}% confidence. Manual verification required.`,
    best_match: best.profile_id,
    confidence: best.confidence,
    matches,
  };
}

// ─── Quick CLI test ───────────────────────────────────────────────────────────
// node src/identity.js
if (process.argv[1].includes("identity")) {
  const testCases = [
    { email: "sara.johnson@xyz.com", name: "Sara", platform: "email" },
    { phone: "+91 9876543210", name: "Sara J.", platform: "whatsapp" },
    { name: "Sara J.", platform: "dashboard" },
    { instagram: "@sarapoetry23", name: "Sara", platform: "instagram" },
  ];

  console.log("\n=== BookLeaf Identity Unification ===\n");
  for (const tc of testCases) {
    const result = unifyIdentity(tc);
    console.log(`Platform: ${tc.platform}`);
    console.log(`Input:`, tc);
    console.log(`Result: ${result.status} — ${result.message}`);
    console.log(`Confidence: ${Math.round((result.confidence || 0) * 100)}%`);
    console.log("---");
  }
}
