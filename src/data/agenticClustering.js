/**
 * agenticClustering.js
 *
 * Single source of truth for all mock data powering the Agentic Clustering Studio.
 * Edit values here; the view imports everything from this one file.
 */

// ─── Command Center ───────────────────────────────────────────────────────────

export const AGENT_MONITOR_ALERT = {
  heading: "5 new store openings detected in Store Master (including Billings, MT).",
  body: "Recommended Action: Initialize a new Tiered Clustering scenario to establish proxy assignments for the incoming network locations.",
  count: 5,
};

/** @deprecated — use CLUSTERS_BY_RUN keyed by run ID */
export const STUDIO_ACTIVE_CLUSTERS = [
  { id: "A-M1-1-P1", label: "Northeast / Urban Affluent",    stores: 54, avgSqft: 78500, proIndex: 1.1, cohesion: 0.86, status: "healthy",   runId: "CR-019" },
  { id: "B-M3-1-P2", label: "West / Contractor-Rich Growth", stores: 38, avgSqft: 76800, proIndex: 2.8, cohesion: 0.81, status: "healthy",   runId: "CR-019" },
  { id: "C-M4-2-P3", label: "Texas / Value-Focused",         stores: 51, avgSqft: 74000, proIndex: 1.4, cohesion: 0.89, status: "healthy",   runId: "CR-019" },
  { id: "D-M2-1-P1", label: "Florida Coast / Premium",       stores: 38, avgSqft: 75200, proIndex: 1.2, cohesion: 0.84, status: "healthy",   runId: "CR-019" },
];

/**
 * All clusters grouped by the run that produced them.
 * Key = Run ID  →  Value = cluster array for that run.
 * Scope / hierarchy context lives in STUDIO_RUN_HISTORY[*].scope.
 */
export const CLUSTERS_BY_RUN = {
  /* ── CR-019 · Wood > Solid Prefinished · Tier 1A–4 (LIVE) ─────────────── */
  "CR-019": [
    { id: "A-M1-1-P1", label: "Northeast / Urban Affluent",    stores: 54, avgSqft: 78500, proIndex: 1.1, cohesion: 0.86, status: "healthy",  salesSqft: 142.0, sellThrough: 68.0, dos: 142, gmroi: 2.8, proxies: [] },
    { id: "B-M3-1-P2", label: "West / Contractor-Rich Growth", stores: 38, avgSqft: 76800, proIndex: 2.8, cohesion: 0.81, status: "healthy",  salesSqft: 118.4, sellThrough: 62.4, dos: 185, gmroi: 2.41, proxies: [{ id: 381, name: "Billings, MT", note: "Zero-sales proxy assigned" }] },
    { id: "C-M4-2-P3", label: "Texas / Value-Focused",         stores: 51, avgSqft: 74000, proIndex: 1.4, cohesion: 0.89, status: "healthy",  salesSqft: 88.6,  sellThrough: 48.2, dos: 210, gmroi: 1.9, proxies: [] },
    { id: "D-M2-1-P1", label: "Florida Coast / Premium",       stores: 38, avgSqft: 75200, proIndex: 1.2, cohesion: 0.84, status: "healthy",  salesSqft: 158.2, sellThrough: 71.5, dos: 165, gmroi: 3.1, proxies: [] },
  ],

  /* ── CR-018 · Tile > Large Porcelain · Tier 1A–2 (archived) ───────────── */
  "CR-018": [
    { id: "A-M1-2-P1", label: "Metro High-Traffic / Design-Led",   stores: 47, avgSqft: 82100, proIndex: 1.3, cohesion: 0.78, status: "healthy",  salesSqft: 131.5, sellThrough: 64.0, dos: 158, gmroi: 2.6 },
    { id: "B-M2-2-P2", label: "Suburban / Renovation-Driven",      stores: 62, avgSqft: 68400, proIndex: 1.0, cohesion: 0.73, status: "healthy",  salesSqft: 104.2, sellThrough: 55.8, dos: 192, gmroi: 2.1 },
    { id: "C-M4-1-P3", label: "Value / Entry-Tile",                stores: 72, avgSqft: 61200, proIndex: 0.8, cohesion: 0.69, status: "risk",     salesSqft: 74.9,  sellThrough: 41.3, dos: 268, gmroi: 1.5 },
  ],

  /* ── CR-017 · Wood > Engineered · Tier 1A–4 (archived) ────────────────── */
  "CR-017": [
    { id: "A-M1-1-P2", label: "Pacific Northwest / Eco-Premium",   stores: 29, avgSqft: 84300, proIndex: 1.7, cohesion: 0.82, status: "healthy",  salesSqft: 149.8, sellThrough: 70.2, dos: 151, gmroi: 2.9 },
    { id: "B-M3-2-P1", label: "Midwest / Trade-Heavy",             stores: 44, avgSqft: 71500, proIndex: 2.1, cohesion: 0.76, status: "healthy",  salesSqft: 112.6, sellThrough: 60.1, dos: 197, gmroi: 2.3 },
    { id: "C-M4-2-P2", label: "Southeast / Mid-Tier",              stores: 58, avgSqft: 65000, proIndex: 1.1, cohesion: 0.71, status: "healthy",  salesSqft: 93.4,  sellThrough: 52.7, dos: 221, gmroi: 1.8 },
    { id: "D-M2-3-P3", label: "Southwest / Entry-Engineered",      stores: 50, avgSqft: 59800, proIndex: 0.9, cohesion: 0.66, status: "risk",     salesSqft: 71.2,  sellThrough: 39.8, dos: 279, gmroi: 1.4 },
  ],

  /* ── CR-016 · LVP > SPC · Tier 1A–3 (archived) ────────────────────────── */
  "CR-016": [
    { id: "A-M2-1-P1", label: "National / LVP-Core",               stores: 89, avgSqft: 73400, proIndex: 1.2, cohesion: 0.72, status: "healthy",  salesSqft: 121.0, sellThrough: 63.5, dos: 174, gmroi: 2.4 },
    { id: "B-M3-3-P2", label: "Urban / SPC-Upgrade",               stores: 41, avgSqft: 79200, proIndex: 1.6, cohesion: 0.68, status: "healthy",  salesSqft: 134.7, sellThrough: 58.9, dos: 188, gmroi: 2.2 },
    { id: "C-M4-1-P2", label: "Rural / Value-SPC",                 stores: 51, avgSqft: 57600, proIndex: 0.7, cohesion: 0.61, status: "risk",     salesSqft: 68.3,  sellThrough: 37.4, dos: 291, gmroi: 1.3 },
  ],
};

export const STUDIO_RUN_HISTORY = [
  {
    id:            "CR-019",
    scenarioName:  "SS26 Solid Prefinished Wood — Full Network Reset",
    author:        "Agent (Auto)",
    scope:         "Wood > Solid Prefinished",
    scopeTag:      "Wood",
    tiers:         "Steps 1–5",
    status:        "live",
    silhouette:    0.84,
    silhouetteLabel: "High",
    date:          "Jul 2026",
  },
  {
    id:            "CR-018",
    scenarioName:  "SS26 Large Porcelain Tile — Regional Pilot",
    author:        "J. Merchant",
    scope:         "Tile > Large Porcelain",
    scopeTag:      "Tile",
    tiers:         "Steps 1–3",
    status:        "archived",
    silhouette:    0.79,
    silhouetteLabel: "Moderate",
    date:          "Jun 2026",
  },
  {
    id:            "CR-017",
    scenarioName:  "FW25 Engineered Wood — Full Reset",
    author:        "D. Rivera",
    scope:         "Wood > Engineered",
    scopeTag:      "Wood",
    tiers:         "Steps 1–5",
    status:        "archived",
    silhouette:    0.77,
    silhouetteLabel: "Moderate",
    date:          "Apr 2026",
  },
  {
    id:            "CR-016",
    scenarioName:  "SS25 LVP/SPC — Steps 1–4 Base Run",
    author:        "S. Patel",
    scope:         "LVP > SPC",
    scopeTag:      "LVP",
    tiers:         "Steps 1–4",
    status:        "archived",
    silhouette:    0.71,
    silhouetteLabel: "Acceptable",
    date:          "Jan 2026",
  },
];

// ─── Cluster Deep-Dive (Screen 2) ─────────────────────────────────────────────

export const CLUSTER_DEEP_DIVE = {
  "A-M1-1-P1": {
    id: "A-M1-1-P1",
    label: "Northeast / Urban Affluent",
    stores: 54, avgSqft: 78500, cohesion: 0.86,
    proIndex: 1.1, income: 103561, homeValue: 901368, dos: 142, gmroi: 2.8,
    aiRead: "Dense urban footprint with high-value catchments. Strong smooth-finish affinity driven by affluent remodeling demand. SKU depth should skew toward wide-plank Matte/Gloss finishes. Minimal DOS risk — high-turn market with $103k median income.",
    spiderAxes: { salesSqft: 88, proIndex: 40, productStyle: 72, demographics: 95, climateRisk: 30, categoryTurn: 85 },
    proxyStores: [],
    coldStart: null,
    telemetry: { catchmentIncome: "$103,561", contractorDensity: "1.1× National Average", dos: "142 Days" },
  },
  "B-M3-1-P2": {
    id: "B-M3-1-P2",
    label: "West / Contractor-Rich Growth",
    stores: 38, avgSqft: 76800, cohesion: 0.81,
    proIndex: 2.8, income: 92665, homeValue: 511048, dos: 185, gmroi: 2.4,
    aiRead: "Highest pro-contractor density in the network (+2.8σ). Wirebrushed Oak is the dominant finish at 64% share. Cold-start proxy Billings, MT assigned to this cohort with demand borrowed 45% from Draper, UT and 35% from Reno, NV. Opening assortment capped at 18–22 SKUs to prevent inventory buildup.",
    spiderAxes: { salesSqft: 75, proIndex: 92, productStyle: 80, demographics: 68, climateRisk: 45, categoryTurn: 70 },
    proxyStores: [
      { id: "B-Draper", name: "Draper, UT",       weight: 45, distance: 0.12 },
      { id: "B-Reno",   name: "Reno, NV",         weight: 35, distance: 0.18 },
      { id: "B-SLC",    name: "Salt Lake City, UT", weight: 20, distance: 0.24 },
    ],
    coldStart: { name: "Billings, MT", storeId: 381 },
    telemetry: { catchmentIncome: "$92,665 (+$14k vs Nat)", contractorDensity: "2.8× National Average", dos: "185 Days (Healthy Turn)" },
  },
  "C-M4-2-P3": {
    id: "C-M4-2-P3",
    label: "Texas / Value-Focused",
    stores: 51, avgSqft: 74000, cohesion: 0.89,
    proIndex: 1.4, income: 83521, homeValue: 363409, dos: 210, gmroi: 1.9,
    aiRead: "High-growth single-family market with value-oriented buyer. Traditional dark finishes lead with 48% share. GBB skews heavily to Good/Better at 87%. DOS at 210 days is within acceptable range but warrants seasonal monitoring for slow movers.",
    spiderAxes: { salesSqft: 60, proIndex: 55, productStyle: 65, demographics: 60, climateRisk: 50, categoryTurn: 55 },
    proxyStores: [],
    coldStart: null,
    telemetry: { catchmentIncome: "$83,521", contractorDensity: "1.4× National Average", dos: "210 Days" },
  },
  "D-M2-1-P1": {
    id: "D-M2-1-P1",
    label: "Florida Coast / Premium",
    stores: 38, avgSqft: 75200, cohesion: 0.84,
    proIndex: 1.2, income: 120868, homeValue: 778472, dos: 165, gmroi: 3.1,
    aiRead: "Premium coastal market with the highest GMROI in the network at 3.1×. Smooth modern finishes dominate at 58%. Climate risk is elevated (FEMA 72/100) — prioritize moisture-resistant SKUs. ASP sits $1.40/sqft above network average, supporting a Best-heavy GBB strategy.",
    spiderAxes: { salesSqft: 90, proIndex: 42, productStyle: 88, demographics: 90, climateRisk: 75, categoryTurn: 88 },
    proxyStores: [],
    coldStart: null,
    telemetry: { catchmentIncome: "$120,868 (+$31k vs Nat)", contractorDensity: "1.2× National Average", dos: "165 Days" },
  },
};

// ─── Cluster Screen 2: Signal Heatmap Bars ────────────────────────────────────

export const CLUSTER_SIGNAL_BARS = {
  "A-M1-1-P1": [
    { label: "Contractor Density",   signal: 2, display: "+0.6σ",          value: "1.1× National Avg"   },
    { label: "Median Income",        signal: 5, display: "+$42k vs Nat",    value: "$103,561"            },
    { label: "Home Value",           signal: 5, display: "+$540k vs Nat",   value: "$901,368"            },
    { label: "Owner-Occupied",       signal: 2, display: "44.5%",           value: "Below national avg"  },
    { label: "Climate Risk (FEMA)",  signal: 1, display: "Low — 18/100",    value: "Minimal flood risk"  },
  ],
  "B-M3-1-P2": [
    { label: "Contractor Density",   signal: 5, display: "+2.8σ",          value: "2.8× National Avg"   },
    { label: "Median Income",        signal: 3, display: "+$14k vs Nat",   value: "$92,665"             },
    { label: "Home Value",           signal: 3, display: "+$150k vs Nat",  value: "$511,048"            },
    { label: "Owner-Occupied",       signal: 4, display: "66.0%",          value: "High homeownership"  },
    { label: "Climate Risk (FEMA)",  signal: 2, display: "Moderate 38/100", value: "Moderate risk"      },
  ],
  "C-M4-2-P3": [
    { label: "Contractor Density",   signal: 3, display: "+0.9σ",          value: "1.4× National Avg"   },
    { label: "Median Income",        signal: 2, display: "–$7k vs Nat",    value: "$83,521"             },
    { label: "Home Value",           signal: 1, display: "–$0k vs Nat",    value: "$363,409"            },
    { label: "Owner-Occupied",       signal: 4, display: "63.4%",          value: "Strong ownership"    },
    { label: "Climate Risk (FEMA)",  signal: 2, display: "Moderate 50/100", value: "Heat/storm risk"    },
  ],
  "D-M2-1-P1": [
    { label: "Contractor Density",   signal: 2, display: "+0.5σ",          value: "1.2× National Avg"   },
    { label: "Median Income",        signal: 5, display: "+$59k vs Nat",   value: "$120,868"            },
    { label: "Home Value",           signal: 5, display: "+$417k vs Nat",  value: "$778,472"            },
    { label: "Owner-Occupied",       signal: 3, display: "61.0%",          value: "Solid ownership"     },
    { label: "Climate Risk (FEMA)",  signal: 5, display: "High — 72/100",  value: "Coastal flood risk"  },
  ],
};

// ─── Cluster Screen 2: Commercial & Taste Telemetry ───────────────────────────

export const CLUSTER_COMMERCIAL_TELEMETRY = {
  "A-M1-1-P1": {
    salesSqft: 142.00, sellThrough: 68.0, gmroi: 2.8, dos: 142,
    finishShare: { "Smooth Gloss": 58, "Matte Lacquer": 28, "Wirebrushed": 14 },
    gbbRatio:    { Good: 15, Better: 40, Best: 45 },
    aspSqft: 6.20,
  },
  "B-M3-1-P2": {
    salesSqft: 118.40, sellThrough: 62.4, gmroi: 2.41, dos: 185,
    finishShare: { "Wirebrushed Oak": 64, "Smooth Gloss": 22, "Hand-Scraped": 14 },
    gbbRatio:    { Good: 20, Better: 50, Best: 30 },
    aspSqft: 5.20,
  },
  "C-M4-2-P3": {
    salesSqft: 88.60,  sellThrough: 48.2, gmroi: 1.9,  dos: 210,
    finishShare: { "Dark Cherry": 48, "Smooth Gloss": 32, "Distressed": 20 },
    gbbRatio:    { Good: 45, Better: 42, Best: 13 },
    aspSqft: 3.80,
  },
  "D-M2-1-P1": {
    salesSqft: 158.20, sellThrough: 71.5, gmroi: 3.1,  dos: 165,
    finishShare: { "Smooth Gloss": 52, "Matte Lacquer": 34, "Wire-Sanded": 14 },
    gbbRatio:    { Good: 12, Better: 38, Best: 50 },
    aspSqft: 7.40,
  },
};

// ─── Cluster Screen 2: Member Store Roster ────────────────────────────────────

export const CLUSTER_MEMBER_STORES = {
  "A-M1-1-P1": [
    { id: 101, name: "Paramus, NJ",       sqft: 86400, proPct: 28, catSales: 158.2, dos: 128, status: "active"    },
    { id: 103, name: "Edison, NJ",        sqft: 82100, proPct: 24, catSales: 144.6, dos: 136, status: "active"    },
    { id: 201, name: "White Plains, NY",  sqft: 79800, proPct: 31, catSales: 139.8, dos: 141, status: "active"    },
    { id: 208, name: "Stamford, CT",      sqft: 76400, proPct: 22, catSales: 133.4, dos: 152, status: "active"    },
    { id: 214, name: "Bethesda, MD",      sqft: 84200, proPct: 19, catSales: 148.1, dos: 121, status: "active"    },
    { id: 219, name: "Alexandria, VA",    sqft: 78600, proPct: 26, catSales: 128.9, dos: 160, status: "active"    },
  ],
  "B-M3-1-P2": [
    { id: 104, name: "Draper, UT",             sqft: 82400, proPct: 38, catSales: 131.2, dos: 162, status: "active"    },
    { id: 212, name: "Reno, NV",               sqft: 76200, proPct: 42, catSales: 118.8, dos: 178, status: "active"    },
    { id: 318, name: "Salt Lake City, UT",      sqft: 79100, proPct: 35, catSales: 108.5, dos: 195, status: "active"    },
    { id: 441, name: "Henderson, NV",           sqft: 74800, proPct: 44, catSales: 122.1, dos: 188, status: "active"    },
    { id: 445, name: "Boise, ID",               sqft: 71300, proPct: 51, catSales: 110.4, dos: 204, status: "active"    },
    { id: 451, name: "Tucson, AZ",              sqft: 68900, proPct: 39, catSales: 98.6,  dos: 221, status: "active"    },
    { id: 381, name: "Billings, MT ★",          sqft: 55000, proPct: null, catSales: null, dos: null, status: "coldstart" },
  ],
  "C-M4-2-P3": [
    { id: 105, name: "Dallas (Plano), TX",      sqft: 80200, proPct: 32, catSales: 96.4,  dos: 202, status: "active"    },
    { id: 109, name: "Houston (Sugar Land), TX", sqft: 77400, proPct: 28, catSales: 88.2,  dos: 218, status: "active"    },
    { id: 301, name: "San Antonio, TX",          sqft: 74100, proPct: 30, catSales: 82.8,  dos: 225, status: "active"    },
    { id: 324, name: "Austin, TX",               sqft: 78900, proPct: 36, catSales: 102.6, dos: 189, status: "active"    },
    { id: 411, name: "Oklahoma City, OK",        sqft: 68800, proPct: 27, catSales: 71.4,  dos: 238, status: "active"    },
  ],
  "D-M2-1-P1": [
    { id: 107, name: "Boca Raton, FL",           sqft: 82100, proPct: 20, catSales: 172.4, dos: 148, status: "active"    },
    { id: 112, name: "Naples, FL",               sqft: 79400, proPct: 17, catSales: 181.2, dos: 138, status: "active"    },
    { id: 218, name: "Palm Beach Gardens, FL",   sqft: 76800, proPct: 22, catSales: 158.8, dos: 158, status: "active"    },
    { id: 312, name: "Sarasota, FL",             sqft: 74200, proPct: 18, catSales: 144.4, dos: 172, status: "active"    },
    { id: 401, name: "Orlando (Dr. Phillips), FL", sqft: 80600, proPct: 24, catSales: 163.8, dos: 162, status: "active"  },
  ],
};

// ─── Per-Tier Work Happening Terminal Logs ────────────────────────────────────

export const TIER_WORK_LOGS = {
  "1A": [
    { t: 0.10, text: "Fetching store centroids for 260 network locations…",        type: "info"    },
    { t: 0.55, text: "Normalizing: SqFt, Store Age Wks, DC Number, Lat/Lon…",     type: "info"    },
    { t: 0.90, text: "Running K-Medoids spatial distance matrix (k=6)…",           type: "info"    },
    { t: 1.35, text: "Medoids converged after 48 iterations.",                      type: "success" },
    { t: 1.70, text: "Evaluating silhouette cohesion score… Score: 0.88 ✓",        type: "success" },
    { t: 2.10, text: "6 Structure Families generated: A (54) · B (55) · C (51) · D (38) · E (34) · F (28)", type: "success" },
    { t: 2.40, text: "Rendering SqFt & Age dispersion boxplots…",                  type: "info"    },
  ],
  "1B": [
    { t: 0.10, text: "Fetching 30-mile ZCTA catchments — 14,414 centroids…",      type: "info"    },
    { t: 0.45, text: "Connecting to US Census ACS 2023 API…",                      type: "info"    },
    { t: 0.80, text: "Integrating IRS SOI income density, Zillow ZHVI…",           type: "info"    },
    { t: 1.20, text: "Importing FEMA NRI climate risk scores…",                    type: "info"    },
    { t: 1.55, text: "Computing Gower distance matrix across 6 market signals…",   type: "info"    },
    { t: 1.90, text: "4 Market Families confirmed (M1–M4). Silhouette: 0.81 ✓",   type: "success" },
    { t: 2.20, text: "M3 signal alert: Contractor density +2.8σ above mean.",      type: "warning" },
  ],
  "2": [
    { t: 0.10, text: "Locking scope: Solid Prefinished Wood (Level 4 Sub-Class)…", type: "info"    },
    { t: 0.40, text: "Fetching 52-week category Sales/SqFt per store…",            type: "info"    },
    { t: 0.75, text: "Computing Sell-Through %, Days of Supply (DOS), GMROI…",     type: "info"    },
    { t: 1.15, text: "⚠ DOS outlier detected: 17 stores at 1,578 days!",          type: "warning" },
    { t: 1.50, text: "Commercial clusters: Tier 1 (High Velocity) · Tier 2 (Mid) · Outlier Isolated", type: "success" },
    { t: 1.85, text: "Tier 2 commercial assignment complete.",                     type: "success" },
  ],
  "coldstart": [
    { t: 0.10, text: "Scanning store master for zero-sales cold-start locations…", type: "info"    },
    { t: 0.45, text: "Detected: Billings MT (#381), Bozeman MT (#382), Spokane WA (#383)…", type: "warning" },
    { t: 0.85, text: "Computing z-score spatial distance to existing peer stores…", type: "info"   },
    { t: 1.25, text: "Proxy anchor match: Draper UT (0.12σ) · Reno NV (0.18σ) · SLC UT (0.24σ)", type: "success" },
    { t: 1.60, text: "🔒 Billings assigned to B-M3 cohort. Borrowing 45/35/20 demand split.", type: "success" },
    { t: 2.00, text: "Opening assortment capped at 18–22 SKUs to prevent inventory risk.", type: "info" },
  ],
  "4": [
    { t: 0.10, text: "Loading catalog attributes: Finish, Species, Width, GBB…",  type: "info"    },
    { t: 0.45, text: "Computing finish affinity per cluster cohort…",              type: "info"    },
    { t: 0.80, text: "B-M3: Wirebrushed Oak dominates at 64% share (+1.9σ).",     type: "success" },
    { t: 1.15, text: "GBB ratios locked per cohort (Good/Better/Best %s)…",       type: "info"    },
    { t: 1.50, text: "3 Style Profiles confirmed: P1 (Premium) · P2 (Mid Rustic) · P3 (Value)", type: "success" },
    { t: 1.85, text: "Mismatch risk flagged: P3 clusters showing 71/100 risk score.", type: "warning" },
  ],
};

// ─── Wizard: Tier 1A ─────────────────────────────────────────────────────────

export const TIER1A_METRICS = [
  { key: "location_sqft",    label: "Store SqFt",           recommended: true  },
  { key: "store_age_weeks",  label: "Store Age (Weeks)",    recommended: true  },
  { key: "dc_nbr",           label: "DC Location",          recommended: true  },
  { key: "lat_lon",          label: "Lat / Long Centroid",  recommended: true  },
  { key: "store_format",     label: "Store Format",         recommended: false },
  { key: "open_date",        label: "Opening Date",         recommended: false },
];

export const TIER1A_FAMILIES = [
  { id: "A", label: "Northeast / Mid-Atlantic",    stores: 54, modalState: "NJ (22%)",  modalRegion: "East (94%)",  modalMarket: "Central NJ (20%)", dc: "99401.0 (100%)", avgLat: 40.67, avgLon: -74.87, avgSqft: 78500, avgAgeWeeks: 260, businessRead: "High-density suburban, mature footprint." },
  { id: "B", label: "Pacific West / Mountain",     stores: 55, modalState: "CA (51%)",  modalRegion: "West (100%)", modalMarket: "Phoenix (11%)",    dc: "99201.0 (55%)",  avgLat: 37.06, avgLon:-117.52, avgSqft: 76800, avgAgeWeeks: 420, businessRead: "Mountain/West coast corridor, long-haul DC dependence." },
  { id: "C", label: "Texas / South Central",       stores: 51, modalState: "TX (65%)",  modalRegion: "South (94%)", modalMarket: "Dallas (16%)",     dc: "99101.0 (92%)",  avgLat: 32.11, avgLon: -94.72, avgSqft: 74000, avgAgeWeeks: 400, businessRead: "High-sqft prototype, pro-heavy markets." },
  { id: "D", label: "Florida Peninsula",           stores: 38, modalState: "FL (92%)",  modalRegion: "South (95%)", modalMarket: "Orlando (18%)",    dc: "99001.0 (97%)",  avgLat: 28.16, avgLon: -81.51, avgSqft: 75200, avgAgeWeeks: 450, businessRead: "High moisture/humidity climate risk, mature stores." },
  { id: "E", label: "Great Lakes / Midwest",       stores: 34, modalState: "IL (32%)",  modalRegion: "West (100%)", modalMarket: "Chicago (32%)",    dc: "99401.0 (79%)",  avgLat: 41.88, avgLon: -91.12, avgSqft: 73500, avgAgeWeeks: 290, businessRead: "Cold climate zone, suburban core." },
  { id: "F", label: "Georgia / Carolinas SE",      stores: 28, modalState: "GA (50%)",  modalRegion: "East (100%)", modalMarket: "North Atlanta (25%)", dc: "99001.0 (86%)", avgLat: 34.66, avgLon: -82.31, avgSqft: 66500, avgAgeWeeks: 370, businessRead: "Compact footprint, hub-adjacent logistics." },
];

// sqft min/q1/median/q3/max per family for the boxplot (simplified as bars)
export const TIER1A_SQFT_DISPERSION = [
  { id: "A", min: 62000, q1: 72000, median: 78500, q3: 85000, max: 98000 },
  { id: "B", min: 58000, q1: 70000, median: 76800, q3: 83000, max: 95000 },
  { id: "C", min: 60000, q1: 68000, median: 74000, q3: 80000, max: 92000 },
  { id: "D", min: 55000, q1: 66000, median: 75200, q3: 82000, max: 93000 },
  { id: "E", min: 52000, q1: 64000, median: 73500, q3: 79000, max: 88000 },
  { id: "F", min: 48000, q1: 58000, median: 66500, q3: 74000, max: 82000 },
];

export const TIER1A_AGE_DISPERSION = [
  { id: "A", min: 80,  q1: 180, median: 260, q3: 340, max: 480 },
  { id: "B", min: 120, q1: 300, median: 420, q3: 540, max: 720 },
  { id: "C", min: 100, q1: 280, median: 400, q3: 520, max: 680 },
  { id: "D", min: 150, q1: 340, median: 450, q3: 560, max: 700 },
  { id: "E", min: 60,  q1: 190, median: 290, q3: 380, max: 520 },
  { id: "F", min: 90,  q1: 250, median: 370, q3: 460, max: 620 },
];

export const TIER1A_MICRO_INSIGHT = "82% of Family B stores rely on DC 99201.0 (Salt Lake City) for long-haul freight. Physical store size averages 76,800 sq ft. Grouping by Tier 1A isolates spatial dock and pallet constraints prior to category allocation.";

// ─── Wizard: Tier 1B ─────────────────────────────────────────────────────────

export const TIER1B_METRICS = [
  { key: "ZBP_establishments", label: "Contractor Density",    recommended: true  },
  { key: "ACS_median_inc",     label: "Median Income",         recommended: true  },
  { key: "ZHVI_index",         label: "Home Value Index",      recommended: true  },
  { key: "housing_age",        label: "Pre-1980 Housing Share", recommended: true  },
  { key: "agi_density",        label: "IRS AGI Density",       recommended: false },
  { key: "fema_nri",           label: "FEMA Climate Risk",     recommended: false },
];

export const TIER1B_FAMILIES = [
  {
    id: "M1", merchantName: "Established-Home / Dense",
    stores: 18, households: 4536109, income: 103561, homeValue: 901368,
    ownerShare: 44.5, olderHomeShare: 73.1,
    businessRead: "Dense market, large catchment, older home dominance. High remodel demand.",
  },
  {
    id: "M2", merchantName: "Affluent Trade Area",
    stores: 44, households: 1826112, income: 120868, homeValue: 778472,
    ownerShare: 61.0, olderHomeShare: 59.5,
    businessRead: "High income, $100k+ AGI tax return density, home-improvement heavy.",
  },
  {
    id: "M3", merchantName: "Contractor-Rich Trade Area",
    stores: 73, households: 857472, income: 92665, homeValue: 511048,
    ownerShare: 66.0, olderHomeShare: 38.0,
    businessRead: "Highest relative signal for residential contractor establishments per 10k households.",
    highlight: true,
  },
  {
    id: "M4", merchantName: "Growth Trade Area",
    stores: 124, households: 1023555, income: 83521, homeValue: 363409,
    ownerShare: 63.4, olderHomeShare: 42.1,
    businessRead: "Single-family detached share, high housing momentum, value-focused.",
  },
];

// Signal strength: value 1–5 (5 = strongest positive signal)
export const TIER1B_SIGNAL_MATRIX = {
  headers: ["Households", "Median Income", "Home Value", "Owner Share", "Pre-1980 Home", "Pro Density"],
  rows: [
    { family: "M1", values: [4, 4, 5, 1, 5, 2] },
    { family: "M2", values: [2, 5, 5, 3, 3, 2] },
    { family: "M3", values: [1, 3, 2, 4, 1, 5] },  // M3 highlights Pro Density
    { family: "M4", values: [2, 2, 1, 4, 1, 2] },
  ],
};

export const TIER1B_MICRO_INSIGHT = "Market M3 exhibits +2.8σ higher concentration of residential construction establishments per 10k households. Stores mapped to B-M3 combine small-format mountain physical footprints with pro-heavy trade area demand.";

// ─── Wizard: Scope + Tier 2 ──────────────────────────────────────────────────

export const SCOPE_HIERARCHY = {
  l1: ["Wood", "Tile", "Laminate & Vinyl", "Installation Materials"],
  l2: {
    "Wood": ["Wood", "Accessories"],
    "Tile": ["Ceramic", "Porcelain", "Natural Stone", "Mosaic"],
    "Laminate & Vinyl": ["LVP", "Laminate", "SPC"],
    "Installation Materials": ["Grout", "Adhesive", "Underlayment"],
  },
  l3: {
    "Wood / Wood": ["Solid Wood", "Engineered Wood"],
    "Wood / Accessories": ["Moldings", "Transitions"],
    "Tile / Ceramic": ["Floor Tile", "Wall Tile"],
    "Tile / Porcelain": ["Large Porcelain", "Standard Porcelain"],
    "Tile / Natural Stone": ["Marble", "Travertine", "Slate"],
    "Tile / Mosaic": ["Glass Mosaic", "Stone Mosaic"],
    "Laminate & Vinyl / LVP": ["WPC", "SPC"],
    "Laminate & Vinyl / Laminate": ["AC3", "AC4"],
    "Laminate & Vinyl / SPC": ["Rigid Core"],
    "Installation Materials / Grout": ["Sanded", "Unsanded"],
    "Installation Materials / Adhesive": ["Thinset", "Mastic"],
    "Installation Materials / Underlayment": ["Foam", "Felt"],
  },
  l4: {
    "Wood / Wood / Solid Wood": ["Solid Prefinished Wood", "Solid Unfinished Wood"],
    "Wood / Wood / Engineered Wood": ["Engineered Prefinished", "Engineered Unfinished"],
    "Tile / Porcelain / Large Porcelain": ["24x48 Porcelain", "24x24 Porcelain"],
    "Tile / Porcelain / Standard Porcelain": ["12x24 Porcelain", "12x12 Porcelain"],
    "Laminate & Vinyl / LVP / SPC": ["Rigid Core SPC", "Acoustic SPC"],
    "Laminate & Vinyl / LVP / WPC": ["Standard WPC", "Premium WPC"],
  },
};

export const TIER2_METRICS = [
  { key: "subclass_sales_sqft", label: "Sales / SqFt",       recommended: true  },
  { key: "sell_through_pct",   label: "Sell-Through %",      recommended: true  },
  { key: "category_dos",       label: "Days of Supply",      recommended: true  },
  { key: "category_gmroi",     label: "GMROI",               recommended: true  },
  { key: "category_oos_rate",  label: "OOS Rate",            recommended: false },
  { key: "category_turns",     label: "Inventory Turns",     recommended: false },
];

export const TIER2_COMMERCIAL_CLUSTERS = [
  { id: "1", label: "High Velocity",    stores: 92, salesSqft: 142, sellThrough: 68, dos: 142,  gmroi: 2.8, risk: "none" },
  { id: "2", label: "Mid Velocity",     stores: 78, salesSqft: 118, sellThrough: 62, dos: 185,  gmroi: 2.4, risk: "none" },
  { id: "3", label: "Slow Turn",        stores: 51, salesSqft: 66,  sellThrough: 38, dos: 420,  gmroi: 1.1, risk: "moderate" },
  { id: "4", label: "Critical Overbuy", stores: 17, salesSqft: 28,  sellThrough: 12, dos: 1578, gmroi: 0.0, risk: "critical" },
];

export const TIER2_COMPARISON_TABLE = [
  { store: "Reno, NV",   totalRank: 112, categoryRank: 14,  variance: "+98 Ranks",   action: "Re-classified to High-Turn Commercial 1" },
  { store: "Miami, FL",  totalRank: 8,   categoryRank: 210, variance: "-202 Ranks",  action: "Flagged for overbuy DOS reduction" },
  { store: "Dallas, TX", totalRank: 24,  categoryRank: 18,  variance: "+6 Ranks",    action: "No action required" },
  { store: "Portland, OR", totalRank: 88, categoryRank: 95, variance: "-7 Ranks",    action: "Monitor for next season" },
];

export const TIER2_AI_ALERT = "Category isolation reveals that 24 stores in Commercial Cluster 4 carry 1,578 Days of Supply (DOS) with 0.0 GMROI inside Solid Prefinished Wood. Total-store metrics were masking this $1.2M inventory trap.";

// ─── Wizard: Cold-Start ───────────────────────────────────────────────────────

export const COLD_START_STORES = [
  { id: 381, name: "Billings, MT",   sqft: 55000, launch: "SS26", assignedFamily: "B-M3" },
  { id: 382, name: "Bozeman, MT",    sqft: 58000, launch: "SS26", assignedFamily: "B-M3" },
  { id: 383, name: "Spokane, WA",    sqft: 62000, launch: "FW26", assignedFamily: "B-M3" },
  { id: 384, name: "Tucson, AZ",     sqft: 71000, launch: "FW26", assignedFamily: "C-M4" },
  { id: 385, name: "El Paso, TX",    sqft: 74000, launch: "SS27", assignedFamily: "C-M4" },
];

export const PROXY_MATCHES = [
  { store: "Draper, UT",        storeId: 104, structuralMatch: 94, demographicMatch: 91, distance: 0.12, weight: 45 },
  { store: "Reno, NV",          storeId: 212, structuralMatch: 92, demographicMatch: 88, distance: 0.18, weight: 35 },
  { store: "Salt Lake City, UT", storeId: 318, structuralMatch: 89, demographicMatch: 85, distance: 0.24, weight: 20 },
];

export const COLD_START_AI_READ = "Billings, MT assigned to B-M3 proxy cohort. Commercial demand and category velocity will be derived strictly from Draper, Reno, and SLC. Opening assortment capped at 18–22 SKUs to prevent inventory buildup.";

// ─── Wizard: Tier 4 ──────────────────────────────────────────────────────────

export const TIER4_METRICS = [
  { key: "finishType",      label: "Finish Type (Wirebrushed / Smooth)",  recommended: true  },
  { key: "species",         label: "Species (Oak / Hickory / Maple)",     recommended: true  },
  { key: "goodBetterBest",  label: "Price Tier Mix (GBB)",                recommended: true  },
  { key: "actualWidth",     label: "Plank Width (Wide vs Standard)",      recommended: true  },
  { key: "colorFamily",     label: "Color Family",                        recommended: false },
  { key: "surfaceTexture",  label: "Surface Texture",                     recommended: false },
];

export const TIER4_PROFILES = [
  {
    id: "P1",
    label: "Smooth Modern / Premium",
    finishShare: { "Smooth Gloss": 58, "Matte Lacquer": 28, "Wirebrushed": 14 },
    gbbMix: { Good: 15, Better: 40, Best: 45 },
    aspSqft: 6.20,
    mismatchRisk: 18,
  },
  {
    id: "P2",
    label: "Wirebrushed Rustic / Mid",
    finishShare: { "Wirebrushed Oak": 64, "Hand-Scraped": 22, "Smooth Gloss": 14 },
    gbbMix: { Good: 20, Better: 50, Best: 30 },
    aspSqft: 5.20,
    mismatchRisk: 12,
  },
  {
    id: "P3",
    label: "Traditional Dark / Value",
    finishShare: { "Dark Cherry": 48, "Smooth Gloss": 32, "Distressed": 20 },
    gbbMix: { Good: 45, Better: 42, Best: 13 },
    aspSqft: 3.80,
    mismatchRisk: 71,
  },
];

export const TIER4_TELEMETRY = {
  "B-M3-1-P2": {
    topStyle: "Wirebrushed Rustic Oak",
    gbbSummary: "20% Good / 50% Better / 30% Best",
    aspSqft: "$5.20 (+18% vs Nat Avg)",
    mismatchRisk: "LOW (12/100)",
  },
};

// ─── Execution Terminal ───────────────────────────────────────────────────────

export const TERMINAL_LOG_LINES = [
  { time: "15:59:01", icon: "🤖", text: "INITIALIZING AGENTIC CLUSTERING ENGINE (v3.4)...", type: "info" },
  { time: "15:59:02", icon: "📥", text: "FETCHING STORE MASTER: 260 Mature Locations, 5 Cold-Start Locations.", type: "info" },
  { time: "15:59:03", icon: "⚙️",  text: "TIER 1A PIPELINE: Loading SqFt, Age, Lat/Long, DC Location mapping...", type: "info" },
  { time: "15:59:04", icon: "✅", text: "Tier 1A Complete: 6 Structure Families Generated (A–F). Silhouette Score: 0.88.", type: "success" },
  { time: "15:59:05", icon: "⚙️",  text: "TIER 1B PIPELINE: Fetching 30-mile ZCTA catchments (14,414 centroids)...", type: "info" },
  { time: "15:59:06", icon: "🌍", text: "Connecting to ACS Demographics, IRS SOI, Zillow ZHVI, FEMA NRI...", type: "info" },
  { time: "15:59:07", icon: "✅", text: "Tier 1B Complete: 4 Market Context Families Mapped (M1–M4).", type: "success" },
  { time: "15:59:08", icon: "🎯", text: "TIER 2 PIPELINE: Scoping down to Level 4 (Solid Prefinished Wood)...", type: "info" },
  { time: "15:59:09", icon: "📥", text: "Fetching 52-week Category Velocity, Sell-Through %, DOS, GMROI...", type: "info" },
  { time: "15:59:10", icon: "🔒", text: "COLD-START DETECTED: Billings, MT (Store #381).", type: "warning" },
  { time: "15:59:11", icon: "⚡", text: "Bypassing Tier 2/4 historical sales for cold-start locations.", type: "warning" },
  { time: "15:59:12", icon: "✅", text: "Dual-Anchor Proxy Match: Billings mapped to B-M3 Twins (Draper UT, Reno NV, SLC UT).", type: "success" },
  { time: "15:59:13", icon: "🎨", text: "TIER 4 PIPELINE: Integrating catalog attributes (Wirebrushed, Species, GBB Mix)...", type: "info" },
  { time: "15:59:14", icon: "🧮", text: "COMPUTING HYBRID GOWER K-MEDOIDS DISTANCE MATRIX...", type: "info" },
  { time: "15:59:15", icon: "📊", text: "EVALUATING SILHOUETTE COHESION... Score: 0.84 (High Separation).", type: "success" },
  { time: "15:59:16", icon: "🤖", text: "SYNTHESIZING 4-PART INTEGRATED LABELS (e.g., B-M3-1-P2)...", type: "info" },
  { time: "15:59:17", icon: "⚠️", text: "ALERT: 17 stores in B-M3-2-P3 show 1,578 DOS risk. Generating Commercial Risk Heatmap...", type: "warning" },
  { time: "15:59:18", icon: "🚀", text: "SYNTHESIS COMPLETE. Transitioning to Scenario Review & Finalization...", type: "success" },
];

// ─── Scenario Review ─────────────────────────────────────────────────────────

export const STUDIO_SCENARIOS = [
  {
    id: "A",
    label: "Scenario A",
    subtitle: "Structure-Heavy",
    description: "Prioritizes Tier 1A physical footprint groupings. Best for supply chain and logistics planning.",
    recommended: false,
  },
  {
    id: "B",
    label: "Scenario B",
    subtitle: "Balanced Behavior",
    description: "Balances structure, market context, commercial velocity, and style. Recommended for end-to-end assortment planning.",
    recommended: true,
  },
  {
    id: "C",
    label: "Scenario C",
    subtitle: "Attribute-Led",
    description: "Prioritizes Tier 4 aesthetic taste and product profile. Best for local line review and style curation.",
    recommended: false,
  },
];

export const AGENT_SCENARIO_RECOMMENDATION = "Scenario B (Balanced Behavior) is RECOMMENDED. It successfully segregates the 1,578-day DOS overbuy risk into Cluster B-M3-2-P3, protecting Open-To-Buy dollars across high-growth markets.";

export const SCENARIO_FULL_CLUSTERS = [
  {
    id: "A-M1-1-P1",
    label: "Northeast / Urban Affluent",
    stores: 54,
    salesSqft: 142,
    sellThrough: 68,
    dos: 142,
    gmroi: 2.8,
    aesthetic: "Smooth / High-Gloss Cool",
    riskStatus: "healthy",   // "healthy" | "risk" | "critical" | "coldstart"
    spiderAxes: [88, 40, 72, 95, 30, 85],
  },
  {
    id: "B-M3-1-P2",
    label: "West / Contractor-Rich Growth",
    stores: 38,
    salesSqft: 118,
    sellThrough: 62,
    dos: 185,
    gmroi: 2.4,
    aesthetic: "Wirebrushed / Rustic Oak",
    riskStatus: "healthy",
    spiderAxes: [75, 92, 80, 68, 45, 70],
  },
  {
    id: "B-M3-2-P3",
    label: "Mountain West / Overbuy Risk",
    stores: 17,
    salesSqft: 28,
    sellThrough: 12,
    dos: 1578,
    gmroi: 0.0,
    aesthetic: "Traditional Dark Cherry",
    riskStatus: "critical",
    spiderAxes: [18, 55, 22, 50, 40, 10],
  },
  {
    id: "B-M3-CS",
    label: "Billings MT (Cold-Start Proxy)",
    stores: 1,
    salesSqft: 105,   // projected
    sellThrough: 58,  // projected
    dos: 160,         // projected
    gmroi: 2.1,       // projected
    aesthetic: "Wirebrushed Rustic Oak",
    riskStatus: "coldstart",
    spiderAxes: [68, 88, 78, 65, 42, 65],
    isProxy: true,
  },
];

export const SKU_SCORECARD = [
  {
    cluster: "B-M3-1-P2",
    action: "ADD",
    sku: "100892",
    description: '3/4in Gunstock Oak Wirebrushed',
    attr: "Wide-Plank / Rustic",
    rationale: "Matches 64% local finish preference; +18% ASP lift.",
  },
  {
    cluster: "B-M3-1-P2",
    action: "DROP",
    sku: "100411",
    description: "3/8in Smooth High-Gloss Cherry",
    attr: "Narrow-Plank / Traditional",
    rationale: "Low affinity (<8% share); driving 420+ DOS in peer stores.",
  },
  {
    cluster: "B-M3-2-P3",
    action: "FREEZE",
    sku: "ALL",
    description: "Solid Prefinished Sub-Class",
    attr: "High DOS Outliers",
    rationale: "Cap open orders until 1,578-day inventory clears.",
  },
  {
    cluster: "A-M1-1-P1",
    action: "ADD",
    sku: "100654",
    description: "5/8in Matte Ash Smooth",
    attr: "Wide-Plank / Modern",
    rationale: "Aligns with M1 premium taste profile; $+22% ASP vs cluster avg.",
  },
];

// ─── Wizard Defaults ─────────────────────────────────────────────────────────

export const STUDIO_WIZARD_DEFAULTS = {
  // Step 0: Tier 1A — all features selected by default (users can uncheck)
  tier1aMetrics: TIER1A_METRICS.map((m) => m.key),
  useAgentTier1a: true,
  // Step 1: Tier 1B — all features selected by default
  tier1bMetrics: TIER1B_METRICS.map((m) => m.key),
  catchmentRadius: "30-Mile ZCTA Centroid Radius",
  useAgentTier1b: true,
  // Step 2: Scope
  scopeL1: "Wood",
  scopeL2: "Wood",
  scopeL3: "Solid Wood",
  scopeL4: "Solid Prefinished Wood",
  tier2Metrics: TIER2_METRICS.map((m) => m.key),
  useAgentTier2: true,
  // Step 3: Cold-start (no editable defaults — auto-detected)
  // Step 4: Tier 4 — all features selected by default
  tier4Metrics: TIER4_METRICS.map((m) => m.key),
  useAgentTier4: true,
};

// ─── Label color mapping (for 4-part label pills) ────────────────────────────

export const LABEL_COLORS = {
  structure: { A: "#2D6A2D", B: "#0B7A6C", C: "#D97706", D: "#7C3AED", E: "#2563EB", F: "#B45309" },
  market:    { M1: "#0891B2", M2: "#6366F1", M3: "#059669", M4: "#DC2626" },
  commercial:{ "1": "#16A34A", "2": "#CA8A04", "3": "#EA580C", "4": "#DC2626" },
  style:     { P1: "#8B5CF6", P2: "#14B8A6", P3: "#F43F5E", CS: "#6B7280" },
};

// ═══ Interactive Cluster Explorer — configs + synthetic per-store rosters ══════
//
// The results view needs per-store cluster membership so it can recompute cluster
// KPIs, counts and dispersion in real time when a store is reassigned. The source
// data only carries aggregate rows, so we deterministically synthesize a plausible
// store roster per cluster from each cluster's averages / dispersion stats.

const CLX_CITY_POOL = [
  ["Dallas", "TX"], ["Houston", "TX"], ["Austin", "TX"], ["San Antonio", "TX"], ["El Paso", "TX"],
  ["Atlanta", "GA"], ["Savannah", "GA"], ["Charlotte", "NC"], ["Raleigh", "NC"],
  ["Orlando", "FL"], ["Tampa", "FL"], ["Miami", "FL"], ["Jacksonville", "FL"],
  ["Newark", "NJ"], ["Edison", "NJ"], ["New York", "NY"], ["Buffalo", "NY"], ["Hartford", "CT"],
  ["Philadelphia", "PA"], ["Pittsburgh", "PA"], ["Boston", "MA"], ["Nashua", "NH"],
  ["Denver", "CO"], ["Salt Lake City", "UT"], ["Provo", "UT"], ["Boise", "ID"],
  ["Phoenix", "AZ"], ["Tucson", "AZ"], ["Las Vegas", "NV"], ["Reno", "NV"],
  ["Los Angeles", "CA"], ["San Diego", "CA"], ["Sacramento", "CA"], ["San Jose", "CA"],
  ["Seattle", "WA"], ["Spokane", "WA"], ["Portland", "OR"],
  ["Chicago", "IL"], ["Detroit", "MI"], ["Columbus", "OH"], ["Indianapolis", "IN"],
  ["Nashville", "TN"], ["Louisville", "KY"], ["Kansas City", "MO"], ["Minneapolis", "MN"],
];
const CLX_STATE_CITIES = CLX_CITY_POOL.reduce((m, [c, s]) => { (m[s] = m[s] || []).push(c); return m; }, {});
const CLX_STATES = Object.keys(CLX_STATE_CITIES);

function clxMulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clxHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function clxLerp(a, b, t) { return a + (b - a) * t; }

function clxSampleMetric(spec, u) {
  if (spec.type === "quant") {
    const { min, q1, median, q3, max } = spec.q;
    let v;
    if (u < 0.25)      v = clxLerp(min, q1, u / 0.25);
    else if (u < 0.5)  v = clxLerp(q1, median, (u - 0.25) / 0.25);
    else if (u < 0.75) v = clxLerp(median, q3, (u - 0.5) / 0.25);
    else               v = clxLerp(q3, max, (u - 0.75) / 0.25);
    return Math.round(v);
  }
  // "norm": uniform spread around mean (symmetric so the cluster mean is preserved).
  // absSpread gives an absolute band (used for values where a relative % band is awkward, e.g. year).
  let v;
  if (spec.absSpread != null) v = spec.mean + (u - 0.5) * 2 * spec.absSpread;
  else v = spec.mean + (u - 0.5) * 2 * spec.spread * spec.mean;
  if (spec.clampPct) v = Math.max(0, Math.min(100, v));
  v = Math.max(0, v);
  return Math.round(v * 100) / 100;
}

/** Weighted categorical pick from a { category: weight } map. */
function clxSampleCategory(categories, weights, u) {
  const entries = categories.map((c) => [c, Math.max(0, (weights && weights[c]) || 0)]);
  const total = entries.reduce((a, [, w]) => a + w, 0) || 1;
  const target = u * total;
  let acc = 0;
  for (const [c, w] of entries) { acc += w; if (target <= acc) return c; }
  return categories[categories.length - 1];
}

/** modal-dominant categorical weight map: `modal` gets modalW%, the rest split evenly. */
function clxModalWeights(cats, modal, modalW = 82) {
  const others = cats.filter((c) => c !== modal);
  const rest = others.length ? (100 - modalW) / others.length : 0;
  const w = {};
  cats.forEach((c) => { w[c] = c === modal ? modalW : rest; });
  return w;
}

// ─── Per-tier metric registry ────────────────────────────────────────────────
// Every clustering metric key (matching TIER*_METRICS keys) maps to a descriptor:
//   numeric:     { label, kind:"numeric", format, byCluster: { [clusterId]: quant|norm spec } }
//   categorical: { label, kind:"categorical", format:"text", categories:[...], byCluster: { [clusterId]: weights } }
// This drives synthesis (buildClusterRosters) AND selection-driven plots/table/store view.

const CLX_DC_CATS = ["99401.0", "99201.0", "99101.0", "99001.0"];
const CLX_REGION_CATS = ["East", "West", "South", "Midwest"];
const CLX_FORMAT_CATS = ["Warehouse", "Small-Format", "Prototype"];
const CLX_T1A_FORMAT_W = {
  A: { Warehouse: 70, "Small-Format": 10, Prototype: 20 },
  B: { Warehouse: 65, "Small-Format": 15, Prototype: 20 },
  C: { Warehouse: 60, "Small-Format": 8,  Prototype: 32 },
  D: { Warehouse: 68, "Small-Format": 12, Prototype: 20 },
  E: { Warehouse: 72, "Small-Format": 18, Prototype: 10 },
  F: { Warehouse: 40, "Small-Format": 48, Prototype: 12 },
};
const CLX_T1A_SQ = Object.fromEntries(TIER1A_SQFT_DISPERSION.map((d) => [d.id, d]));
const CLX_T1A_AGE = Object.fromEntries(TIER1A_AGE_DISPERSION.map((d) => [d.id, d]));

const CLX_T1B_CONTRACTOR = { M1: 52, M2: 44, M3: 91, M4: 58 };
const CLX_T1B_AGI        = { M1: 78, M2: 96, M3: 41, M4: 38 };
const CLX_T1B_FEMA       = { M1: 44, M2: 38, M3: 56, M4: 61 };

const CLX_T2_OOS   = { "1": 3, "2": 5, "3": 12, "4": 22 };
const CLX_T2_TURNS = { "1": 2.6, "2": 2.0, "3": 0.9, "4": 0.23 };

const CLX_FINISH_CATS  = ["Smooth Gloss", "Matte Lacquer", "Wirebrushed", "Hand-Scraped", "Dark Cherry", "Distressed"];
const CLX_SPECIES_CATS = ["Oak", "Hickory", "Maple", "Ash", "Cherry"];
const CLX_GBB_CATS     = ["Good", "Better", "Best"];
const CLX_WIDTH_CATS   = ["Wide Plank", "Standard"];
const CLX_COLOR_CATS   = ["Natural", "Dark", "Grey"];
const CLX_TEXTURE_CATS = ["Smooth", "Textured", "Distressed"];

const CLX_METRIC_REGISTRY = {
  "1A": {
    location_sqft: {
      label: "Store SqFt", kind: "numeric", format: "k",
      byCluster: Object.fromEntries(TIER1A_FAMILIES.map((f) => [f.id, { type: "quant", q: CLX_T1A_SQ[f.id] }])),
    },
    store_age_weeks: {
      label: "Store Age (Weeks)", kind: "numeric", format: "weeks",
      byCluster: Object.fromEntries(TIER1A_FAMILIES.map((f) => [f.id, { type: "quant", q: CLX_T1A_AGE[f.id] }])),
    },
    dc_nbr: {
      label: "DC Location", kind: "categorical", format: "text", categories: CLX_DC_CATS,
      byCluster: Object.fromEntries(TIER1A_FAMILIES.map((f) => [f.id, clxModalWeights(CLX_DC_CATS, f.dc.split(" (")[0].trim(), 84)])),
    },
    lat_lon: {
      label: "Region (Lat / Long)", kind: "categorical", format: "text", categories: CLX_REGION_CATS,
      byCluster: Object.fromEntries(TIER1A_FAMILIES.map((f) => [f.id, clxModalWeights(CLX_REGION_CATS, f.modalRegion.split(" (")[0].trim(), 80)])),
    },
    store_format: {
      label: "Store Format", kind: "categorical", format: "text", categories: CLX_FORMAT_CATS,
      byCluster: CLX_T1A_FORMAT_W,
    },
    open_date: {
      label: "Opening Year", kind: "numeric", format: "year",
      byCluster: Object.fromEntries(TIER1A_FAMILIES.map((f) => [f.id, { type: "norm", mean: Math.round(2026 - f.avgAgeWeeks / 52), absSpread: 6 }])),
    },
  },
  "1B": {
    ZBP_establishments: {
      label: "Contractor Density", kind: "numeric", format: "num1",
      byCluster: Object.fromEntries(TIER1B_FAMILIES.map((f) => [f.id, { type: "norm", mean: CLX_T1B_CONTRACTOR[f.id], spread: 0.20 }])),
    },
    ACS_median_inc: {
      label: "Median Income", kind: "numeric", format: "usd",
      byCluster: Object.fromEntries(TIER1B_FAMILIES.map((f) => [f.id, { type: "norm", mean: f.income, spread: 0.18 }])),
    },
    ZHVI_index: {
      label: "Home Value Index", kind: "numeric", format: "usd",
      byCluster: Object.fromEntries(TIER1B_FAMILIES.map((f) => [f.id, { type: "norm", mean: f.homeValue, spread: 0.22 }])),
    },
    housing_age: {
      label: "Pre-1980 Housing Share", kind: "numeric", format: "pct",
      byCluster: Object.fromEntries(TIER1B_FAMILIES.map((f) => [f.id, { type: "norm", mean: f.olderHomeShare, spread: 0.15, clampPct: true }])),
    },
    agi_density: {
      label: "IRS AGI Density", kind: "numeric", format: "num1",
      byCluster: Object.fromEntries(TIER1B_FAMILIES.map((f) => [f.id, { type: "norm", mean: CLX_T1B_AGI[f.id], spread: 0.20 }])),
    },
    fema_nri: {
      label: "FEMA Climate Risk", kind: "numeric", format: "risk",
      byCluster: Object.fromEntries(TIER1B_FAMILIES.map((f) => [f.id, { type: "norm", mean: CLX_T1B_FEMA[f.id], spread: 0.25, clampPct: true }])),
    },
  },
  "2": {
    subclass_sales_sqft: {
      label: "Sales / SqFt", kind: "numeric", format: "usd0",
      byCluster: Object.fromEntries(TIER2_COMMERCIAL_CLUSTERS.map((c) => [c.id, { type: "norm", mean: c.salesSqft, spread: 0.20 }])),
    },
    sell_through_pct: {
      label: "Sell-Through %", kind: "numeric", format: "pct",
      byCluster: Object.fromEntries(TIER2_COMMERCIAL_CLUSTERS.map((c) => [c.id, { type: "norm", mean: c.sellThrough, spread: 0.18, clampPct: true }])),
    },
    category_dos: {
      label: "Days of Supply", kind: "numeric", format: "days",
      byCluster: Object.fromEntries(TIER2_COMMERCIAL_CLUSTERS.map((c) => [c.id, { type: "norm", mean: c.dos, spread: 0.25 }])),
    },
    category_gmroi: {
      label: "GMROI", kind: "numeric", format: "float2",
      byCluster: Object.fromEntries(TIER2_COMMERCIAL_CLUSTERS.map((c) => [c.id, { type: "norm", mean: Math.max(c.gmroi, 0.05), spread: 0.20 }])),
    },
    category_oos_rate: {
      label: "OOS Rate", kind: "numeric", format: "pct",
      byCluster: Object.fromEntries(TIER2_COMMERCIAL_CLUSTERS.map((c) => [c.id, { type: "norm", mean: CLX_T2_OOS[c.id], spread: 0.30, clampPct: true }])),
    },
    category_turns: {
      label: "Inventory Turns", kind: "numeric", format: "float2",
      byCluster: Object.fromEntries(TIER2_COMMERCIAL_CLUSTERS.map((c) => [c.id, { type: "norm", mean: CLX_T2_TURNS[c.id], spread: 0.20 }])),
    },
  },
  "4": {
    finishType: {
      label: "Finish Type", kind: "categorical", format: "text", categories: CLX_FINISH_CATS,
      byCluster: {
        P1: { "Smooth Gloss": 58, "Matte Lacquer": 28, Wirebrushed: 14 },
        P2: { Wirebrushed: 64, "Hand-Scraped": 22, "Smooth Gloss": 14 },
        P3: { "Dark Cherry": 48, "Smooth Gloss": 32, Distressed: 20 },
      },
    },
    species: {
      label: "Species", kind: "categorical", format: "text", categories: CLX_SPECIES_CATS,
      byCluster: {
        P1: { Maple: 38, Ash: 34, Oak: 20, Hickory: 8 },
        P2: { Oak: 52, Hickory: 30, Maple: 12, Ash: 6 },
        P3: { Cherry: 46, Oak: 34, Hickory: 20 },
      },
    },
    goodBetterBest: {
      label: "Price Tier (GBB)", kind: "categorical", format: "text", categories: CLX_GBB_CATS,
      byCluster: Object.fromEntries(TIER4_PROFILES.map((p) => [p.id, p.gbbMix])),
    },
    actualWidth: {
      label: "Plank Width", kind: "categorical", format: "text", categories: CLX_WIDTH_CATS,
      byCluster: {
        P1: { "Wide Plank": 72, Standard: 28 },
        P2: { "Wide Plank": 58, Standard: 42 },
        P3: { "Wide Plank": 30, Standard: 70 },
      },
    },
    colorFamily: {
      label: "Color Family", kind: "categorical", format: "text", categories: CLX_COLOR_CATS,
      byCluster: {
        P1: { Natural: 40, Grey: 38, Dark: 22 },
        P2: { Natural: 64, Dark: 22, Grey: 14 },
        P3: { Dark: 66, Natural: 24, Grey: 10 },
      },
    },
    surfaceTexture: {
      label: "Surface Texture", kind: "categorical", format: "text", categories: CLX_TEXTURE_CATS,
      byCluster: {
        P1: { Smooth: 70, Textured: 22, Distressed: 8 },
        P2: { Textured: 66, Distressed: 20, Smooth: 14 },
        P3: { Distressed: 44, Textured: 34, Smooth: 22 },
      },
    },
  },
};

export { CLX_METRIC_REGISTRY };

/** Resolve one metric descriptor for a tier + key. */
export function getClxMetric(tierKey, key) {
  return (CLX_METRIC_REGISTRY[tierKey] || {})[key] || null;
}

const CLX_TIER_COUNTS = {
  "1A": TIER1A_FAMILIES.map((f) => ({ id: f.id, count: f.stores, modalState: f.modalState.split(" (")[0].trim(), dc: f.dc.split(" (")[0].trim() })),
  "1B": TIER1B_FAMILIES.map((f) => ({ id: f.id, count: f.stores })),
  "2":  TIER2_COMMERCIAL_CLUSTERS.map((c) => ({ id: c.id, count: c.stores })),
  "4":  TIER4_PROFILES.map((p) => ({ id: p.id, count: { P1: 96, P2: 104, P3: 60 }[p.id] || 60 })),
};

/**
 * buildClusterRosters(tierKey) → array of store objects:
 *   { id, storeNo, name, state, clusterId, ...every registry metric value }
 * Deterministic: same seed produces the same roster every render. Every clustering
 * metric for the tier gets a value (numeric number or categorical string) so the
 * results view can plot/aggregate whichever metrics the user has selected.
 */
export function buildClusterRosters(tierKey) {
  const clusters = CLX_TIER_COUNTS[tierKey] || [];
  const registry = CLX_METRIC_REGISTRY[tierKey] || {};
  const registryEntries = Object.entries(registry);
  const stores = [];
  let uid = 0;
  clusters.forEach((cl) => {
    const rand = clxMulberry32(clxHash(`${tierKey}|${cl.id}`));
    for (let i = 0; i < cl.count; i++) {
      uid++;
      let state;
      if (cl.modalState && rand() < 0.6) state = cl.modalState;
      else state = CLX_STATES[Math.floor(rand() * CLX_STATES.length)];
      const cities = CLX_STATE_CITIES[state] || [];
      const city = cities.length ? cities[i % cities.length] : `${state} Metro`;
      const store = {
        id: `${tierKey}-${uid}`,
        storeNo: 100 + uid,
        name: `${city}, ${state}`,
        state,
        clusterId: cl.id,
      };
      registryEntries.forEach(([key, m]) => {
        const cspec = m.byCluster[cl.id];
        store[key] = m.kind === "categorical"
          ? clxSampleCategory(m.categories, cspec, rand())
          : clxSampleMetric(cspec, rand());
      });
      stores.push(store);
    }
  });
  return stores;
}

// Agent-generated one-liner characterizing each cluster (shown per-cluster in every step).
const CLX_CLUSTER_BLURBS = {
  "1A": {
    A: "Large, mature big-box stores across dense Northeast suburbs.",
    B: "Mid-size Western stores reliant on long-haul DC freight.",
    C: "High-square-foot prototypes in pro-heavy Texas markets.",
    D: "Mature Florida stores with high humidity & climate exposure.",
    E: "Newer cold-climate suburban stores across the Midwest.",
    F: "Compact, hub-adjacent stores throughout the Southeast.",
  },
  "1B": {
    M1: "Dense, older-home metros with heavy remodel demand.",
    M2: "Affluent, high-income trade areas skewed to home improvement.",
    M3: "Contractor-rich trade areas with the highest pro density.",
    M4: "Fast-growing value markets of new single-family homes.",
  },
  "2": {
    "1": "Fast sellers with lean supply — protect in-stocks.",
    "2": "Healthy turns with room to trade the mix up.",
    "3": "Sluggish sell-through and bloated supply — trim breadth.",
    "4": "Severe overbuy with near-zero GMROI — freeze receipts.",
  },
  "4": {
    P1: "Premium smooth finishes skewing Best-tier and higher ASP.",
    P2: "Rustic wirebrushed oak — strongest local affinity, lowest risk.",
    P3: "Value dark tones carrying elevated style-mismatch risk.",
  },
};

export const CLUSTER_EXPLORER_CONFIG = {
  "1A": {
    tierLabel: "Store Structure",
    countLabel: "Structure Families",
    clusters: TIER1A_FAMILIES.map((f) => ({ id: f.id, label: f.label, color: LABEL_COLORS.structure[f.id], insight: f.businessRead, blurb: CLX_CLUSTER_BLURBS["1A"][f.id] })),
    storeMetric: { key: "location_sqft", label: "SqFt", format: "k" },
  },
  "1B": {
    tierLabel: "Market Context",
    countLabel: "Market Families",
    clusters: TIER1B_FAMILIES.map((f) => ({ id: f.id, label: f.merchantName, color: LABEL_COLORS.market[f.id], insight: f.businessRead, blurb: CLX_CLUSTER_BLURBS["1B"][f.id] })),
    storeMetric: { key: "ACS_median_inc", label: "Income", format: "usd" },
  },
  "2": {
    tierLabel: "Commercial Performance",
    countLabel: "Commercial Clusters",
    clusters: TIER2_COMMERCIAL_CLUSTERS.map((c) => ({
      id: c.id, label: c.label, color: LABEL_COLORS.commercial[c.id],
      blurb: CLX_CLUSTER_BLURBS["2"][c.id],
      insight: {
        "1": "Top-decile sell-through with lean days of supply — protect in-stocks and expand hero depth.",
        "2": "Healthy turns with room to trade the mix up; monitor for seasonal swings.",
        "3": "Elevated days of supply and soft sell-through — trim breadth and rebalance receipts.",
        "4": "Severe overbuy (1,500+ DOS, ~0 GMROI). Freeze open orders and clear standing inventory.",
      }[c.id] || "",
    })),
    storeMetric: { key: "category_dos", label: "DOS", format: "days" },
  },
  "4": {
    tierLabel: "Product Profile",
    countLabel: "Style Profiles",
    clusters: TIER4_PROFILES.map((p) => ({
      id: p.id, label: p.label, color: LABEL_COLORS.style[p.id],
      blurb: CLX_CLUSTER_BLURBS["4"][p.id],
      insight: {
        P1: "Premium smooth finishes skew Best-tier; support higher ASP and a curated, shallow depth.",
        P2: "Rustic wirebrushed oak dominates with the strongest local affinity and lowest mismatch risk.",
        P3: "Value dark tones carry high style-mismatch risk; prune breadth and localize carefully.",
      }[p.id] || "",
    })),
    storeMetric: { key: "goodBetterBest", label: "Price Tier", format: "text" },
  },
};
