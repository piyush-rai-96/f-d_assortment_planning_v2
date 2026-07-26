/**
 * NewStorePlanning.jsx — "Wow" Edition
 *
 * Flow:
 *  Step 1 → Market Intelligence (catchment · climate · competitors · USA map)
 *  Step 2 → Constraint Configurator (SKU · margin · price architecture)
 *  Step 3 → SKU Plan  (placeholder)
 *  Step 4 → Review & Lock  (placeholder)
 */
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { geoAlbers, geoCircle, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import usStatesTopology from "us-atlas/states-10m.json";
import {
  ChevronDown, Zap, Globe, Wind, Store, Check,
  MapPin, Building2, Cpu, Activity, TrendingUp,
  ArrowRight, ArrowLeft, RotateCcw, Save, Lock, AlertTriangle, CheckCircle, ChevronRight,
  Users, Map as MapIcon, Maximize2, X, FileText, Layers, Calendar, Target,
  Plus, Minus, ArrowUp, ArrowDown, Sparkles, Undo2, Redo2, Download, Search, Flame,
  Grid3x3, CheckCheck, ShieldCheck, ClipboardList, FilePlus2, Home, LayoutDashboard,
  ChevronUp, ChevronLeft, Clock, Trash2, FileDown,
  SlidersHorizontal, Filter, DollarSign, Ruler, Package, GitCompare,
} from "lucide-react";
import { Badge, Button, Card, Chart, EmptyState, Loader, ProgressBar, Tag, Tooltip, Modal, TextArea, Table } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import { panelSx } from "../styles/panelSx.js";
import { LOCATIONS, NEW_STORE_INPUTS } from "../data/admin.js";
import { FD_STORES } from "../data/stores.js";
import { getStoreCoordinates, STORE_COORDINATES } from "../data/storeCoordinates.js";
import { CLUSTERS_BY_RUN, STUDIO_RUN_HISTORY } from "../data/agenticClustering.js";
import { SOLID_PREFINISHED_CANDIDATES, INSTALL_ATTACH_CONFIG } from "../data/newStoreSKUs.js";
import skuThumbOak from "../assets/sku-thumbs/oak.png";
import skuThumbHickory from "../assets/sku-thumbs/hickory.png";
import skuThumbMaple from "../assets/sku-thumbs/maple.png";
import skuThumbWalnut from "../assets/sku-thumbs/walnut.png";
import "./NewStorePlanningNew.css";

// Species → product thumbnail. Keyed off the SKU's `species` field so any
// future catalog additions automatically pick up a matching swatch image.
const SKU_THUMB_BY_SPECIES = {
  Oak: skuThumbOak,
  Hickory: skuThumbHickory,
  Maple: skuThumbMaple,
  Walnut: skuThumbWalnut,
};

function formatSkuDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// End dates use a far-future sentinel (e.g. 2099-12-31) to mean "open-ended /
// no planned discontinuation". Render those as blank so the column reads
// realistically and Time on Offer is only computed for options with a real end.
function isOpenEndedDate(iso) {
  if (!iso) return true;
  const year = new Date(`${iso}T00:00:00`).getFullYear();
  return Number.isNaN(year) || year >= 2099;
}
function formatEndDate(iso) {
  return isOpenEndedDate(iso) ? "" : formatSkuDate(iso);
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const MARKET_INTEL = {
  381: {
    catchment: {
      radius: 30, zctas: 12,
      households: 52408, population: 118260,
      medianIncome: 58142, medianHomeValue: 287500,
      homeownershipRate: 68.5, olderHomes: 41.2,
      proContractorDensity: "1.4×", permitGrowth: "+8.3%",
      annualRemodelingSpend: "$2.1B",
    },
    climate: {
      zone: "Cold Continental — USDA Zone 4b",
      station: "BIL — Billings Logan Intl",
      avgWinterLow: "14 °F / −10 °C",
      avgSummerHigh: "88 °F / 31 °C",
      annualPrecip: "14.0 in",
      snowDays: "~56 days / yr",
      floodRisk: "Low · FEMA NRI 22/100",
      floorNote: "High LVP & Tile demand · frost-heave resilient products preferred",
    },
    competitors: [
      { name: "Home Depot",   dist: "2.1 mi",  distMi: 2.1,  threat: "High",   threatPct: 88, category: "Home Improvement",  sqft: "105k sqft", note: "Full flooring aisle, contractor focus"   },
      { name: "Lowe's",       dist: "3.4 mi",  distMi: 3.4,  threat: "High",   threatPct: 74, category: "Home Improvement",  sqft: "112k sqft", note: "Strong LVP & tile selection"            },
      { name: "True Value",   dist: "18 mi",   distMi: 18,   threat: "Medium", threatPct: 28, category: "Hardware",          sqft: "22k sqft",  note: "Limited flooring, low overlap"          },
      { name: "Ace Hardware", dist: "24 mi",   distMi: 24,   threat: "Low",    threatPct: 12, category: "Hardware",          sqft: "18k sqft",  note: "Minimal flooring category"              },
    ],
    trade: {
      primary: "35 mi", secondary: "85 mi",
      nearestFD: "Denver, CO — 370 mi",
      territory: "Greenfield · No F&D within 300 mi",
    },
  },
};

const INTEL_LOGS = [
  { t: 300,  text: "Initializing Market Intelligence Agent v2.1…",           type: "info"    },
  { t: 700,  text: "Loading store record — Billings, MT (#381)…",            type: "info"    },
  { t: 1150, text: "Fetching 30-mile ZCTA boundary from Census TIGER/Line…", type: "info"    },
  { t: 1600, text: "✓  12 ZIP Code Tabulation Areas within catchment",       type: "success" },
  { t: 2000, text: "Connecting → Census ACS 5-Year (2019–2023)…",            type: "info"    },
  { t: 2500, text: "✓  52,408 households · $58,142 median income loaded",    type: "success" },
  { t: 2950, text: "Zillow ZHVI — Billings MSA home values…",                type: "info"    },
  { t: 3400, text: "✓  Median home value: $287,500 · +4.1% YoY",             type: "success" },
  { t: 3800, text: "IRS Statistics of Income — Yellowstone County…",        type: "info"    },
  { t: 4200, text: "✓  Homeownership 68.5% · Older homes (pre-1990) 41.2%", type: "success" },
  { t: 4600, text: "Reading NOAA Climate Normals — BIL Station (1991–2020)…",type: "info"    },
  { t: 5000, text: "✓  Cold Continental Zone 4b · 14 °F avg winter low",    type: "success" },
  { t: 5400, text: "Scanning competitor density — 50-mile trade area…",     type: "info"    },
  { t: 5900, text: "⚠  2 tier-1 competitors: Home Depot 2.1mi · Lowe's 3.4mi", type: "warn" },
  { t: 6350, text: "✓  No specialty flooring competitors within 100 miles", type: "success" },
  { t: 6800, text: "Computing nearest F&D stores — network proximity…",     type: "info"    },
  { t: 7250, text: "✓  Greenfield territory — nearest F&D: Denver 370 mi",  type: "success" },
  { t: 7650, text: "Plotting 21 active stores + 1 new store on map…",       type: "info"    },
  { t: 8200, text: "✅  Market Intelligence complete — profile ready.",      type: "done"    },
];

// Sources hydrated during the "intel" load — used to render the premium
// backend-hydration checklist that streams alongside the progress bar.
const INTEL_SOURCES = [
  { key: "catchment", label: "Market catchment · 30-mi radius", detail: "12 ZCTAs · Census TIGER/Line" },
  { key: "demo",      label: "Demographics & households",       detail: "ACS 5-Year · IRS SOI"          },
  { key: "climate",   label: "Climate & seasonality",           detail: "NOAA Normals 1991–2020"        },
  { key: "demand",    label: "Demand potential model",          detail: "Remodel spend · permit growth" },
  { key: "comp",      label: "Competitor insights",             detail: "50-mi trade-area scan"         },
  { key: "network",   label: "Trade area & network map",        detail: "F&D proximity · store plot"    },
];

// Stage 1 of the same hydration sequence — the store record & F&D-provided specs.
const STORE_SOURCES = [
  { key: "record", label: "Store master record",         detail: "Store #, name, geo"        },
  { key: "fd",     label: "F&D-provided specifications",  detail: "Format · size · opening"   },
  { key: "attrs",  label: "Location & site attributes",   detail: "Region · market · status"  },
  { key: "coords", label: "Geo coordinates",              detail: "Lat / Lon · catchment anchor" },
];

// ─── USA SVG Map ──────────────────────────────────────────────────────────────

// ─── Step 2 data ──────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  { num: 1, label: "Market Intelligence", sub: "Catchment · Climate · Map"     },
  { num: 2, label: "Set Constraints",     sub: "SKU · Margin · Price Mix"      },
  { num: 3, label: "Cluster Assignment",  sub: "Peer Pool · Tier Selection"    },
  { num: 4, label: "SKU Optimization",    sub: "Score · Mix · Enforce · Depth" },
  { num: 5, label: "Review & Lock",       sub: "Approve · Override · Export"   },
  { num: 6, label: "Feedback Loop",       sub: "Post-Opening · Graduate"       },
];

// Full merchandise hierarchy: Department → Subdepartment → Class
const HIERARCHY = [
  {
    label: "Hardwood Flooring",
    subs: [
      { label: "Solid Prefinished",   classes: ["All Classes", "Solid Oak Prefinished", "Solid Hickory Prefinished", "Solid Maple Prefinished", "Solid Walnut Prefinished"] },
      { label: "Engineered Hardwood", classes: ["All Classes", "Engineered Oak", "Engineered Hickory", "Engineered Birch"] },
      { label: "Laminate Wood",       classes: ["All Classes", "AC3 Laminate", "AC4 Laminate", "AC5 Commercial"] },
      { label: "Parquet",             classes: ["All Classes", "Herringbone", "Chevron", "Square Pattern"] },
    ],
  },
  {
    label: "Tile",
    subs: [
      { label: "Ceramic Tile",         classes: ["All Classes", "Wall Tile", "Floor Tile", "Backsplash"] },
      { label: "Porcelain Tile",        classes: ["All Classes", "Large Format", "Wood-Look Porcelain", "Matte Finish"] },
      { label: "Natural Stone",         classes: ["All Classes", "Travertine", "Marble", "Slate"] },
      { label: "Mosaic & Decorative",   classes: ["All Classes", "Glass Mosaic", "Stone Mosaic", "Metal Accent"] },
    ],
  },
  {
    label: "LVP / Vinyl",
    subs: [
      { label: "Luxury Vinyl Plank",  classes: ["All Classes", "6mm LVP", "8mm LVP", "12mm LVP", "Rigid Core"] },
      { label: "Luxury Vinyl Tile",   classes: ["All Classes", "Stone-Look LVT", "Wood-Look LVT"] },
      { label: "Sheet Vinyl",         classes: ["All Classes", "Felt-Back", "Fiberglass-Back"] },
      { label: "WPC Core",            classes: ["All Classes", "WPC Standard", "SPC Rigid"] },
    ],
  },
  {
    label: "Vanities",
    subs: [
      { label: "Freestanding Vanities",    classes: ["All Classes", '24"', '30"', '36"', '48"', '60"'] },
      { label: "Wall-Mount Vanities",      classes: ["All Classes", 'Floating 24"', 'Floating 36"', 'Floating 48"'] },
      { label: "Mirrors & Accessories",    classes: ["All Classes", "Framed Mirrors", "Frameless Mirrors", "Medicine Cabinets"] },
      { label: "Vanity Tops",              classes: ["All Classes", "Cultured Marble", "Quartz Top", "Granite Top"] },
    ],
  },
  {
    label: "Installation Accessories",
    subs: [
      { label: "Underlayment",       classes: ["All Classes", "Foam Underlayment", "Cork Underlayment", "Vapor Barrier"] },
      { label: "Adhesives & Grout",  classes: ["All Classes", "Thinset Mortar", "Epoxy Grout", "Polymer Grout"] },
      { label: "Trim & Molding",     classes: ["All Classes", "T-Molding", "Reducer", "Quarter Round", "Threshold"] },
      { label: "Hand Tools",         classes: ["All Classes", "Installation Kit", "Tile Tools", "Flooring Tools"] },
    ],
  },
];

const DEFAULT_CONSTRAINTS = {
  scope:       "category",
  category:    "Hardwood Flooring",
  subCategory: "Solid Prefinished",
  maxSkuCount: 25, minFacings: 2, maxLinearFeet: 120,
  targetMargin: 60.0, maxAUC: 35.00, maxLeadTime: 45, otbBudget: 120000,
  goodPct: 30, betterPct: 50, bestPct: 20,
};

const ACTUALS_381 = {
  currentSkuCount: 18, currentMargin: 56.2, currentOTBSpend: 98400,
  currentGoodPct: 25, currentBetterPct: 55, currentBestPct: 20,
};

function computeHealth(c, actuals) {
  const skuPct  = Math.round(actuals.currentSkuCount / Math.max(c.maxSkuCount, 1) * 100);
  const mGap    = +(actuals.currentMargin - c.targetMargin).toFixed(1);
  const otbPct  = Math.round(actuals.currentOTBSpend / Math.max(c.otbBudget, 1) * 100);
  const goodGap = actuals.currentGoodPct - c.goodPct;
  return {
    sku:    { pct: skuPct,  grade: skuPct <= 100   ? "pass" : "fail", label: `${actuals.currentSkuCount} / ${c.maxSkuCount} SKUs`  },
    margin: { gap: mGap,    grade: mGap >= 0        ? "pass" : "fail", label: `${actuals.currentMargin}% actual vs ${c.targetMargin}% target` },
    otb:    { pct: otbPct,  grade: otbPct <= 100    ? "pass" : "fail", label: `$${(actuals.currentOTBSpend/1000).toFixed(0)}k of $${(c.otbBudget/1000).toFixed(0)}k` },
    tier:   { gap: goodGap, grade: goodGap >= 0     ? "pass" : "warn", label: `Good ${actuals.currentGoodPct}% · Better ${actuals.currentBetterPct}% · Best ${actuals.currentBestPct}%` },
    tierSum: c.goodPct + c.betterPct + c.bestPct,
  };
}

// ─── Step 3 data ──────────────────────────────────────────────────────────────

const GATE_LOGS = [
  { t: 350,  ok: true,  text: "Evaluating Regional Exclusions & Vendor MOQs (from Step 2)…"        },
  { t: 850,  ok: true,  text: "Building Synthetic Store Record: Billings, MT (55K sq ft, Warehouse)…" },
  { t: 1300, ok: true,  text: "Category Signal Evaluation: 127 Commercial vs 132 Structure-Only…"   },
  { t: 1800, warn: true, text: "GATE ALERT: Catalog Bridge Coverage 50.7% — below 80% production gate." },
  { t: 2200, warn: true, text: "→ Tier 3 Product-Profile Clustering auto-gated."                    },
  { t: 2600, warn: true, text: "→ Fallback: Demand proxying shifted to 4-Lens Weighted Peer Pool."  },
];

// Runs relevant to Wood > Solid Prefinished — sourced from the Agentic Clustering Studio
const WOOD_RUNS = STUDIO_RUN_HISTORY.filter(r => r.scopeTag === "Wood");
// Live run is the canonical source for cluster assignment
const LIVE_WOOD_RUN = WOOD_RUNS.find(r => r.status === "live") || WOOD_RUNS[0];

// Derive cluster options from the live run.
// Family B already contains Billings MT as a proxy → recommended.
function deriveClusterFamilies(runId) {
  const clusters = CLUSTERS_BY_RUN[runId] || [];
  // Fit score: if the cluster already has Billings as proxy → 94%, else scale by cohesion
  return clusters.map(c => {
    const hasBillings = (c.proxies || []).some(p => p.id === 381);
    const fitPct = hasBillings ? 94 : Math.round(c.cohesion * 65);
    return {
      id:          c.id,
      name:        c.label,
      stores:      c.stores,
      cohesion:    c.cohesion,
      fit:         fitPct,
      recommended: hasBillings,
      runId,
    };
  });
}

const MARKET_CONTEXTS = [
  { id: "M1", label: "Suburban Growth",   desc: "High HH income, new construction"        },
  { id: "M2", label: "Urban Dense",       desc: "High density, condo/reno focus"           },
  { id: "M3", label: "Contractor-Rich",   desc: "High contractor density, older homes", recommended: true },
  { id: "M4", label: "Value Mass Market", desc: "Price-sensitive, large families"          },
];

const BASE_PEERS = [
  { id: "#204", loc: "Bozeman, MT",     sq: "42k", baseSim: 91.4, fit: "Market / Climate",   status: "verified" },
  { id: "#188", loc: "Spokane, WA",     sq: "58k", baseSim: 88.2, fit: "Structure / Format", status: "verified" },
  { id: "#312", loc: "Boise, ID",       sq: "51k", baseSim: 85.7, fit: "Commercial / Wood",  status: "inferred" },
  { id: "#091", loc: "Missoula, MT",    sq: "38k", baseSim: 82.1, fit: "Market / Climate",   status: "verified" },
  { id: "#277", loc: "Great Falls, MT", sq: "45k", baseSim: 79.4, fit: "Structure / Format", status: "inferred" },
];

// ─── Reconfigure: Location & Peer Cluster Studio ──────────────────────────────

// Peer pool shown in the reconfigure match-matrix (richer than BASE_PEERS to
// mirror the spec: anchor peers, comp peers, and an excluded high-shrink store).
const RECONFIG_PEERS = [
  { id: "#159", loc: "Draper, UT",       score: 95.1, role: "Anchor Peer",     reason: "Format + Wood velocity match", included: true,  format: "Warehouse", sqft: 62, market: "Suburban Growth" },
  { id: "#144", loc: "Reno, NV",         score: 90.8, role: "Dry-West Comp",   reason: "Semi-arid climate analog",     included: true,  format: "Warehouse", sqft: 54, market: "Value Mass Market" },
  { id: "#204", loc: "Bozeman, MT",      score: 91.4, role: "Climate Twin",    reason: "Heating-season + trade area",  included: true,  format: "Warehouse", sqft: 42, market: "Contractor-Rich" },
  { id: "#188", loc: "Spokane, WA",      score: 88.2, role: "Structure Match", reason: "Footprint + logistics",        included: true,  format: "Warehouse", sqft: 58, market: "Suburban Growth" },
  { id: "#312", loc: "Boise, ID",        score: 85.7, role: "Commercial",      reason: "Solid Prefinished movement",   included: true,  format: "Warehouse", sqft: 51, market: "Contractor-Rich" },
  { id: "#200", loc: "Albuquerque, NM",  score: 76.2, role: "Excluded",        reason: "High shrink · returns outlier", included: false, format: "Warehouse", sqft: 49, market: "Value Mass Market" },
];

// Regional cluster baselines available to swap into (West is the AI default)
const REGION_OPTIONS = [
  { value: "west",     label: "West / Mountain (AI Default)", desc: "Pacific West + Mountain heating-season cohort", stores: 18 },
  { value: "texas",    label: "Texas Region",                 desc: "TX + Gulf trade areas, warm-climate mix",      stores: 22 },
  { value: "midwest",  label: "Midwest Continental",          desc: "Upper-Midwest cold-continental cohort",        stores: 16 },
  { value: "pacnw",    label: "Pacific Northwest",            desc: "WA/OR/ID coastal + interior",                  stores: 14 },
];

// Candidate stores for the "Add Custom Peer" modal (attribute-filterable)
const CUSTOM_PEER_CANDIDATES = [
  { id: "#159", loc: "Draper, UT",       format: "Warehouse", sqft: 62, market: "Suburban Growth",   proDensity: "High"   },
  { id: "#221", loc: "Ogden, UT",        format: "Warehouse", sqft: 47, market: "Contractor-Rich",   proDensity: "High"   },
  { id: "#305", loc: "Fort Collins, CO", format: "Warehouse", sqft: 55, market: "Suburban Growth",   proDensity: "Medium" },
  { id: "#418", loc: "Casper, WY",       format: "Small-Fmt", sqft: 34, market: "Value Mass Market", proDensity: "Medium" },
  { id: "#512", loc: "Amarillo, TX",     format: "Warehouse", sqft: 58, market: "Value Mass Market", proDensity: "Low"    },
  { id: "#347", loc: "Cheyenne, WY",     format: "Small-Fmt", sqft: 36, market: "Contractor-Rich",   proDensity: "Medium" },
];

const DEFAULT_CLUSTER_CFG = {
  weights: { structure: 38, market: 42, category: 20 },   // AI baseline (sums to 100)
  region:  "west",
  peers:   RECONFIG_PEERS.map(p => ({ ...p })),
};

// ─── Step 2 calibration logs ──────────────────────────────────────────────────

const STEP2_CALIB = [
  { t: 250,  text: "Loading cluster profile — Billings, MT (#381)…"          },
  { t: 650,  text: "Analyzing Rockies comparables (Denver CO, Salt Lake UT)…" },
  { t: 1050, text: "Calibrating SKU capacity for 55,000 sq ft format…"        },
  { t: 1450, text: "Computing margin baseline — Cold Continental cluster…"     },
  { t: 1900, text: "✓  Defaults calibrated — pre-filling constraint form."    },
];

// ─── Authoritative USA map ───────────────────────────────────────────────────
// Geography: US Census-derived state boundaries packaged by `us-atlas`.
// Projection: Albers equal-area projection fitted to the contiguous 48 states.
// Store locations: src/data/storeCoordinates.js (replaceable without UI edits).
const US_MAP_WIDTH = 960;
const US_MAP_HEIGHT = 600;
// Contiguous 48 + DC only. Overseas territories (AK/HI/PR/GU/AS/MP/VI) must stay
// out of the fit — otherwise geoAlbers zooms way out and the lower 48 looks tiny.
const CONTIGUOUS_STATE_NAMES = new Set([
  "Alabama", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "District of Columbia", "Florida", "Georgia", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana",
  "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah",
  "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
]);
const US_STATE_ABBR = {
  Alabama: "AL", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL",
  Georgia: "GA", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY",
};
const SMALL_STATE_LABELS = new Set(["CT", "DC", "DE", "MD", "MA", "NH", "NJ", "RI", "VT"]);

const ALL_US_STATE_FEATURES = feature(
  usStatesTopology,
  usStatesTopology.objects.states,
).features;
const CONTIGUOUS_STATE_FEATURES = ALL_US_STATE_FEATURES.filter(
  (state) => CONTIGUOUS_STATE_NAMES.has(state.properties?.name),
);
const CONTIGUOUS_STATES = {
  type: "FeatureCollection",
  features: CONTIGUOUS_STATE_FEATURES,
};
const US_PROJECTION = geoAlbers().fitExtent(
  [[18, 18], [US_MAP_WIDTH - 18, US_MAP_HEIGHT - 18]],
  CONTIGUOUS_STATES,
);
const US_PATH = geoPath(US_PROJECTION);

function USAStoreMap({ newStore, allStores, hideHeader = false }) {
  const storeMetaById = useMemo(
    () => new Map(allStores.map((store) => [String(store.id), store])),
    [allStores],
  );

  const dots = useMemo(
    () => STORE_COORDINATES
      .filter((coordinate) => coordinate.status === "existing")
      .map((coordinate) => {
        const position = US_PROJECTION([coordinate.longitude, coordinate.latitude]);
        if (!position) return null;
        const metadata = storeMetaById.get(String(coordinate.storeId));
  return {
          ...coordinate,
          metadata,
          x: position[0],
          y: position[1],
          label: metadata?.market || coordinate.storeName,
        };
      })
      .filter(Boolean),
    [storeMetaById],
  );

  const newCoordinate = getStoreCoordinates(newStore?.id);
  const newProjected = newCoordinate
    ? US_PROJECTION([newCoordinate.longitude, newCoordinate.latitude])
    : null;
  const newPos = newProjected ? { x: newProjected[0], y: newProjected[1] } : null;
  const catchmentPath = newCoordinate
    ? US_PATH(geoCircle()
      .center([newCoordinate.longitude, newCoordinate.latitude])
      .radius(30 / 69)
      .precision(2)())
    : null;
  const verifiedCount = STORE_COORDINATES.filter(
    (coordinate) => coordinate.status === "existing" && coordinate.accuracy === "verified",
  ).length;

  return (
    <div className="nsp-map-outer nsp-real-map" style={{ borderRadius: hideHeader ? 0 : undefined }}>
      {!hideHeader && (
      <div className="nsp-map-topbar">
          <span className="nsp-map-title-row"><MapPin size={13} /> F&amp;D Network — Continental USA</span>
        <div className="nsp-map-legend">
            <span className="nsp-legend-dot blue" /><span>{dots.length} Active stores</span>
            <span className="nsp-legend-dot amber" /><span>{newStore?.market}, {newStore?.state} · New · SS26</span>
        </div>
      </div>
      )}

      <div className="nsp-map-body nsp-real-map-body">
        <svg
          viewBox={`0 0 ${US_MAP_WIDTH} ${US_MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="nsp-usa-svg-v2 nsp-usa-svg-real"
          role="img"
          aria-label={`Map of ${dots.length} active stores and new store ${newStore?.market}, ${newStore?.state}`}
        >
          <title>F&amp;D Store Network — Continental United States</title>
          <defs>
            <linearGradient id="realMapWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eef7fb" />
              <stop offset="100%" stopColor="#deedf5" />
            </linearGradient>
            <linearGradient id="realStateFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3f6ef" />
              <stop offset="100%" stopColor="#e2eadb" />
            </linearGradient>
            <filter id="realStoreGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="realNewStoreGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="realLabelShadow" x="-20%" y="-50%" width="140%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#334155" floodOpacity=".16" />
            </filter>
          </defs>

          <rect width={US_MAP_WIDTH} height={US_MAP_HEIGHT} fill="url(#realMapWater)" />

          <g className="nsp-real-state-layer">
            {CONTIGUOUS_STATE_FEATURES.map((state) => (
              <path
                key={state.id}
                d={US_PATH(state)}
                className="nsp-real-state"
              >
                <title>{state.properties?.name}</title>
              </path>
            ))}
          </g>

          <g className="nsp-real-state-labels" aria-hidden="true">
            {CONTIGUOUS_STATE_FEATURES.map((state) => {
              const abbreviation = US_STATE_ABBR[state.properties?.name];
              if (!abbreviation || SMALL_STATE_LABELS.has(abbreviation)) return null;
              const [x, y] = US_PATH.centroid(state);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
              return (
                <text key={`state-label-${state.id}`} x={x} y={y + 3} textAnchor="middle">
                  {abbreviation}
                </text>
              );
            })}
          </g>

          <g className="nsp-real-store-layer">
            {dots.map((store) => (
              <g
                key={store.storeId}
                className="nsp-real-store-marker"
                transform={`translate(${store.x} ${store.y})`}
                tabIndex="0"
                role="button"
                aria-label={`Store ${store.storeId}, ${store.label}, ${store.state}`}
              >
                <title>#{store.storeId} {store.label}, {store.state}</title>
                <circle className="nsp-real-store-halo" r="8" />
                <circle className="nsp-real-store-core" r="3.7" filter="url(#realStoreGlow)" />
                <g className="nsp-real-store-hover-label" aria-hidden="true">
                  <rect x="8" y="-28" width="116" height="23" rx="6" />
                  <text x="16" y="-13">#{store.storeId} {store.label}</text>
                </g>
            </g>
          ))}
          </g>

          {newPos && (
            <g className="nsp-real-new-store">
              {catchmentPath && <path d={catchmentPath} className="nsp-real-catchment" />}
              <circle cx={newPos.x} cy={newPos.y} r="20" className="nsp-real-new-halo" />
              <circle
                cx={newPos.x}
                cy={newPos.y}
                r="9"
                className="nsp-real-new-core nsp-new-dot-pulse"
                filter="url(#realNewStoreGlow)"
              />
              <g
                className="nsp-real-new-label"
                transform={`translate(${newPos.x - 66} ${newPos.y - 48})`}
                filter="url(#realLabelShadow)"
              >
                <rect width="132" height="30" rx="7" />
                <text x="66" y="13" textAnchor="middle">{newStore.market}, {newStore.state}</text>
                <text className="nsp-real-new-sublabel" x="66" y="23" textAnchor="middle">
                  NEW STORE · SS26 · 30-MI CATCHMENT
              </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {!hideHeader && (
      <div className="nsp-map-footer-bar">
          <span className="nsp-map-footer-stat">
            <span className="nsp-legend-dot blue" />{dots.length} active stores
          </span>
          <span className="nsp-map-footer-stat">
            <span className="nsp-legend-dot amber" />{newStore?.market}, {newStore?.state} — New (SS26)
          </span>
          <span className="nsp-map-footer-coords">
            Coordinate registry · {verifiedCount} verified · {dots.length + 1 - verifiedCount} awaiting verification
          </span>
      </div>
      )}
    </div>
  );
}

// ─── Animated count-up ────────────────────────────────────────────────────────

function CountUp({ end, duration = 1200, prefix = "", suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const endNum = parseFloat(String(end).replace(/[^0-9.]/g, "")) || 0;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * endNum));
      if (progress < 1) requestAnimationFrame(tick);
      else setVal(endNum);
    }
    requestAnimationFrame(tick);
  }, [end, duration]);

  const formatted = Number.isInteger(val)
    ? val.toLocaleString()
    : val.toFixed(1);
  return <>{prefix}{formatted}{suffix}</>;
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, accent = "#4f46e5", delay = 0, animate = false,
                   prefix = "", suffix = "", trend, trendUp = true, barPct }) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return (
    <div className="nsp-kpi-tile nsp-fade-up" style={{ animationDelay: `${delay}s` }}>
      {/* Accent top bar */}
      <div className="nsp-kti-top-bar" style={{ background: accent }} />

      {/* Label row + trend badge */}
      <div className="nsp-kti-head">
        <span className="nsp-kti-label">{label}</span>
        {trend && (
          <Badge
            label={trend}
            color={trendUp ? "success" : "warning"}
            variant="subtle"
            size="small"
          />
        )}
      </div>

      {/* Main value — always near-black, no per-tile rainbow */}
      <div className="nsp-kti-value">
        {animate && !isNaN(num)
          ? <CountUp end={num} prefix={prefix} suffix={suffix} />
          : value}
      </div>

      {/* Source / sub */}
      {sub && <div className="nsp-kti-sub">{sub}</div>}

      {/* Mini fill bar — shows value vs benchmark */}
      {barPct !== undefined && (
        <div className="nsp-kti-bar-wrap">
          <div className="nsp-kti-bar-fill" style={{ width: `${Math.min(barPct, 100)}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

// ─── Premium dropdown ─────────────────────────────────────────────────────────

function PremiumDropdown({ stores, selectedId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = stores.find(s => String(s.id) === String(selectedId));

  useEffect(() => {
    function out(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  return (
    <div className="nsp-dd" ref={ref}>
      <button
        className={`nsp-dd-trigger${open ? " nsp-dd-open" : ""}`}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className="nsp-dd-trigger-inner">
          {selected ? (
            <>
              <span className="nsp-dd-id-chip">#{selected.id}</span>
              <span className="nsp-dd-label">{selected.name.replace(/^\d+\s/, "")}, {selected.market}</span>
              <span className="nsp-dd-state">({selected.state})</span>
            </>
          ) : (
            <span className="nsp-dd-placeholder">Select a new store…</span>
          )}
        </span>
        <ChevronDown size={15} className={`nsp-dd-chevron${open ? " up" : ""}`} />
      </button>

      {open && (
        <div className="nsp-dd-menu">
          {stores.length === 0
            ? <div className="nsp-dd-empty">No new stores onboarded yet</div>
            : stores.map(s => {
                const active = String(s.id) === String(selectedId);
                return (
                  <button
                    key={s.id}
                    className={`nsp-dd-option${active ? " active" : ""}`}
                    onClick={() => { onChange(String(s.id)); setOpen(false); }}
                    type="button"
                  >
                    <span className="nsp-dd-id-chip">#{s.id}</span>
                    <span className="nsp-dd-opt-name">{s.name.replace(/^\d+\s/, "")}, {s.market}</span>
                    <span className="nsp-dd-opt-state">({s.state})</span>
                    {active && <Check size={13} className="nsp-dd-check" />}
                  </button>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div className="nsp-stepper">
      {FLOW_STEPS.map((s, i) => {
        const state = s.num < current ? "done" : s.num === current ? "active" : "pending";
        return (
          <React.Fragment key={s.num}>
            <div className={`nsp-step nsp-step-${state}`}>
              <div className="nsp-step-circle">
                {state === "done" ? <Check size={12} /> : s.num}
              </div>
              <div className="nsp-step-text">
                <div className="nsp-step-label">{s.label}</div>
                <div className="nsp-step-sub">{s.sub}</div>
              </div>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className={`nsp-step-connector ${state === "done" ? "done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 2 Screen ────────────────────────────────────────────────────────────

function ConstraintField({ label, unit, value, onChange, type = "number", step = 1, aiSuggested = false }) {
  return (
    <div className="nsp-cf">
      <div className="nsp-cf-label">
        {label}
        {aiSuggested && <span className="nsp-ai-chip">AI</span>}
      </div>
      <div className="nsp-cf-input-row">
        <input
          className="nsp-cf-input"
          type={type}
          step={step}
          value={value}
          onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        />
        {unit && <span className="nsp-cf-unit">{unit}</span>}
      </div>
    </div>
  );
}

function HealthRow({ label, grade, pct, gap, barLabel }) {
  const gradeColors = { pass: "#059669", fail: "#dc2626", warn: "#d97706" };
  const gradeLabels = { pass: "PASS", fail: "FAIL", warn: "WARN" };
  const fillPct = pct != null ? Math.min(pct, 100) : (gap != null ? Math.min(Math.abs(gap) * 5, 100) : 50);
  return (
    <div className="nsp-health-row">
      <div className="nsp-health-row-top">
        <span className="nsp-health-label">{label}</span>
        <span className="nsp-health-badge" style={{ background: gradeColors[grade] + "22", color: gradeColors[grade] }}>
          {gradeLabels[grade]}
          {gap != null && grade === "fail" && <span> ({gap > 0 ? "+" : ""}{gap.toFixed(1)}%)</span>}
        </span>
      </div>
      <div className="nsp-health-bar-track">
        <div
          className="nsp-health-bar-fill"
          style={{ width: `${fillPct}%`, background: gradeColors[grade] }}
        />
      </div>
      {barLabel && <div className="nsp-health-bar-label">{barLabel}</div>}
    </div>
  );
}


// ─── Step 4: SKU Optimization Engine ─────────────────────────────────────────

const CONSTRAINTS_381 = {
  maxSKUs: 25,
  marginFloor: 0.60,
  otbBudget: 120000,
  good: 30, better: 50, best: 20,
  // Physical store fixture capacity for the Billings, MT layout (55k sq ft).
  // One assorted option occupies one merchandising bay; each bay carries a
  // fixed display footprint used for the Space vs. Capital reconciliation.
  bays: 25,
  sqftPerBay: 220,
  linearFtPerBay: 12,
};
const ACTUALS_OTB = 98400;          // from Step 2 ACTUALS_381

const PIPELINE_STEPS = [
  { id: "score",    label: "SKU Scoring"         },
  { id: "mix",      label: "Cross-Category Mix"  },
  { id: "guard",    label: "Guardrail Enforce"   },
  { id: "depth",    label: "Depth & Breadth"     },
];

function computeSKUScore(sku) {
  // Weights mirror Step 3 defaults: structure 35%, market 30%, category 20%, climate 15%
  const velScore    = Math.min(sku.peerVelocity / 140, 1) * 40;
  const margScore   = Math.max(0, sku.margin - 0.45) / 0.20 * 30;
  const climScore   = sku.climateFit * 15;
  const lifecycleB  = sku.lifecycle === "Core" ? 10 : sku.lifecycle === "NPI" ? 5 : sku.lifecycle === "Seasonal" ? 2 : -15;
  const returnPen   = sku.returnRate * 200;
  return Math.round(Math.max(0, Math.min(100, velScore + margScore + climScore + lifecycleB - returnPen)));
}

function computeAgentRec(sku, score) {
  if (sku.lifecycle === "Clearance") return "drop";
  if (score >= 70) return "add";
  if (score >= 40) return "add";   // conditional but still add for new store
  return "drop";
}

function computeReasonCodes(sku, score) {
  const codes = [];
  if (sku.peerVelocity >= 100) codes.push("Peer Velocity Leader");
  if (sku.climateFit >= 0.88)  codes.push("Climate Match");
  if (sku.margin >= 0.58)      codes.push("High Margin Anchor");
  if (sku.lifecycle === "Core") codes.push("Core Carry");
  if (sku.conflictFlag)         codes.push("Conflict Risk");
  if (sku.lifecycle === "Clearance") codes.push("End-of-Life");
  return codes.slice(0, 3);
}

function computeConfidence(sku, score) {
  let base = score;
  if (sku.peerVelocity === 0) base -= 15;
  if (sku.lifecycle === "NPI") base -= 8;
  return Math.max(30, Math.min(98, base));
}

// ─── Tier 1 Line Plan math layer ───────────────────────────────────────────────
// All figures below flow into the health header + assortment table and recompute
// live whenever the merchant edits BUY QTY, so the plan always stays self-consistent.

const T1_MAX_UNITS = 40;   // notional ceiling for a single SKU opening buy (units)
const STANCE_FACTOR = { conservative: 0.65, balanced: 0.85, aggressive: 1.0 };

// AI-predicted local market demand score (0–100)
function computeMktPotential(sku) {
  const score = computeSKUScore(sku);
  const vel   = Math.min(sku.peerVelocity / 140, 1) * 100;
  const clim  = sku.climateFit * 100;
  return Math.round(Math.min(100, 0.45 * vel + 0.35 * clim + 0.20 * score));
}

// AI-recommended opening buy quantity (units) — the "market target"
function computeTargetBuyQty(sku, stance = "balanced") {
  const mkt    = computeMktPotential(sku);
  const factor = STANCE_FACTOR[stance] ?? 0.85;
  return Math.max(1, Math.round((mkt / 100) * T1_MAX_UNITS * factor));
}

// Average units sold per store per week (R13 → 13-week window)
function computeAPS(sku) {
  return Math.round((sku.peerVelocity / 13) * 10) / 10;
}

// Expected unit sell-through %
function computeST(sku) {
  const score = computeSKUScore(sku);
  const st = 0.55 * score + 0.30 * (Math.min(sku.peerVelocity / 140, 1) * 100) + 0.15 * (sku.climateFit * 100);
  return Math.round(Math.max(0, Math.min(100, st)));
}

// Mandatory corporate baseline item?
function isMandatory(sku) {
  return sku.lifecycle === "Core" && sku.peerVelocity >= 100;
}

// ─── Existing Store Reco insight layer ─────────────────────────────────────────
// Powers the three decision-support columns shown only on the Existing Store Reco
// screen. Everything is derived deterministically from the candidate attributes so
// the same SKU always yields the same recommendation, score and demand mix.

const clamp100 = (v) => Math.max(0, Math.min(100, v));

// Add / Keep / Drop action for an existing-store assortment review.
//   • End-of-life or weak scorers  → Drop
//   • Net-new introductions (NPI)  → Add
//   • Proven carryover (Core/etc.) → Keep
function computeExistingReco(sku, score) {
  if (sku.lifecycle === "Clearance") return "drop";
  if (score < 45) return "drop";
  if (sku.lifecycle === "NPI") return "add";
  return "keep";
}

// Configurable weighting for the composite Explainability Score. Tune here.
const EXPLAINABILITY_WEIGHTS = {
  salesPotential:     0.30,
  marginContribution: 0.40,
  marketPotential:    0.20,
  strategicFit:       0.10,
};

// Composite recommendation-confidence score (0–100) plus a transparent
// per-KPI contribution breakdown for the hover tooltip.
function computeExplainability(sku) {
  const salesPotential     = clamp100(sku.st ?? computeST(sku));
  const marginContribution = clamp100(((sku.margin - 0.40) / 0.25) * 100);
  const marketPotential    = clamp100(sku.mktPotential ?? computeMktPotential(sku));
  const strategicFit       = clamp100(
    0.6 * (sku.climateFit * 100)
    + (isMandatory(sku) ? 25 : 0)
    + (sku.lifecycle === "Core" ? 15 : sku.lifecycle === "NPI" ? 8 : 0)
  );
  const W = EXPLAINABILITY_WEIGHTS;
  const parts = [
    { key: "sales",     label: "Sales Potential",     hint: "expected sell-through",        weight: W.salesPotential,     value: Math.round(salesPotential) },
    { key: "margin",    label: "Margin Contribution", hint: "gross-margin headroom",         weight: W.marginContribution, value: Math.round(marginContribution) },
    { key: "market",    label: "Market Potential",    hint: "cold-start demand index",       weight: W.marketPotential,    value: Math.round(marketPotential) },
    { key: "strategic", label: "Strategic Fit",       hint: "climate · mandate · lifecycle", weight: W.strategicFit,       value: Math.round(strategicFit) },
  ].map((p) => ({ ...p, contribution: Math.round(p.weight * p.value) }));
  const score = clamp100(Math.round(parts.reduce((s, p) => s + p.weight * p.value, 0)));
  return { score, parts };
}

// Expected Pro/Contractor vs DIY demand split (%). Rustic/wirebrushed, wider
// planks and core carry skew contractor; smooth/gloss skews DIY.
function computeProMix(sku) {
  let pro = 48;
  const finish = (sku.finish || "").toLowerCase();
  if (finish.includes("wirebrushed"))  pro += 16;
  if (finish.includes("hand-scraped")) pro += 12;
  if (finish.includes("distressed"))   pro += 10;
  if (finish.includes("smooth"))       pro -= 10;
  if (finish.includes("gloss"))        pro -= 14;
  if (finish.includes("matte"))        pro += 2;
  const widthNum = parseFloat(String(sku.width).replace(/[^0-9.]/g, "")) || 0;
  if (widthNum >= 7)      pro += 12;
  else if (widthNum >= 5) pro += 8;
  if (sku.species === "Oak" || sku.species === "Hickory") pro += 4;
  if (sku.species === "Maple" || sku.species === "Ash")   pro -= 2;
  if (sku.lifecycle === "Core") pro += 4;
  pro = Math.max(22, Math.min(82, Math.round(pro)));
  return { pro, diy: 100 - pro };
}

// ─── Hindsight scan layer (Existing Store flow, Step 1) ────────────────────────
// The agent scans every active option, scores it with the same weighted engine
// used downstream, tags a Keep / Introduce / Drop decision, and reconstructs the
// last-season historical signals that justify that decision. Fully deterministic
// so the scan, the transfer, and the line plan always tell one consistent story.
function buildHindsightRows() {
  return SOLID_PREFINISHED_CANDIDATES.map((sku) => {
    const score = computeSKUScore(sku);
    const enriched = { ...sku, score };
    enriched.mktPotential = computeMktPotential(enriched);
    enriched.st          = computeST(enriched);
    enriched.existingReco = computeExistingReco(enriched, score);
    enriched.explain      = computeExplainability(enriched);
    // Reconstructed last-season performance (R13 peer velocity → annualized).
    const annualUnits  = Math.round(sku.peerVelocity * 4);
    const salesDollars = Math.round(annualUnits * sku.retail);
    enriched.hindsight = {
      annualUnits,
      salesDollars,
      gmPct:       Math.round(sku.margin * 100),
      sellThrough: enriched.st,
      returnRate:  Math.round((sku.returnRate || 0) * 1000) / 10,
    };
    return enriched;
  }).sort((a, b) => b.explain.score - a.explain.score);
}

// Human label + Badge treatment for a hindsight decision.
const HINDSIGHT_DECISION = {
  keep: { label: "Carryover",  color: "success", desc: "Proven performer — auto-retained" },
  add:  { label: "Introduce",  color: "info",    desc: "Top-scoring recommendation" },
  drop: { label: "Drop",       color: "error",   desc: "Underperformer — held back" },
};

// ─── Tier 2 Override Grid math layer ───────────────────────────────────────────
// Ag (agreed baseline, from Tier 1's buy plan) vs. Wp (working plan, merchant-
// edited) reconciled monthly. Every override recomputes %Var live; nothing here
// is faked — Sales R traces to buyQty × retail on a seasonal curve, Receipts
// trace to buyQty × cost landed in the SKU's assigned Drop month.

const T2_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const T2_SEASONAL_WEIGHT = [0.10, 0.18, 0.22, 0.22, 0.18, 0.10];
const T2_DROP_MONTH_IDX = { "Drop 1": 0, "Drop 2": 2, "Drop 3": 4, "Drop 4": 5 };

// Metric groups shown in the Override Grid. `editable` metrics accept a Wp
// (working-plan) override; the derived metrics (ST%, OTB R, EOH Inv) are
// agent-computed roll-forwards and are read-only.
const T2_METRICS = [
  { key: "salesR",   label: "Sales R",  kind: "money", editable: true  },
  { key: "gmPct",    label: "GM%",      kind: "pct",   editable: true  },
  { key: "st",       label: "ST%",      kind: "pct",   editable: false },
  { key: "otbR",     label: "OTB R",    kind: "money", editable: false },
  { key: "receipts", label: "Receipts", kind: "money", editable: true  },
  { key: "eohInv",   label: "EOH Inv",  kind: "units", editable: false },
];
const T2_REASON_CODES = ["Demand Signal", "Vendor Constraint", "Merchant Judgment", "Promo Plan", "Other"];
const T2_ATTRS = [
  { key: "species",   label: "Species"   },
  { key: "finish",    label: "Finish"    },
  { key: "width",     label: "Width"     },
  { key: "lifecycle", label: "Lifecycle" },
];

// Per-SKU monthly baseline. Sales R = buyQty × retail on a seasonal curve;
// Receipts = buyQty × cost landed in the assigned Drop month. From those we
// roll forward the derived metrics honestly:
//   • EOH Inv  = cumulative units received − cumulative units sold (floored 0)
//   • ST%      = cumulative units sold ÷ cumulative units received
//   • OTB R    = SKU receipt budget (qty × cost) − cumulative receipts landed
function buildT2AgMonths(sku, qty, dropLabel) {
  const dropIdx = T2_DROP_MONTH_IDX[dropLabel] ?? 0;
  const gmPct = Math.round(sku.margin * 1000) / 10;
  const receiptBudget = qty * sku.cost;
  let cumRecvUnits = 0, cumSoldUnits = 0, cumRecv$ = 0;
  return T2_MONTHS.map((_, i) => {
    const salesR   = Math.round(qty * sku.retail * T2_SEASONAL_WEIGHT[i]);
    const receipts = i === dropIdx ? Math.round(receiptBudget) : 0;
    cumSoldUnits += sku.retail > 0 ? salesR / sku.retail : 0;
    cumRecvUnits += sku.cost   > 0 ? receipts / sku.cost   : 0;
    cumRecv$     += receipts;
    return {
      salesR,
      gmPct,
      receipts,
      st:     cumRecvUnits > 0 ? Math.round((cumSoldUnits / cumRecvUnits) * 1000) / 10 : 0,
      otbR:   Math.max(0, Math.round(receiptBudget - cumRecv$)),
      eohInv: Math.max(0, Math.round(cumRecvUnits - cumSoldUnits)),
    };
  });
}

// Format a metric value for display based on its kind.
function fmtT2Metric(val, kind, scale) {
  if (kind === "money") return fmtMoneyScaled(val, scale);
  if (kind === "pct")   return `${(Number(val) || 0).toFixed(1)}%`;
  return `${Math.round(Number(val) || 0)}`;      // units
}

function pctVar(ag, wp) {
  if (!ag) return wp ? 100 : 0;
  return ((wp - ag) / ag) * 100;
}

function fmtMoneyScaled(v, scale) {
  const n = Number(v) || 0;
  if (scale === "M") return `$${(n / 1_000_000).toFixed(2)}M`;
  if (scale === "K") return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// ─── Tier 3 WSSI math engine ────────────────────────────────────────────────────
// Store-Item-Week buy quantification for the opening 10-week lifecycle. Every
// value cascades from four editable levers — Week Type, Discount %, Elasticity
// Coefficient, Weekly Base Demand — through five formula passes, exactly as
// specified: (1) ASP/GM%/Sales Lift, (2) WOC Units/Target EOH forward-looking
// sum, (3) sequential On Hand → Intake → Actual EOH rollforward, (4) cumulative
// Sell-Thru%, (5) forward Weeks-of-Supply.

const WSSI_WEEKS = 10;
const WSSI_WOC_TARGET = 2;              // weeks-of-cover target used to size Target EOH
const WSSI_PRESENTATION_STOCK = 10;     // units held for visual presentation, never sold below
const WSSI_DEFAULT_WEEK_TYPES = ["FP", "FP", "FP", "FP", "PP", "FP", "FP", "MD", "MD", "MD"];
const WSSI_DEFAULT_DISCOUNTS  = [0, 0, 0, 0, 20, 0, 0, 10, 20, 30];

function computeWSSI(sku, { discounts, elasticity, baseDemand }) {
  const cp = sku.cost;
  const baseASP = sku.retail;

  // Pass 1 — price & demand curve (no inventory dependency)
  const asp = [], gmPct = [], salesLift = [], totalSalesUnit = [];
  for (let t = 0; t < WSSI_WEEKS; t++) {
    const d = (discounts[t] || 0) / 100;
    asp[t]           = baseASP * (1 - d);
    gmPct[t]          = asp[t] > 0 ? ((asp[t] - cp) / asp[t]) * 100 : 0;
    salesLift[t]      = baseDemand * d * elasticity;
    totalSalesUnit[t] = baseDemand + salesLift[t];
  }

  // Pass 2 — forward-looking cover: WOC Units + Presentation Stock = Target EOH
  const wocUnits = [], targetEOH = [];
  for (let t = 0; t < WSSI_WEEKS; t++) {
    let sum = 0;
    for (let i = t + 1; i <= t + WSSI_WOC_TARGET && i < WSSI_WEEKS; i++) sum += totalSalesUnit[i];
    wocUnits[t]  = sum;
    targetEOH[t] = sum + WSSI_PRESENTATION_STOCK;
  }

  // Pass 3 — sequential rollforward with clearance guardrail (Intake forced to 0
  // during the final two markdown exit weeks, per merchandising policy)
  const isExitWeek = (t) => t >= WSSI_WEEKS - 2;
  const initialOnHand = Math.round(baseDemand * WSSI_WOC_TARGET);
  const onHand = [], intake = [], actualEOH = [];
  for (let t = 0; t < WSSI_WEEKS; t++) {
    onHand[t] = t === 0 ? initialOnHand : actualEOH[t - 1];
    const rawIntake = Math.max(0, targetEOH[t] - (onHand[t] - totalSalesUnit[t]));
    intake[t]    = isExitWeek(t) ? 0 : rawIntake;
    actualEOH[t] = onHand[t] - totalSalesUnit[t] + intake[t];
  }

  // Pass 4 — cumulative sell-through against total supply received-to-date
  const sellThru = [];
  let cumIntake = 0;
  for (let t = 0; t < WSSI_WEEKS; t++) {
    cumIntake += intake[t];
    const supply = initialOnHand + cumIntake;
    sellThru[t] = supply > 0 ? (totalSalesUnit[t] / supply) * 100 : 0;
  }

  // Pass 5 — forward weeks-of-supply from current Actual EOH against future demand
  const wosCalc = [];
  for (let t = 0; t < WSSI_WEEKS; t++) {
    let remaining = actualEOH[t];
    let weeksCovered = 0;
    for (let i = t + 1; i < WSSI_WEEKS; i++) {
      const demand = totalSalesUnit[i];
      if (demand <= 0) { weeksCovered += 1; continue; }
      if (remaining >= demand) { remaining -= demand; weeksCovered += 1; }
      else { weeksCovered += remaining / demand; remaining = 0; break; }
    }
    wosCalc[t] = weeksCovered;
  }

  return { asp, gmPct, salesLift, totalSalesUnit, onHand, wocUnits, targetEOH, intake, actualEOH, sellThru, wosCalc, initialOnHand, cp };
}

// Locked buy quantity surfaced in Tier 1: the total intake the Tier 3 WSSI
// engine derives at its default parameters. Buy qty is never edited in Tier 1 —
// it is quantified downstream (Weeks-of-Cover + Presentation Stock), so Tier 1
// mirrors that calculation rather than exposing an arbitrary stepper.
function computeWssiIntakeTotal(sku) {
  if (!sku) return 0;
  const baseDemand = Math.max(15, Math.round((sku.aps || 8) * 3));
  const { intake } = computeWSSI(sku, { discounts: WSSI_DEFAULT_DISCOUNTS, elasticity: 3, baseDemand });
  return Math.round(intake.reduce((a, b) => a + b, 0));
}

// ─── Assortment Engine log builder ─────────────────────────────────────────────

// Ordered low→high; label persists until the next threshold is crossed
// (rather than snapping straight to "complete" whenever an exact stage
// number isn't matched), so the header status text tracks the phase
// the pipeline is actually working through at any given moment.
const STAGE_THRESHOLDS = [
  { min: 0,   label: "Initialising" },
  { min: 2,   label: "Ingesting Store Context" },
  { min: 17,  label: "Querying Cluster Registry" },
  { min: 25,  label: "Matching Peers" },
  { min: 49,  label: "Fetching Demand Forecast" },
  { min: 65,  label: "Fetching Guardrails" },
  { min: 79,  label: "Scoring SKUs" },
  { min: 95,  label: "Finalising Plan" },
  { min: 100, label: "Line Plan Ready" },
];
function getStageLabel(stage) {
  let label = STAGE_THRESHOLDS[0].label;
  for (const t of STAGE_THRESHOLDS) {
    if (stage >= t.min) label = t.label;
    else break;
  }
  return label;
}

function buildEngineLogs(sf) {
  const dept    = sf?.department    || "Hardwood Flooring";
  const subs    = Array.isArray(sf?.subdepartment) ? sf.subdepartment : sf?.subdepartment ? [sf.subdepartment] : ["Solid Prefinished"];
  const cls     = Array.isArray(sf?.cls)            ? sf.cls            : sf?.cls            ? [sf.cls]            : ["All Classes"];
  const stance  = sf?.stance   || "balanced";
  const horizon = sf?.horizon  || "ss26_h1";
  const name    = sf?.scenarioName || "Billings_SS26_SolidPrefinished_v1";

  const horizonLabel = horizon === "ss26_h1" ? "SS26 Weeks 1–26"
    : horizon === "ss26_h2" ? "SS26 Weeks 27–52"
    : "FW26";
  const subLabel = subs.join(" + ");
  const clsLabel = cls.filter(c => c !== "All Classes").join(" + ") || "All Classes";
  const scopeLine = `${dept}  ▸  ${subLabel}  ▸  ${clsLabel}`;

  // Stance-adaptive numbers
  const skuCount    = stance === "conservative" ? 13 : stance === "aggressive" ? 23 : 19;
  const otbTotal    = stance === "conservative" ? 36400 : stance === "aggressive" ? 47800 : 41850;
  const otbCap      = 45000;
  const otbPct      = Math.round(otbTotal / otbCap * 100);
  const gmRate      = stance === "conservative" ? 44.1 : stance === "aggressive" ? 42.5 : 43.2;
  const candidateN  = stance === "conservative" ? 108  : stance === "aggressive" ? 156  : 142;
  const rankedN     = stance === "conservative" ? 13   : stance === "aggressive" ? 23   : 19;
  const stanceLabel = stance === "conservative" ? "Conservative" : stance === "aggressive" ? "Aggressive" : "Balanced";
  const stanceSkuRange = stance === "conservative" ? "12–15" : stance === "aggressive" ? "22–25" : "18–22";

  return [
    // ── Header banner ──────────────────────────────────────────────── (0–0.3 s)
    { t:    0, type: "header",   stage: 0,  text: `SMART ASSORTMENT ENGINE v3.2  ·  RUN ID: ${name}` },
    { t:  300, type: "header2",  stage: 1,  text: `Scope: ${scopeLine}  |  Horizon: ${horizonLabel}  |  Stance: ${stanceLabel}` },

    // ── Store context ─────────────────────────────────────────────── (1.1–6.7 s)
    { t: 1100, type: "info",     stage: 2,  text: "[Store-Context-Agent]  Ingesting location metadata & external enrichment…" },
    { t: 1300, type: "progress", stage: 3,  label: "Loading store context & catchment data", duration: 2800 },
    { t: 4550, type: "tree",     stage: 10, text: "├─  Store Profile      : Store #381  |  55,000 sq ft  |  Smaller-footprint warehouse" },
    { t: 5250, type: "tree",     stage: 11, text: "├─  30-Mi Catchment    : 52,408 HH  |  $58.1k MHI  |  68.5% Owner-Occupied  |  41.2% Pre-1990 Housing" },
    { t: 5950, type: "tree",     stage: 13, text: "├─  Trade Signals      : 1.4× Pro Contractor Index  |  34.6 Home-Center Density / 10k HH" },
    { t: 6650, type: "tree",     stage: 15, text: "└─  NOAA Climate       : USDA Zone 4b (Cold Continental)  |  14°F Winter Low  |  Dry Winter Heating Season" },

    // ── Cluster lookup + fallback ─────────────────────────────────── (7.6–11.6 s)
    { t: 7650, type: "info",     stage: 17, text: `[Cluster-Service]  Searching saved pre-computed clusters for Scope: [${dept} → ${subLabel}]…` },
    { t: 7850, type: "progress", stage: 17, label: "Querying global cluster registry", duration: 1400 },
    { t: 9950, type: "warn",     stage: 22, text: `⚠  NO SAVED CLUSTER FOUND for cold-start Store #381 in [${subLabel}]` },
    { t:10650, type: "info",     stage: 23, text: "⚡ FALLBACK TRIGGERED — Executing Dynamic Cold-Start Peer Selection Pipeline…" },

    // ── Peer matching ─────────────────────────────────────────────── (11.6–22.3 s)
    { t:11650, type: "divider",  stage: 25, text: "STEP 1 : MULTI-ATTRIBUTE PEER CLUSTERING & WEIGHTED SIMILARITY SCORE" },
    { t:12350, type: "info",     stage: 27, text: "[Peer-Matching-Engine]  Running multi-attribute similarity matrix across 380 active stores…" },
    { t:12550, type: "progress", stage: 27, label: "Computing weighted similarity scores  (380 stores × 4 lenses)", duration: 3200 },
    { t:16200, type: "tree",     stage: 35, text: "├─  Formula Weighting  : 38% Store Structure  +  42% Market Context  +  15% Category Signal  +  5pt Mountain Bonus" },
    { t:16900, type: "tree",     stage: 37, text: "├─  Tier 1A Structure  : Assigned → Family B  (Pacific West / Mountain)  [Sensitivity: Family E]" },
    { t:17600, type: "tree",     stage: 38, text: "└─  Tier 1B Market     : Assigned → M3 (Contractor-Rich / Home-Center Dense)" },
    { t:18300, type: "info",     stage: 40, text: "Dynamic Peer Pool Evaluated & Scored  (spatial distance excluded from scoring weight):" },
    { t:18750, type: "tree",     stage: 41, text: "├─  #159 Draper, UT         │ Score: 95.1  │ Primary Demand Anchor  (M3/B1)" },
    { t:19200, type: "tree",     stage: 42, text: "├─  #144 Reno, NV           │ Score: 90.8  │ Dry / Interior-West Comp  (Small Format)" },
    { t:19650, type: "tree",     stage: 43, text: "├─  #234 Salt Lake City, UT │ Score: 89.9  │ Mountain Urban Market Comp" },
    { t:20100, type: "tree",     stage: 44, text: "├─  #313 Beaverton, OR      │ Score: 87.2  │ PNW Small-Format Sensitivity" },
    { t:20550, type: "tree",     stage: 45, text: "└─  #200 Albuquerque, NM    │ Score: 76.2  │ High-Desert Climate Baseline" },
    { t:21300, type: "success",  stage: 46, text: `✓  Peer velocity benchmark: Avg 20.5 active selling SKUs  |  114.3 delivered units / yr  |  Elevated DOS ~1,169 days → restricting opening buy depth` },

    // ── Demand forecast ───────────────────────────────────────────── (22.3–28.9 s)
    // Logically sits right here: it needs the peer velocity benchmark just computed
    // above, and its output (a weekly demand curve) is what guardrail pacing and
    // SKU scoring both consume next — so it must run between the two.
    { t:22300, type: "divider",  stage: 49, text: "STEP 2 : DEMAND FORECAST FETCHING & SEASONAL CURVE GENERATION" },
    { t:23000, type: "info",     stage: 50, text: `[Demand-Forecast-Agent]  Fetching 26-week unit demand forecast for [${subLabel}] using peer-blended velocity + seasonal indices…` },
    { t:23200, type: "progress", stage: 51, label: "Generating weekly demand curve  (peer blend × climate seasonality × launch decay)", duration: 2400 },
    { t:26050, type: "tree",     stage: 57, text: "├─  Baseline Velocity  : R13 Peer-Blended Rate → 20.5 units/store/wk  (5-peer weighted average)" },
    { t:26750, type: "tree",     stage: 58, text: "├─  Seasonal Index     : Zone 4b Heating-Season Curve → Spring Peak +22%  |  Deep-Winter Trough −31%" },
    { t:27450, type: "tree",     stage: 60, text: "├─  Launch-Curve Overlay : New-Store Wk1–4 Novelty Spike ×1.35  → tapering to steady-state by Wk6" },
    { t:28150, type: "tree",     stage: 61, text: `└─  Forecast Horizon   : ${horizonLabel} → 26-Week Rolling Unit-Demand Curve Generated  (±14% Cold-Start Confidence Band)` },
    { t:28900, type: "success",  stage: 63, text: "✓  Demand forecast fetched — weekly targets now feeding OTB pacing & SKU scoring below" },

    // ── Guardrails ────────────────────────────────────────────────── (29.9–36.2 s)
    { t:29900, type: "divider",  stage: 65, text: "STEP 3 : FETCHING FINANCIAL CONSTRAINTS & SEASONAL GUARDRAILS" },
    { t:30600, type: "info",     stage: 67, text: `[Guardrail-Agent]  Fetching enterprise constraints for Scope: [${dept} → ${subLabel}]  &  Horizon: [${horizonLabel}]…` },
    { t:30800, type: "progress", stage: 67, label: "Fetching OTB caps, GM floors & supply chain rules from enterprise services", duration: 1800 },
    { t:33050, type: "tree",     stage: 72, text: `├─  Open-To-Buy (OTB) Budget Cap  : $${(otbCap/1000).toFixed(0)}k  (Allocated for Opening)` },
    { t:33750, type: "tree",     stage: 74, text: "├─  Target Gross Margin Floor     : 42.0% Min GM" },
    { t:34450, type: "tree",     stage: 75, text: "├─  Space Allocation / POG        : 2 Bays  (Target 18–22 Active SKUs)" },
    { t:35150, type: "tree",     stage: 77, text: "└─  Supply Chain Rules             : Vendor MOQ = 1 Pallet / SKU  |  Max Allowed DOS = 120 Days" },

    // ── SKU scoring ───────────────────────────────────────────────── (36.2–42.6 s)
    { t:36150, type: "divider",  stage: 79, text: "STEP 4 : SKU SCORING, CLIMATE FILTERING & LINE ARCHITECTURE BUILD" },
    { t:36850, type: "info",     stage: 80, text: `[SKU-Scorer]  Scoring ${candidateN} candidate SKUs against forecasted weekly demand for [${subLabel}]…` },
    { t:37050, type: "progress", stage: 81, label: `Scoring ${candidateN} candidates  (forecast fit → climate → margin → bridge filters)`, duration: 2000 },
    { t:39500, type: "tree",     stage: 86, text: "├─  Filtered (Climate) : −18 SKUs excluded  (high-shrink solids vulnerable to Zone 4b dry winter)" },
    { t:40200, type: "tree",     stage: 88, text: "├─  Filtered (Margin)  : −12 SKUs excluded  (items failing 42.0% GM floor)" },
    { t:40900, type: "tree",     stage: 89, text: `└─  Ranked Candidates  : ${rankedN} SKUs selected under Stance [${stanceLabel}]  (target range ${stanceSkuRange})` },
    { t:41700, type: "success",  stage: 91, text: "✓  [Attach-Engine]  Cross-category transition strip, reducer, T-moulding & underlayment needs dispatched to Accessories Module" },
    { t:42550, type: "success",  stage: 93, text: `✓  Final opening assortment: ${rankedN} Active SKUs  ·  $${otbTotal.toLocaleString()} OTB (${otbPct}% of cap)  ·  Projected GM ${gmRate}%  ·  65% OTB reserved for Wk4/8/13 replenishment loop` },

    // ── Plan build ───────────────────────────────────────────────── (43.6–45.4 s)
    { t:43550, type: "info",     stage: 95, text: `[Plan-Builder]  Loading Plan Name: "${name}"…` },
    { t:43750, type: "progress", stage: 95, label: `Finalising plan record  →  "${name}"`, duration: 1600 },

    // ── Done ──────────────────────────────────────────────────────── (45.9 s)
    { t:45850, type: "done",     stage: 100, text: `✅  ASSORTMENT PLANNING ENGINE COMPLETE  ——  Pipeline Execution: 45.9 s` },
  ];
}

// ─── Scope Modal ───────────────────────────────────────────────────────────────

const PLANNING_HORIZONS = [
  { value: "ss26_h1", label: "Weeks 1–26 (SS26 First Half)" },
  { value: "ss26_h2", label: "Weeks 27–52 (SS26 Second Half)" },
  { value: "fw26",    label: "Fall/Winter 2026 (FW26)" },
];
// Assortment stance is fixed to "balanced" — the recommended cold-start
// approach — and surfaced read-only in the scope preview below.
const BALANCED_STANCE_DESC = "Blends proven peer movers with targeted high-margin regional trend SKUs — the recommended approach for cold-start stores.";

// Auto-generate scenario name from form fields (sub/cls may be arrays)
function buildScenarioName(dept, sub, cls) {
  const parts = ["Billings", "SS26"];
  if (dept) parts.push(dept.replace(/[^A-Za-z0-9]/g, "").slice(0, 12));
  const subLabel = Array.isArray(sub)
    ? sub.length > 1 ? "MultiSub" : sub[0]?.replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || ""
    : (sub || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
  if (subLabel) parts.push(subLabel);
  const clsLabel = Array.isArray(cls)
    ? cls.length === 1 && cls[0] !== "All Classes" ? cls[0].replace(/[^A-Za-z0-9]/g, "").slice(0, 10) : ""
    : cls && cls !== "All Classes" ? cls.replace(/[^A-Za-z0-9]/g, "").slice(0, 10) : "";
  if (clsLabel) parts.push(clsLabel);
  parts.push("v1");
  return parts.join("_");
}

function ScopeDrawer({ store, onClose, onLaunch }) {
  const defaultDept = HIERARCHY[0].label;
  const defaultSubs = [HIERARCHY[0].subs[0].label];
  const defaultCls  = ["All Classes"];

  const [form, setForm] = useState({
    scenarioName:  buildScenarioName(defaultDept, defaultSubs, defaultCls),
    department:    defaultDept,
    subdepartment: defaultSubs,   // string[]
    cls:           defaultCls,    // string[]
    horizon:       "ss26_h1",
    stance:        "balanced",
    nameEdited:    false,
  });

  // All subs for the selected department
  const subOptions = useMemo(() => {
    const dept = HIERARCHY.find(h => h.label === form.department);
    return dept ? dept.subs : [];
  }, [form.department]);

  // Union of classes from all selected subdepartments
  const classOptions = useMemo(() => {
    if (!form.subdepartment.length) return ["All Classes"];
    const allClasses = new Set(["All Classes"]);
    form.subdepartment.forEach(subLabel => {
      const sub = subOptions.find(s => s.label === subLabel);
      if (sub) sub.classes.forEach(c => c !== "All Classes" && allClasses.add(c));
    });
    return Array.from(allClasses);
  }, [subOptions, form.subdepartment]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleDeptChange = (dept) => {
    const newSubs = HIERARCHY.find(h => h.label === dept)?.subs || [];
    const newSub  = newSubs[0] ? [newSubs[0].label] : [];
    const newCls  = ["All Classes"];
    const autoName = buildScenarioName(dept, newSub, newCls);
    setForm(prev => ({
      ...prev,
      department: dept, subdepartment: newSub, cls: newCls,
      scenarioName: prev.nameEdited ? prev.scenarioName : autoName,
    }));
  };

  // sub is string[] from FdSelect isMulti onChange
  const handleSubChange = (sub) => {
    const arr    = Array.isArray(sub) ? sub : sub ? [sub] : [];
    const newCls = ["All Classes"];
    const autoName = buildScenarioName(form.department, arr, newCls);
    setForm(prev => ({
      ...prev,
      subdepartment: arr, cls: newCls,
      scenarioName: prev.nameEdited ? prev.scenarioName : autoName,
    }));
  };

  // cls is string[] from FdSelect isMulti onChange
  const handleClsChange = (cls) => {
    const arr = Array.isArray(cls) ? cls : cls ? [cls] : [];
    const autoName = buildScenarioName(form.department, form.subdepartment, arr);
    setForm(prev => ({
      ...prev, cls: arr,
      scenarioName: prev.nameEdited ? prev.scenarioName : autoName,
    }));
  };

  // Keyboard: Enter → launch
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canLaunch) doLaunch();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const canLaunch = form.scenarioName.trim() && form.department && form.subdepartment.length > 0;
  const doLaunch  = () => onLaunch({
    scenarioName:  form.scenarioName,
    department:    form.department,
    subdepartment: form.subdepartment,
    cls:           form.cls,
    horizon:       form.horizon,
    stance:        form.stance,
  });

  const storeName = store ? `${store.market}, ${store.state}` : "New Store";
  const storeId   = store?.id ? `#${store.id}` : "";

  return (
    <div className="nsp-drawer-backdrop" onClick={onClose}>
      <div className="nsp-drawer" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="nsp-drawer-header">
          <div className="nsp-drawer-header-left">
            <div className="nsp-drawer-icon"><Zap size={16} /></div>
            <div>
              <div className="nsp-drawer-title">Configure Assortment Engine</div>
              <div className="nsp-drawer-sub">{storeName} · {storeId} · Cold-Start · 55k sq ft</div>
            </div>
          </div>
          <button className="nsp-drawer-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <div className="nsp-drawer-body">

          {/* ── Scenario Name ─────────────────────────────────────── */}
          <div className="nsp-drawer-section">
            <div className="nsp-drawer-section-label">
              <FileText size={13} /> Scenario Identifier
          </div>
            <input
              className="nsp-drawer-input"
              value={form.scenarioName}
              onChange={e => set("scenarioName", e.target.value) || set("nameEdited", true)}
              onFocus={() => set("nameEdited", true)}
              placeholder="e.g. Billings_SS26_Wood_SolidPrefinished_v1"
            />
            <div className="nsp-drawer-hint">
              Edit scenario name to customise version history and side-by-side comparisons.
                </div>
              </div>

          {/* ── Cascading Hierarchy ─────────────────────────────── */}
          <div className="nsp-drawer-section">
            <div className="nsp-drawer-section-label">
              <Layers size={13} /> Merchandise Hierarchy
                    </div>

            <div className="nsp-drawer-cascade">
              <div className="nsp-drawer-cascade-step">
                <span className="nsp-drawer-cascade-num">1</span>
                <div className="nsp-drawer-cascade-field">
                  <div className="nsp-drawer-cascade-lbl">Department</div>
                  <FdSelect
                    value={form.department}
                    options={HIERARCHY.map(h => ({ value: h.label, label: h.label }))}
                    onChange={handleDeptChange}
                    width="100%"
                  />
                  </div>
        </div>

              <div className="nsp-drawer-cascade-connector" />

              <div className="nsp-drawer-cascade-step">
                <span className="nsp-drawer-cascade-num">2</span>
                <div className="nsp-drawer-cascade-field">
                  <div className="nsp-drawer-cascade-lbl">Subdepartment</div>
                  <FdSelect
                    value={form.subdepartment}
                    options={subOptions.map(s => ({ value: s.label, label: s.label }))}
                    onChange={handleSubChange}
                    width="100%"
                    isMulti
                    isWithSelectAll
                    isClearable
                    isWithSearch
                  />
              </div>
            </div>

              <div className="nsp-drawer-cascade-connector" />

              <div className="nsp-drawer-cascade-step">
                <span className="nsp-drawer-cascade-num">3</span>
                <div className="nsp-drawer-cascade-field">
                  <div className="nsp-drawer-cascade-lbl">Class <span className="nsp-drawer-opt-tag">Optional</span></div>
                  <FdSelect
                    value={form.cls}
                    options={classOptions.map(c => ({ value: c, label: c }))}
                    onChange={handleClsChange}
                    width="100%"
                    isMulti
                    isWithSelectAll
                    isClearable
                    isWithSearch
                  />
              </div>
              </div>
              </div>
            </div>

          {/* ── Planning Horizon ────────────────────────────────── */}
          <div className="nsp-drawer-section">
            <div className="nsp-drawer-section-label">
              <Calendar size={13} /> Planning Horizon
              </div>
            <FdSelect
              value={form.horizon}
              options={PLANNING_HORIZONS}
              onChange={v => set("horizon", v)}
              width="100%"
              />
            </div>

          {/* ── Scope Preview ────────────────────────────────────── */}
          <div className="nsp-drawer-section nsp-drawer-preview-section">
            <div className="nsp-drawer-section-label">
              <Sparkles size={13} /> Ready to Launch
            </div>
            <div className="nsp-drawer-preview-card">
              <div className="nsp-drawer-preview-row">
                <span className="nsp-drawer-preview-lbl">Scope</span>
                <span className="nsp-drawer-preview-val">
                  {form.department}
                  <ChevronRight size={11} className="nsp-drawer-preview-sep" />
                  {Array.isArray(form.subdepartment) ? form.subdepartment.join(", ") : form.subdepartment}
                  {form.cls.length && form.cls[0] !== "All Classes" ? (
                    <>
                      <ChevronRight size={11} className="nsp-drawer-preview-sep" />
                      {form.cls.join(", ")}
                    </>
                  ) : null}
                </span>
              </div>
              <div className="nsp-drawer-preview-row">
                <span className="nsp-drawer-preview-lbl">Horizon</span>
                <span className="nsp-drawer-preview-val">
                  {PLANNING_HORIZONS.find(h => h.value === form.horizon)?.label}
                </span>
                  </div>
              <div className="nsp-drawer-preview-row">
                <span className="nsp-drawer-preview-lbl">Stance</span>
                <span className="nsp-drawer-preview-val">
                  <span className="nsp-drawer-preview-dot" /> Balanced
                  <span className="nsp-drawer-preview-auto">Auto-applied</span>
                </span>
                </div>
                  </div>
            <div className="nsp-drawer-hint">{BALANCED_STANCE_DESC}</div>
                </div>

        </div>{/* /nsp-drawer-body */}

        {/* Footer */}
        <div className="nsp-drawer-footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={<Zap size={14} />}
            iconPlacement="left"
            disabled={!canLaunch}
            onClick={doLaunch}
          >
            Launch Engine ↵
          </Button>
                  </div>

                </div>
              </div>
  );
}

// ─── Engine Terminal ───────────────────────────────────────────────────────────

function EngineTerminal({ scopeForm, onComplete, persistent = false, onReady }) {
  const allLogs   = useMemo(() => buildEngineLogs(scopeForm), [scopeForm]);
  const [visible, setVisible] = useState([]);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState("Initialising");
  const [done, setDone]   = useState(false);
  const [cursor, setCursor] = useState(true);
  const [countdown, setCountdown]     = useState(2);
  const [collapsing, setCollapsing]   = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);
  const logEndRef = useRef(null);
  const timers    = useRef([]);

  // Derive summary stats from scopeForm for the completion card
  const stance   = scopeForm?.stance || "balanced";
  const skuCount = stance === "conservative" ? 13 : stance === "aggressive" ? 23 : 19;
  const otbUsed  = stance === "conservative" ? 36400 : stance === "aggressive" ? 47800 : 41850;
  const otbCap   = 45000;
  const otbPct   = Math.round(otbUsed / otbCap * 100);
  const gmRate   = stance === "conservative" ? 44.1 : stance === "aggressive" ? 42.5 : 43.2;
  const stanceLabel = stance === "conservative" ? "Conservative" : stance === "aggressive" ? "Aggressive" : "Balanced";

  // Stream logs on mount
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible([]);
    setProgress(0);
    setDone(false);

    allLogs.forEach((entry, i) => {
      timers.current.push(setTimeout(() => {
        setVisible(prev => [...prev, entry]);
        if (entry.stage !== undefined) {
          setProgress(entry.stage);
          setStageLabel(getStageLabel(entry.stage));
        }
        if (i === allLogs.length - 1) {
          setTimeout(() => setDone(true), 900);
        }
      }, entry.t));
    });

    return () => timers.current.forEach(clearTimeout);
  }, [allLogs]);

  // Auto-scroll to newest line
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible]);

  // Blink cursor every 500 ms while running
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setCursor(c => !c), 500);
    return () => clearInterval(id);
  }, [done]);

  // ── Completion handling ──
  // Persistent (CoT panel) mode: on done, after a short beat auto-collapse the
  // log body and reveal the recommendation inline below — no countdown, no
  // click, and the panel stays mounted so its caret is always available.
  useEffect(() => {
    if (!persistent || !done) return;
    const id = setTimeout(() => {
      setLogsExpanded(false);
      onReady?.();
    }, 800);
    return () => clearTimeout(id);
  }, [persistent, done]);

  // Legacy (reconfigure) mode: count down 2s (shown in the summary card) then
  // collapse the terminal and auto-advance — no click required. A user can
  // still jump ahead early via "Continue Now".
  useEffect(() => {
    if (persistent || !done) return;
    setCountdown(2);
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [persistent, done]);

  useEffect(() => {
    if (!persistent && done && countdown === 0) setCollapsing(true);
  }, [persistent, done, countdown]);

  // Fire onComplete once the collapse transition has had time to play
  useEffect(() => {
    if (!collapsing) return;
    const id = setTimeout(() => onComplete?.(), 480);
    return () => clearTimeout(id);
  }, [collapsing]);

  // Format ms since epoch as MM:SS.mmm (relative to start t=0)
  const startTime = useRef(Date.now());
  const formatTs = (t) => {
    const m = Math.floor(t / 60000).toString().padStart(2, "0");
    const s = Math.floor((t % 60000) / 1000).toString().padStart(2, "0");
    const ms = Math.floor((t % 1000) / 10).toString().padStart(2, "0");
    return `${m}:${s}.${ms}`;
  };

  return (
    <div className={`nsp-eng-terminal-wrap nsp-fade-up${collapsing ? " nsp-eng-collapsing" : ""}`}>
      <div className="nsp-terminal-panel">
        {/* ── Mac-style title bar ─── */}
        <div className="nsp-term-header">
          <div className="nsp-term-dots">
            <span className="nsp-term-dot red" />
            <span className="nsp-term-dot yellow" />
            <span className={`nsp-term-dot green ${!done ? "nsp-term-dot-pulse" : ""}`} />
              </div>
          <div className="nsp-term-header-title">
            <span className="nsp-term-engine-name">assortment-engine</span>
            <span className="nsp-term-sep"> · </span>
            <span className="nsp-term-scenario">{scopeForm?.scenarioName || "—"}</span>
            </div>
          <div className="nsp-term-stage-wrap">
            <span className="nsp-term-stage-label">{done ? "Complete" : stageLabel}</span>
            <div className={`nsp-term-progress-wrap${done ? " is-done" : ""}`}>
              <div className="nsp-term-progress-bar" style={{ width: `${progress}%` }} />
          </div>
            <span className="nsp-term-pct">{progress}%</span>
          </div>
          <button
            type="button"
            className="nsp-term-toggle"
            onClick={() => setLogsExpanded(v => !v)}
            aria-label={logsExpanded ? "Collapse execution log" : "Expand execution log"}
            title={logsExpanded ? "Collapse execution log" : "Expand execution log"}
          >
            {logsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
            </div>

        {/* ── Log body (manually collapsible at any time) ─── */}
        <div className={`nsp-term-body${logsExpanded ? "" : " nsp-term-body-collapsed"}`}>
          <div className="nsp-term-scanline" />
          {visible.map((entry, i) => {
            const isLast = i === visible.length - 1;
            if (entry.type === "progress") {
              return (
                <div key={i} className="nsp-tlog nsp-tprog-row">
                  <span className="nsp-tlog-ts">[{formatTs(entry.t)}]</span>
                  <div className="nsp-tprog-inner" style={{ "--tprog-dur": `${entry.duration}ms` }}>
                    <span className="nsp-tprog-label">{entry.label}</span>
                    <div className="nsp-tprog-track">
                      <div
                        className="nsp-tprog-fill"
                        style={{ animationDuration: `${entry.duration}ms` }}
              />
            </div>
                    <span
                      className="nsp-tprog-done"
                      style={{ animationDelay: `${entry.duration}ms` }}
                    >✓ done</span>
            </div>
          </div>
              );
            }
            if (entry.type === "header") {
              return (
                <div key={i} className="nsp-tlog nsp-tlog-header">
                  <span className="nsp-tlog-txt">{entry.text}</span>
                  {isLast && !done && cursor && <span className="nsp-tlog-cursor">_</span>}
      </div>
              );
            }
            if (entry.type === "header2") {
              return (
                <div key={i} className="nsp-tlog nsp-tlog-header2">
                  <span className="nsp-tlog-txt">{entry.text}</span>
                  {isLast && !done && cursor && <span className="nsp-tlog-cursor">_</span>}
    </div>
  );
}
            if (entry.type === "divider") {
              return (
                <div key={i} className="nsp-tlog nsp-tlog-divider">
                  <span className="nsp-tlog-divider-line">──────────────────────────────────────────────────────────────────────────────────</span>
                  <span className="nsp-tlog-divider-txt">&gt;&gt;&gt; {entry.text}</span>
                  <span className="nsp-tlog-divider-line">──────────────────────────────────────────────────────────────────────────────────</span>
                </div>
              );
            }
            const pfxClass = entry.type === "tree" ? "nsp-tlog-pfx-tree" : "nsp-tlog-pfx";
            return (
              <div key={i} className={`nsp-tlog nsp-tlog-${entry.type || "info"}`}>
                <span className="nsp-tlog-ts">[{formatTs(entry.t)}]</span>
                <span className={pfxClass}>{entry.type === "tree" ? "" : ">"}</span>
                <span className="nsp-tlog-txt">
                  {entry.text}
                  {isLast && !done && cursor && <span className="nsp-tlog-cursor">_</span>}
                </span>
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
        </div>

      {/* ── Rich summary card (legacy reconfigure flow only) ─── */}
      {done && !persistent && (
        <div className="nsp-eng-summary-card nsp-fade-up">
          <div className="nsp-eng-summary-top">
            <div className="nsp-eng-summary-status">
              <CheckCircle size={16} />
              <span className="nsp-eng-summary-title">Assortment Engine Complete</span>
              <Badge label={stanceLabel} color="default" variant="stroke" size="small" />
            </div>
            <div className="nsp-eng-summary-kpis">
              <div className="nsp-eng-summary-kpi">
                <span className="nsp-eng-summary-kpi-val">{skuCount}</span>
                <span className="nsp-eng-summary-kpi-lbl">SKUs Selected</span>
              </div>
              <div className="nsp-eng-summary-divider" />
              <div className="nsp-eng-summary-kpi">
                <span className="nsp-eng-summary-kpi-val">${otbUsed.toLocaleString()}</span>
                <span className="nsp-eng-summary-kpi-lbl">OTB Used ({otbPct}%)</span>
              </div>
              <div className="nsp-eng-summary-divider" />
              <div className="nsp-eng-summary-kpi">
                <span className="nsp-eng-summary-kpi-val">{gmRate}%</span>
                <span className="nsp-eng-summary-kpi-lbl">Projected GM</span>
              </div>
              <div className="nsp-eng-summary-divider" />
              <div className="nsp-eng-summary-kpi nsp-eng-summary-kpi-scenario">
                <span className="nsp-eng-summary-kpi-lbl">Scenario</span>
                <span className="nsp-eng-summary-kpi-scenario-name">{scopeForm?.scenarioName}</span>
              </div>
            </div>
          </div>
          <div className="nsp-eng-summary-actions">
            <Button variant="ghost" size="medium" icon={<Users size={14} />} iconPlacement="left">
              Inspect Peer Pool &amp; Weights
            </Button>
            <div className="nsp-eng-summary-autoadvance">
              <span className="nsp-eng-summary-autoadvance-txt">
                {collapsing
                  ? "Loading Line Plan…"
                  : `Continuing automatically in ${countdown}s…`}
              </span>
              <Button
                variant="primary"
                size="medium"
                icon={<ArrowRight size={14} />}
                iconPlacement="right"
                disabled={collapsing}
                onClick={() => setCollapsing(true)}
              >
                Continue Now
              </Button>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

// ─── Tier 1 Line Plan ─────────────────────────────────────────────────────────

const GBB_COLORS = { Good: "default", Better: "info", Best: "warning" };

// Donut palettes — disciplined premium hues, one accent family per chart.
const SPECIES_COLORS  = { Oak: "#6366f1", Hickory: "#0ea5e9", Maple: "#f59e0b", Walnut: "#7c3aed" };
const COLORFAM_COLORS = { Natural: "#c9a86a", Grey: "#94a3b8", Dark: "#334155" };
const GBB_MIX_COLORS  = { Good: "#cbd5e1", Better: "#6366f1", Best: "#f59e0b" };

// Compact attribute-distribution donut built on the Impact UI Chart (pie) wrapper.
// Chrome is stripped (no header/toolbar/legend) so three sit cleanly side-by-side;
// the percentage legend is rendered below for a premium, readable layout.
function ReconDonut({ title, data, note }) {
  const total = data.reduce((s, d) => s + d.y, 0) || 1;
  return (
    <div className="nsp-recon-donut">
      <div className="nsp-recon-donut-head">
        <span className="nsp-recon-donut-title">{title}</span>
        {note && <span className="nsp-recon-donut-note">{note}</span>}
        </div>
      <div className="nsp-recon-donut-body">
        <Chart
          graphType="pie"
          cardContainer={false}
          showHeader={false}
          showSwitchButton={false}
          showChartTypeDropdown={false}
          showDownloadButton={false}
          showExpandButton={false}
          height={150}
          chartMarginBottom={6}
          seriesData={[{ name: title, data }]}
          chartOptions={{ backgroundColor: "transparent", spacing: [4, 4, 4, 4] }}
          legendOptions={{ enabled: false }}
          plotOptionsOptions={{
            pie: {
              innerSize: "66%",
              size: "100%",
              borderWidth: 2,
              borderColor: "#ffffff",
              dataLabels: { enabled: false },
            },
          }}
          creditsOptions={{ enabled: false }}
        />
      </div>
      <div className="nsp-recon-legend">
        {data.map(d => (
          <div key={d.name} className="nsp-recon-legend-item">
            <span className="nsp-recon-legend-dot" style={{ background: d.color }} />
            <span className="nsp-recon-legend-name">{d.name}</span>
            <span className="nsp-recon-legend-pct">{Math.round(d.y / total * 100)}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// Compact numeric spinner for BUY QTY — drives live OTB recalculation
// Shared pagination footer for record-style tables (Tier 1 SKU grid, Tier 2
// item rows, etc). Degrades gracefully to a single, disabled-Next page when
// the row count fits within one page — including the 0-row empty state.
function TablePager({ page, pageSize, totalRows, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50], noun = "rows" }) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = totalRows === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const end   = Math.min(clampedPage * pageSize, totalRows);

  return (
    <div className="nsp-pager">
      <div className="nsp-pager-size">
        <span className="nsp-pager-size-lbl">Rows per page</span>
        <FdSelect
          value={String(pageSize)}
          options={pageSizeOptions.map(n => ({ value: String(n), label: String(n) }))}
          onChange={v => onPageSizeChange(Number(v))}
          width={66}
          minWidth={66}
        />
      </div>
      <div className="nsp-pager-info">
        {totalRows === 0 ? `No ${noun}` : `Showing ${start}–${end} of ${totalRows} ${noun}`}
      </div>
      <div className="nsp-pager-nav">
        <button
          type="button"
          className="nsp-pager-btn"
          disabled={clampedPage <= 1}
          onClick={() => onPageChange(clampedPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="nsp-pager-pageof">Page {clampedPage} of {totalPages}</span>
        <button
          type="button"
          className="nsp-pager-btn nsp-pager-btn-next"
          disabled={clampedPage >= totalPages}
          onClick={() => onPageChange(clampedPage + 1)}
          aria-label="Next page"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Shared: cap a scroll region's height to whatever room is actually left
// in the viewport, so only that region scrolls and the page itself never
// has to move. Re-measures on window resize and whenever `watchRef` (an
// ancestor whose size reflects layout changes above/around the anchor,
// e.g. banners appearing) changes size. ─────────────────────────────────────
function useViewportCappedHeight(anchorRef, watchRef, { minHeight = 240 } = {}) {
  const [maxHeight, setMaxHeight] = useState(null);
  useLayoutEffect(() => {
    const anchorEl = anchorRef.current;
    const watchEl = watchRef?.current || anchorEl;
    if (!anchorEl || typeof ResizeObserver === "undefined") return;
    const bottomPad = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--sp-12")
    ) || 48;
    let raf = null;
    const measure = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const top = anchorEl.getBoundingClientRect().top;
        const available = Math.round(window.innerHeight - top - bottomPad);
        setMaxHeight(prev => {
          const next = Math.max(minHeight, available);
          return prev === next ? prev : next;
        });
      });
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(watchEl);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [anchorRef, watchRef, minHeight]);
  return maxHeight;
}

// ─── Tier 2: Glass-Box Financial Override Grid ─────────────────────────────────
function Tier2OverrideGrid({ included, buyQty, drops, locked: globalLock = false, onReport, onSubmitApproved }) {
  // The panel never scrolls — only the grid rows do, capped to whatever
  // room is actually left in the viewport.
  const t2CardRef = useRef(null);
  const t2WrapRef = useRef(null);
  const t2WrapMaxHeight = useViewportCappedHeight(t2WrapRef, t2CardRef, { minHeight: 580 });

  const [monthIdx, setMonthIdx] = useState(0);
  const [wpOverrides, setWpOverrides] = useState({});   // { [skuId]: { [mIdx]: { [metricKey]: value } } }
  const [reasons, setReasons] = useState({});            // { [skuId]: { [mIdx]: { [metricKey]: reasonLabel } } }
  const [rowStatus, setRowStatus] = useState({});        // { [skuId]: "pending" | "accepted" | "overridden" }
  const [scale, setScale] = useState("K");
  const [heatOn, setHeatOn] = useState(true);
  const [showSub, setShowSub] = useState(true);
  const [showVar, setShowVar] = useState(true);
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [visibleMetrics, setVisibleMetrics] = useState(
    () => Object.fromEntries(T2_METRICS.map(m => [m.key, true]))
  );
  const [attrSel, setAttrSel] = useState(
    () => Object.fromEntries(T2_ATTRS.map(a => [a.key, []]))
  );
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);          // { skuId, mIdx, key, rect }
  const [editVal, setEditVal] = useState("");
  const [editReason, setEditReason] = useState("");
  const [likeStore, setLikeStore] = useState("#159");
  const [copiedFrom, setCopiedFrom] = useState(null);

  const historyRef = useRef([{ wpOverrides: {}, rowStatus: {}, reasons: {} }]);
  const histIdxRef = useRef(0);

  const pushHistory = (nextWp, nextStatus, nextReasons) => {
    const snap = { wpOverrides: nextWp, rowStatus: nextStatus, reasons: nextReasons };
    historyRef.current = [...historyRef.current.slice(0, histIdxRef.current + 1), snap];
    histIdxRef.current = historyRef.current.length - 1;
  };
  const applySnap = (snap) => {
    setWpOverrides(snap.wpOverrides);
    setRowStatus(snap.rowStatus);
    setReasons(snap.reasons || {});
  };
  const undo = () => {
    if (histIdxRef.current === 0) return;
    histIdxRef.current -= 1;
    applySnap(historyRef.current[histIdxRef.current]);
  };
  const redo = () => {
    if (histIdxRef.current >= historyRef.current.length - 1) return;
    histIdxRef.current += 1;
    applySnap(historyRef.current[histIdxRef.current]);
  };

  useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      if (e.key === "Escape") setEditing(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const agRows = useMemo(() => {
    const map = {};
    included.forEach(sku => {
      const qty = buyQty[sku.id] ?? sku.target;
      map[sku.id] = buildT2AgMonths(sku, qty, drops[sku.id] || "Drop 1");
    });
    return map;
  }, [included, buyQty, drops]);

  const getAg = (skuId, mIdx, key) => agRows[skuId][mIdx][key];
  const getWp = (skuId, mIdx, key) => {
    const ov = wpOverrides[skuId]?.[mIdx]?.[key];
    return ov !== undefined ? ov : agRows[skuId][mIdx][key];
  };
  const getReason = (skuId, mIdx, key) => reasons[skuId]?.[mIdx]?.[key];
  const isOverridden = (skuId, mIdx, key) => wpOverrides[skuId]?.[mIdx]?.[key] !== undefined;

  // Report overrides upward for the governance / audit trail
  useEffect(() => {
    if (!onReport) return;
    const rows = [];
    included.forEach(sku => {
      const skuOv = wpOverrides[sku.id];
      if (!skuOv) return;
      Object.keys(skuOv).forEach(mIdxStr => {
        const mIdx = Number(mIdxStr);
        Object.keys(skuOv[mIdx]).forEach(key => {
          const metric = T2_METRICS.find(m => m.key === key);
          const ag = agRows[sku.id]?.[mIdx]?.[key];
          const wp = skuOv[mIdx][key];
          rows.push({
            item: sku.description,
            metric: metric?.label || key,
            month: T2_MONTHS[mIdx],
            ag: metric?.kind === "pct" ? `${Number(ag).toFixed(1)}%` : Math.round(ag),
            wp: metric?.kind === "pct" ? `${Number(wp).toFixed(1)}%` : Math.round(wp),
            delta: `${wp - ag > 0 ? "+" : ""}${(wp - ag).toFixed(metric?.kind === "pct" ? 1 : 0)}`,
            reason: reasons[sku.id]?.[mIdx]?.[key] || "—",
          });
        });
      });
    });
    onReport({ rows });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpOverrides, reasons, agRows]);

  // ── Double-click override with required reason code ──
  const openEdit = (e, skuId, mIdx, key) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setEditVal(String(Math.round(getWp(skuId, mIdx, key) * 10) / 10));
    setEditReason(getReason(skuId, mIdx, key) || "");
    setEditing({ skuId, mIdx, key, rect });
  };
  const commitEdit = () => {
    if (!editing) return;
    const { skuId, mIdx, key } = editing;
    const val = Number(editVal);
    const ag = getAg(skuId, mIdx, key);
    if (!Number.isFinite(val) || val === ag) { setEditing(null); return; }  // no real change
    if (!editReason) return;                                                 // reason required
    const nextWp = {
      ...wpOverrides,
      [skuId]: { ...wpOverrides[skuId], [mIdx]: { ...wpOverrides[skuId]?.[mIdx], [key]: val } },
    };
    const nextReasons = {
      ...reasons,
      [skuId]: { ...reasons[skuId], [mIdx]: { ...reasons[skuId]?.[mIdx], [key]: editReason } },
    };
    const nextStatus = { ...rowStatus, [skuId]: "overridden" };
    setWpOverrides(nextWp);
    setReasons(nextReasons);
    setRowStatus(nextStatus);
    pushHistory(nextWp, nextStatus, nextReasons);
    setEditing(null);
  };

  const acceptRow = (skuId) => {
    const nextStatus = { ...rowStatus, [skuId]: "accepted" };
    setRowStatus(nextStatus);
    pushHistory(wpOverrides, nextStatus, reasons);
  };
  const acceptAll = () => {
    const nextStatus = {};
    included.forEach(s => { nextStatus[s.id] = "accepted"; });
    setRowStatus(nextStatus);
    pushHistory(wpOverrides, nextStatus, reasons);
  };
  const acceptSelected = () => {
    if (selected.size === 0) return;
    const nextStatus = { ...rowStatus };
    selected.forEach(id => { nextStatus[id] = "accepted"; });
    setRowStatus(nextStatus);
    pushHistory(wpOverrides, nextStatus, reasons);
    setSelected(new Set());
  };

  // Copy From Like-Store — adopt a mature sister store's financial curve wholesale
  const LIKE_STORES = [
    { value: "#159", label: "#159 Draper, UT" },
    { value: "#144", label: "#144 Reno, NV" },
    { value: "#204", label: "#204 Bozeman, MT" },
  ];
  const copyFromLikeStore = () => {
    const nextStatus = {};
    included.forEach(s => { nextStatus[s.id] = "accepted"; });
    setRowStatus(nextStatus);
    pushHistory(wpOverrides, nextStatus, reasons);
    setCopiedFrom(LIKE_STORES.find(l => l.value === likeStore)?.label || likeStore);
  };

  const attrValues = useMemo(() => {
    const out = {};
    T2_ATTRS.forEach(a => { out[a.key] = [...new Set(included.map(s => s[a.key]))]; });
    return out;
  }, [included]);

  const filteredSKUs = included.filter(sku => {
    const status = rowStatus[sku.id] || "pending";
    if (reviewFilter !== "all" && status !== reviewFilter) return false;
    if (search && !sku.description.toLowerCase().includes(search.toLowerCase()) && !sku.sku.toLowerCase().includes(search.toLowerCase())) return false;
    for (const a of T2_ATTRS) {
      const sel = attrSel[a.key];
      if (sel.length && !sel.includes(sku[a.key])) return false;
    }
    return true;
  });

  const groups = useMemo(() => {
    const map = {};
    filteredSKUs.forEach(sku => { (map[sku.species] = map[sku.species] || []).push(sku); });
    return map;
  }, [filteredSKUs]);

  // ── Pagination (item rows only — group subtotals & grand total always
  // reflect the full filtered set, independent of the current page) ──
  const [t2Page, setT2Page]         = useState(1);
  const [t2PageSize, setT2PageSize] = useState(10);
  useEffect(() => { setT2Page(1); }, [search, reviewFilter, attrSel, t2PageSize]);
  const t2TotalPages   = Math.max(1, Math.ceil(filteredSKUs.length / t2PageSize));
  const t2PageClamped  = Math.min(t2Page, t2TotalPages);
  const pagedFilteredSKUs = useMemo(
    () => filteredSKUs.slice((t2PageClamped - 1) * t2PageSize, t2PageClamped * t2PageSize),
    [filteredSKUs, t2PageClamped, t2PageSize],
  );
  const pagedGroups = useMemo(() => {
    const map = {};
    pagedFilteredSKUs.forEach(sku => { (map[sku.species] = map[sku.species] || []).push(sku); });
    return map;
  }, [pagedFilteredSKUs]);

  const activeMetrics = T2_METRICS.filter(m => visibleMetrics[m.key]);
  const subCount = showVar ? 3 : 2;

  // Dynamic grid template — column count varies with visible metrics + var toggle
  const gridTemplate = useMemo(() => {
    const cols = ["34px", "minmax(220px, 1.5fr)"];
    activeMetrics.forEach(() => { cols.push("94px", "94px"); if (showVar) cols.push("62px"); });
    cols.push("112px");
    return cols.join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMetrics, showVar]);
  const gridMinWidth = 34 + 220 + activeMetrics.length * (94 * 2 + (showVar ? 62 : 0)) + 112;

  // Aggregate a metric across a set of SKUs for the active month (money/units = sum, pct = sales-weighted)
  const aggMetric = (skus, key, kind) => {
    if (kind === "pct") {
      let nAg = 0, dAg = 0, nWp = 0, dWp = 0;
      skus.forEach(s => {
        const wAg = Math.max(0.0001, getAg(s.id, monthIdx, "salesR"));
        const wWp = Math.max(0.0001, getWp(s.id, monthIdx, "salesR"));
        nAg += getAg(s.id, monthIdx, key) * wAg; dAg += wAg;
        nWp += getWp(s.id, monthIdx, key) * wWp; dWp += wWp;
      });
      return { ag: dAg ? nAg / dAg : 0, wp: dWp ? nWp / dWp : 0 };
    }
    let ag = 0, wp = 0;
    skus.forEach(s => { ag += getAg(s.id, monthIdx, key); wp += getWp(s.id, monthIdx, key); });
    return { ag, wp };
  };

  const statusCounts = useMemo(() => {
    const c = { pending: 0, accepted: 0, overridden: 0 };
    included.forEach(sku => { c[rowStatus[sku.id] || "pending"] += 1; });
    return c;
  }, [included, rowStatus]);

  const totalRows = included.length;
  const reviewedCount = statusCounts.accepted + statusCounts.overridden;
  const allReviewed = totalRows > 0 && statusCounts.pending === 0;

  // ── Bulk selection ──
  const filteredIds = filteredSKUs.map(s => s.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const toggleSelectAll = () => setSelected(prev => {
    const n = new Set(prev);
    if (allSelected) filteredIds.forEach(id => n.delete(id));
    else filteredIds.forEach(id => n.add(id));
    return n;
  });
  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const exportCSV = () => {
    const header = ["SKU", "Description", "Dept", ...activeMetrics.flatMap(m => [`${m.label} (Ag)`, `${m.label} (Wp)`]), "Status"];
    const lines = [header.join(",")];
    included.forEach(sku => {
      const vals = activeMetrics.flatMap(m => {
        const ag = getAg(sku.id, monthIdx, m.key);
        const wp = getWp(sku.id, monthIdx, m.key);
        return m.kind === "pct" ? [ag.toFixed(1), Number(wp).toFixed(1)] : [Math.round(ag), Math.round(wp)];
      });
      lines.push([sku.sku, `"${sku.description}"`, sku.species, ...vals, rowStatus[sku.id] || "pending"].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `override-grid-${T2_MONTHS[monthIdx]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const heatClass = (ag, wp) => {
    if (!heatOn) return "";
    const v = pctVar(ag, wp);
    if (v > 2) return "nsp-t2-heat-pos";
    if (v < -2) return "nsp-t2-heat-neg";
    return "";
  };

  // Render Ag / Wp / (Var) cells for a metric on one SKU row → array (no Fragment)
  const renderMetricCells = (sku, m, locked) => {
    const ag = getAg(sku.id, monthIdx, m.key);
    const wp = getWp(sku.id, monthIdx, m.key);
    const over = isOverridden(sku.id, monthIdx, m.key);
    const reason = getReason(sku.id, monthIdx, m.key);
    const cells = [
      <span key={`${m.key}-ag`} className="nsp-t2-td nsp-t2-td-ag">{fmtT2Metric(ag, m.kind, scale)}</span>,
      m.editable ? (
        <span
          key={`${m.key}-wp`}
          className={`nsp-t2-td nsp-t2-td-wp ${over ? "is-over" : ""} ${locked ? "is-locked" : ""}`}
          onDoubleClick={locked ? undefined : (e) => openEdit(e, sku.id, monthIdx, m.key)}
          title={reason ? `Override · ${reason}` : locked ? "Row accepted — locked" : "Double-click to override"}
        >
          {fmtT2Metric(wp, m.kind, scale)}
          {over && <span className="nsp-t2-over-dot" />}
        </span>
      ) : (
        <span key={`${m.key}-wp`} className="nsp-t2-td nsp-t2-td-derived">{fmtT2Metric(wp, m.kind, scale)}</span>
      ),
    ];
    if (showVar) cells.push(
      <span key={`${m.key}-var`} className={`nsp-t2-td nsp-t2-td-var ${heatClass(ag, wp)}`}>{pctVar(ag, wp).toFixed(1)}%</span>
    );
    return cells;
  };

  // Render Ag / Wp / (Var) cells for an aggregated (total / group) row → array
  const renderAggCells = (skus, m, withHeat) => {
    const { ag, wp } = aggMetric(skus, m.key, m.kind);
    const cells = [
      <span key={`${m.key}-ag`} className="nsp-t2-td">{fmtT2Metric(ag, m.kind, scale)}</span>,
      <span key={`${m.key}-wp`} className="nsp-t2-td">{fmtT2Metric(wp, m.kind, scale)}</span>,
    ];
    if (showVar) cells.push(
      <span key={`${m.key}-var`} className={`nsp-t2-td ${withHeat ? heatClass(ag, wp) : ""}`}>{pctVar(ag, wp).toFixed(1)}%</span>
    );
    return cells;
  };

  return (
    <div className="nsp-t2-panel" ref={t2CardRef}>
      {/* Toolbar */}
      <div className="nsp-t2-toolbar">
        <div className="nsp-t2-tb-group">
          <button className="nsp-t2-tb-icon-btn" onClick={undo} disabled={globalLock} title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
          <button className="nsp-t2-tb-icon-btn" onClick={redo} disabled={globalLock} title="Redo (Ctrl+Y)"><Redo2 size={14} /></button>
        </div>
        <div className="nsp-t2-tb-divider" />
        <div className="nsp-t2-tb-group">
          {["full", "K", "M"].map(s => (
            <button key={s} className={`nsp-t2-tb-chip ${scale === s ? "active" : ""}`} onClick={() => setScale(s)}>
              {s === "full" ? "$ full" : `$ ${s}`}
            </button>
          ))}
        </div>
        <div className="nsp-t2-tb-divider" />
        <div className="nsp-t2-tb-group">
          <button className={`nsp-t2-tb-chip ${heatOn ? "active" : ""}`} onClick={() => setHeatOn(v => !v)}><Flame size={12} /> Heat</button>
          <button className={`nsp-t2-tb-chip ${showSub ? "active" : ""}`} onClick={() => setShowSub(v => !v)}>Σ Sub</button>
          <button className={`nsp-t2-tb-chip ${showVar ? "active" : ""}`} onClick={() => setShowVar(v => !v)}>± Var</button>
          <button className="nsp-t2-tb-chip nsp-t2-tb-chip-disabled" disabled title="Coming soon"><Grid3x3 size={12} /> Pivot</button>
        </div>
        <div className="nsp-t2-tb-divider" />
        <div className="nsp-t2-tb-group nsp-t2-tb-copy">
          {copiedFrom
            ? <Badge label={`Copied from ${copiedFrom}`} color="info" variant="subtle" size="small" />
            : <div className="nsp-t2-copy-select"><FdSelect value={likeStore} onChange={setLikeStore} options={LIKE_STORES} disabled={globalLock} /></div>}
          <Button variant="stroke" size="small" icon={<ClipboardList size={13} />} iconPlacement="left" onClick={copyFromLikeStore} disabled={globalLock}>
            Copy From Like-Store
          </Button>
        </div>
        <div className="nsp-t2-tb-spacer" />
        <div className="nsp-t2-tb-group">
          {!globalLock && selected.size > 0 && (
            <Button variant="stroke" size="small" icon={<CheckCheck size={13} />} iconPlacement="left" onClick={acceptSelected}>
              Accept selected ({selected.size})
            </Button>
          )}
          <Button variant="ghost" size="small" icon={<Download size={13} />} iconPlacement="left" onClick={exportCSV}>CSV</Button>
          {!globalLock && (
            <Button variant="primary" size="small" icon={<CheckCheck size={13} />} iconPlacement="left" onClick={acceptAll}>Accept all</Button>
          )}
          </div>
        </div>

      {/* Review progress tracker */}
      <div className="nsp-t2-review-bar">
        <div className="nsp-t2-review-track">
          <div className="nsp-t2-review-fill" style={{ width: `${totalRows ? (reviewedCount / totalRows) * 100 : 0}%` }} />
                </div>
        <span className="nsp-t2-review-count">{reviewedCount}/{totalRows} rows reviewed</span>
        <div className="nsp-t2-review-pills">
          <span className="nsp-t2-pill nsp-t2-pill-over">{statusCounts.overridden} Overridden</span>
          <span className="nsp-t2-pill nsp-t2-pill-acc">{statusCounts.accepted} Accepted</span>
          <span className="nsp-t2-pill nsp-t2-pill-pend">{statusCounts.pending} Pending</span>
              </div>
        <Button
          variant={allReviewed && !globalLock ? "primary" : "ghost"}
          size="small"
          icon={globalLock ? <Lock size={13} /> : <ShieldCheck size={13} />}
          iconPlacement="left"
          disabled={globalLock || !allReviewed || !onSubmitApproved}
          onClick={onSubmitApproved}
        >
          {globalLock ? "Master Plan Locked" : allReviewed ? "Submit Approved Plan" : `Review ${statusCounts.pending} remaining`}
        </Button>
            </div>

      {/* Explanatory hint bar */}
      <div className="nsp-t2-hint">
        <span><b>Ag</b> = agent baseline (read-only)</span>
        <span className="nsp-t2-hint-dot">·</span>
        <span>Double-click a <b>Wp</b> cell to override (reason required)</span>
        <span className="nsp-t2-hint-dot">·</span>
        <span>Right-click for options</span>
        <span className="nsp-t2-hint-dot">·</span>
        <span>Checkbox to bulk-select</span>
            </div>

      {/* Body: left rail + grid */}
      <div className="nsp-t2-body">
        {/* LEFT STICKY RAIL */}
        <aside className="nsp-t2-rail">
          <div className="nsp-t2-rail-search">
            <Search size={13} />
            <input placeholder="Search SKU…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>

          <div className="nsp-t2-rail-sec">
            <div className="nsp-t2-rail-title">Metrics</div>
            <FdSelect
              isMulti
              isWithSelectAll
              isWithSelectedOptionTags
              value={T2_METRICS.filter(m => visibleMetrics[m.key]).map(m => m.key)}
              options={T2_METRICS.map(m => ({ value: m.key, label: m.editable ? m.label : `${m.label} · derived` }))}
              onChange={(vals) => {
                if (!vals || vals.length === 0) return;   // keep ≥1 metric visible
                setVisibleMetrics(Object.fromEntries(T2_METRICS.map(m => [m.key, vals.includes(m.key)])));
              }}
              width="100%"
            />
                    </div>

          {T2_ATTRS.map(a => (
            <div key={a.key} className="nsp-t2-rail-sec">
              <div className="nsp-t2-rail-title">{a.label}</div>
              <FdSelect
                isMulti
                isClearable
                isWithSelectAll
                isWithSelectedOptionTags
                value={attrSel[a.key]}
                options={attrValues[a.key].map(v => ({ value: v, label: v }))}
                onChange={(vals) => setAttrSel(prev => ({ ...prev, [a.key]: vals || [] }))}
                width="100%"
              />
            </div>
          ))}

          <div className="nsp-t2-rail-sec">
            <div className="nsp-t2-rail-title">Review status</div>
            <FdSelect
              value={reviewFilter}
              options={[
                { value: "all",        label: "All rows" },
                { value: "pending",    label: `Pending (${statusCounts.pending})` },
                { value: "overridden", label: `Overridden (${statusCounts.overridden})` },
                { value: "accepted",   label: `Accepted (${statusCounts.accepted})` },
              ]}
              onChange={setReviewFilter}
              width="100%"
            />
              </div>
        </aside>

        {/* MAIN GRID */}
        <div className="nsp-t2-main">
          <div className="nsp-t2-month-select">
            <span className="nsp-t2-month-label">Month</span>
            <FdSelect
              value={String(monthIdx)}
              options={T2_MONTHS.map((m, i) => ({ value: String(i), label: m }))}
              onChange={(v) => setMonthIdx(Number(v))}
              width={150}
              minWidth={150}
            />
              </div>

          <div
            className="nsp-t2-grid-wrap"
            ref={t2WrapRef}
            style={t2WrapMaxHeight ? { maxHeight: `${t2WrapMaxHeight}px` } : undefined}
          >
            <div className="nsp-t2-grid-scroll">
              <div className="nsp-t2-table" style={{ minWidth: `${gridMinWidth}px` }}>
                <div className="nsp-t2-thead" style={{ gridTemplateColumns: gridTemplate }}>
                  <span className="nsp-t2-th-check" />
                  <span className="nsp-t2-th-label" />
                  {activeMetrics.map(m => (
                    <span key={m.key} className="nsp-t2-th-group" style={{ gridColumn: `span ${subCount}` }}>{m.label}</span>
                  ))}
                  <span className="nsp-t2-th-label" />
              </div>
                <div className="nsp-t2-thead-sub" style={{ gridTemplateColumns: gridTemplate }}>
                  <span className="nsp-t2-th-check">
                    <input type="checkbox" checked={allSelected} disabled={globalLock} onChange={toggleSelectAll} aria-label="Select all rows" />
                  </span>
                  <span className="nsp-t2-th-label">{T2_MONTHS[monthIdx]} · Item</span>
                  {activeMetrics.flatMap(m => (showVar ? ["Ag", "Wp", "±%"] : ["Ag", "Wp"]).map((sub, j) => (
                    <span key={`${m.key}-${sub}-${j}`} className="nsp-t2-th-sub">{sub}</span>
                  )))}
                  <span className="nsp-t2-th-label">Status</span>
                </div>

                {/* Grand total */}
                <div className="nsp-t2-row nsp-t2-row-total" style={{ gridTemplateColumns: gridTemplate }}>
                  <span className="nsp-t2-td-check" />
                  <span className="nsp-t2-td-label">Grand total</span>
                  {activeMetrics.flatMap(m => renderAggCells(included, m, false))}
                  <span className="nsp-t2-td-action" />
            </div>

                {Object.entries(pagedGroups).map(([groupName, pagedSkus]) => (
                  <div key={groupName}>
                    {showSub && (
                      <div className="nsp-t2-row nsp-t2-row-group" style={{ gridTemplateColumns: gridTemplate }}>
                        <span className="nsp-t2-td-check" />
                        <span className="nsp-t2-td-label">{groupName}</span>
                        {/* Subtotal always reflects the full filtered group, not just this page */}
                        {activeMetrics.flatMap(m => renderAggCells(groups[groupName] || pagedSkus, m, true))}
                        <span className="nsp-t2-td-action" />
              </div>
                    )}
                    {pagedSkus.map(sku => {
                      const status = rowStatus[sku.id] || "pending";
                      const rowLocked = globalLock || status === "accepted";
                      return (
                        <div key={sku.id} className={`nsp-t2-row nsp-t2-row-item nsp-t2-status-${status}`} style={{ gridTemplateColumns: gridTemplate }}>
                          <span className="nsp-t2-td-check">
                            <input type="checkbox" checked={selected.has(sku.id)} disabled={globalLock} onChange={() => toggleSelect(sku.id)} aria-label={`Select ${sku.sku}`} />
                          </span>
                          <span className="nsp-t2-td-label nsp-t2-td-item-label">
                            <Tooltip title={sku.description} orientation="top" variant="secondary" trigger="hover">
                              <span className="nsp-t2-item-name">{sku.description}</span>
                            </Tooltip>
                          </span>
                          {activeMetrics.flatMap(m => renderMetricCells(sku, m, rowLocked))}
                          <span className="nsp-t2-td-action">
                            {globalLock ? (
                              <Badge label="Locked" color="info" variant="subtle" size="small" />
                            ) : status === "accepted" ? (
                              <Badge label="Accepted" color="success" variant="subtle" size="small" />
                            ) : (
                              <Button variant="ghost" size="small" onClick={() => acceptRow(sku.id)}>Accept</Button>
                            )}
                          </span>
              </div>
                      );
                    })}
            </div>
                ))}

                {filteredSKUs.length === 0 && (
                  <div className="nsp-t2-empty">No rows match this filter.</div>
                )}
              </div>
              </div>
            </div>
            <TablePager
              page={t2PageClamped}
              pageSize={t2PageSize}
              totalRows={filteredSKUs.length}
              onPageChange={setT2Page}
              onPageSizeChange={setT2PageSize}
              noun="SKUs"
            />
            </div>
          </div>

      {/* Double-click override popover (reason required) */}
      {editing && (() => {
        const m = T2_METRICS.find(mm => mm.key === editing.key);
        const agBase = getAg(editing.skuId, editing.mIdx, editing.key);
        return (
          <>
            <div className="nsp-t2-edit-scrim" onMouseDown={() => setEditing(null)} />
            <div
              className="nsp-t2-edit-pop"
              style={{
                top: Math.min(editing.rect.bottom + 6, window.innerHeight - 260),
                left: Math.min(editing.rect.left, window.innerWidth - 288),
              }}
            >
              <div className="nsp-t2-edit-title">Override {m?.label} · {T2_MONTHS[editing.mIdx]}</div>
              <div className="nsp-t2-edit-agline">Agent baseline: <b>{fmtT2Metric(agBase, m.kind, scale)}</b></div>
              <input
                className="nsp-t2-edit-input"
                type="number"
                autoFocus
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitEdit(); }}
              />
              <div className="nsp-t2-edit-reason-label">Reason code <span className="nsp-t2-req">required</span></div>
              <FdSelect
                value={editReason}
                options={T2_REASON_CODES.map(r => ({ value: r, label: r }))}
                onChange={setEditReason}
                width="100%"
              />
              <div className="nsp-t2-edit-actions">
                <Button variant="ghost" size="small" onClick={() => setEditing(null)}>Cancel</Button>
                <Button variant="primary" size="small" disabled={!editReason} onClick={commitEdit}>Save override</Button>
            </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ─── Tier 3: Weekly WSSI Buy Quantification Engine ─────────────────────────────
function Tier3WssiEngine({ included, locked = false }) {
  // The panel never scrolls — only the metric grid does, capped to
  // whatever room is actually left in the viewport.
  const t3CardRef = useRef(null);
  const t3ScrollRef = useRef(null);
  const t3ScrollMaxHeight = useViewportCappedHeight(t3ScrollRef, t3CardRef, { minHeight: 420 });

  const [skuId, setSkuId] = useState(() => included[0]?.id);
  const sku = included.find(s => s.id === skuId) || included[0];

  const [weekTypes, setWeekTypes] = useState(WSSI_DEFAULT_WEEK_TYPES);
  const [discounts, setDiscounts] = useState(WSSI_DEFAULT_DISCOUNTS);
  const [elasticity, setElasticity] = useState(3);
  const baseDemandDefault = useMemo(() => Math.max(15, Math.round((sku?.aps || 8) * 3)), [sku]);
  const [baseDemand, setBaseDemand] = useState(baseDemandDefault);

  useEffect(() => { setBaseDemand(baseDemandDefault); }, [baseDemandDefault]);

  const wssi = useMemo(() => (sku ? computeWSSI(sku, { discounts, elasticity, baseDemand }) : null), [sku, discounts, elasticity, baseDemand]);

  const setWeekType = (i, v) => setWeekTypes(prev => prev.map((w, idx) => (idx === i ? v : w)));
  const setDiscount = (i, v) => setDiscounts(prev => prev.map((d, idx) => (idx === i ? v : d)));

  if (!sku || !wssi) {
    return <EmptyState title="No SKUs available" description="Include at least one SKU in Tier 1 to model its weekly buy plan." icon={<Layers size={28} />} />;
  }

  const weeks = Array.from({ length: WSSI_WEEKS }, (_, i) => i);

  const metricRows = [
    { key: "type", label: "Week Type", editable: true, render: t => (
      <FdSelect value={weekTypes[t]} options={[{ value: "FP", label: "FP" }, { value: "PP", label: "PP" }, { value: "MD", label: "MD" }]} onChange={v => setWeekType(t, v)} width={66} minWidth={66} disabled={locked} />
    ) },
    { key: "disc", label: "Discount %", editable: true, render: t => (
      <input className="nsp-t3-input" type="number" min={0} max={90} value={discounts[t]} disabled={locked}
        onChange={e => setDiscount(t, Math.max(0, Math.min(90, Number(e.target.value) || 0)))} />
    ) },
    { key: "asp", label: "ASP", render: t => `$${wssi.asp[t].toFixed(0)}` },
    { key: "cp", label: "CP", render: () => `$${sku.cost.toFixed(0)}` },
    { key: "gm", label: "Gross Margin %", render: t => `${wssi.gmPct[t].toFixed(1)}%`, warn: t => wssi.gmPct[t] < 40 },
    { key: "el", label: "Elasticity Coeff", render: () => elasticity },
    { key: "tsu", label: "Total Sales Unit", render: t => wssi.totalSalesUnit[t].toFixed(1), highlight: true },
    { key: "wsb", label: "Weekly Sales (Base)", render: () => baseDemand },
    { key: "lift", label: "Sales Lift", render: t => wssi.salesLift[t].toFixed(1) },
    { key: "oh", label: "On Hand", render: t => wssi.onHand[t].toFixed(1) },
    { key: "woct", label: "WOC (Target Wks)", render: () => WSSI_WOC_TARGET },
    { key: "wocu", label: "WOC Units", render: t => wssi.wocUnits[t].toFixed(1) },
    { key: "ps", label: "Presentation Stock", render: () => WSSI_PRESENTATION_STOCK },
    { key: "teoh", label: "Target EOH", render: t => wssi.targetEOH[t].toFixed(1) },
    { key: "intake", label: "Intake (Recommended PO)", render: t => wssi.intake[t].toFixed(1), highlight: true },
    { key: "aeoh", label: "Actual EOH", render: t => wssi.actualEOH[t].toFixed(1) },
    { key: "st", label: "Sell Thru % (Calc)", render: t => `${wssi.sellThru[t].toFixed(1)}%` },
    { key: "wos", label: "WOS (Calc)", render: t => wssi.wosCalc[t].toFixed(2) },
  ];

  return (
    <div className="nsp-t3-panel" ref={t3CardRef}>
      <div className="nsp-t3-header">
        <div className="nsp-t3-header-left">
          <div className="nsp-t3-header-icon"><Layers size={15} /></div>
          <div>
            <div className="nsp-t3-title">Weekly Buy Quantification Engine</div>
            <div className="nsp-t3-sub">W1–W10 opening lifecycle · Store-Item-Week retail math</div>
              </div>
          </div>
        <FdSelect
          value={skuId}
          options={included.map(s => ({ value: s.id, label: `${s.sku} · ${s.description}` }))}
          onChange={setSkuId}
          width={320}
        />
            </div>

      <div className="nsp-t3-controls">
        <div className="nsp-t3-ctrl">
          <span className="nsp-t3-ctrl-label">Elasticity Coefficient</span>
          <input className="nsp-t3-input nsp-t3-input-sm" type="number" step="0.5" min={0} disabled={locked}
            value={elasticity} onChange={e => setElasticity(Number(e.target.value) || 0)} />
            </div>
        <div className="nsp-t3-ctrl">
          <span className="nsp-t3-ctrl-label">Weekly Base Demand (units)</span>
          <input className="nsp-t3-input nsp-t3-input-sm" type="number" min={1} disabled={locked}
            value={baseDemand} onChange={e => setBaseDemand(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="nsp-t3-ctrl-hint">
          <AlertTriangle size={12} />
          Editing Week Type, Discount%, Elasticity, or Base Demand recalculates ASP → GM% → Sales Lift → Intake → EOH live.
          </div>
        </div>

      <div
        className="nsp-t3-table-scroll"
        ref={t3ScrollRef}
        style={t3ScrollMaxHeight ? { maxHeight: `${t3ScrollMaxHeight}px` } : undefined}
      >
        <div className="nsp-t3-table">
          <div className="nsp-t3-row nsp-t3-row-head">
            <span className="nsp-t3-td-label">Metric</span>
            {weeks.map(t => <span key={t} className="nsp-t3-th">W{t + 1}</span>)}
        </div>
          {metricRows.map(row => (
            <div key={row.key} className={`nsp-t3-row ${row.highlight ? "nsp-t3-row-highlight" : ""} ${row.editable ? "nsp-t3-row-editable" : ""}`}>
              <span className="nsp-t3-td-label">{row.label}</span>
              {weeks.map(t => (
                <span key={t} className={`nsp-t3-td ${row.warn && row.warn(t) ? "nsp-eng-warn" : ""}`}>{row.render(t)}</span>
              ))}
      </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tier1LinePlan({ scopeForm, store, onReset, onBack, onSaveScenario, initialSnapshot, recoInsights = false }) {
  const stance = scopeForm?.stance || "balanced";

  // ── Stacked sticky header ──
  // Title bar + context bar, the tab strip, and the KPI summary (health
  // banner + health cards) all freeze in a stack while only the SKU table
  // scrolls beneath. Each layer's height is content-dependent (long
  // scenario names, wrapped buttons, etc.), so heights are measured live
  // with ResizeObserver rather than hardcoded, and fed down as CSS vars.
  const stickyHeadRef = useRef(null);
  const tabsWrapRef = useRef(null);
  const [tabNavOffset, setTabNavOffset] = useState(112);
  const [kpiStickyOffset, setKpiStickyOffset] = useState(156);
  useLayoutEffect(() => {
    const headEl = stickyHeadRef.current;
    const tabsEl = tabsWrapRef.current;
    if (!headEl || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const headH = headEl.offsetHeight;
      setTabNavOffset(headH);
      const tabStripEl = tabsEl?.querySelector(".nsp-t1-tabstrip");
      const tabStripH = tabStripEl ? tabStripEl.getBoundingClientRect().height : 36;
      // Flush against the tab strip's own stuck bottom edge — any gap here
      // is unfilled by either sticky layer, letting scrolled-past content
      // flash through for a frame.
      setKpiStickyOffset(headH + Math.ceil(tabStripH));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headEl);
    if (tabsEl) ro.observe(tabsEl);
    return () => ro.disconnect();
  }, []);

  // The card itself never scrolls — only the SKU table does, capped to
  // whatever vertical room is actually left below it in the viewport.
  const cardRef = useRef(null);
  const tableWrapRef = useRef(null);
  // Floor is generous enough to comfortably fit a full 10-row page
  // (header + rows + pager) without needing its own inner scrollbar on
  // typical viewports — the live viewport-fit calc still wins when there's
  // even more room to give it.
  // Floor kept modest so the wrap always fits the viewport below the (now
  // taller) frozen header — the live viewport-fit calc gives it more room
  // whenever there is any, and the rows scroll internally with the pager
  // pinned directly beneath them. A larger floor here would force the wrap
  // past the fold, hiding rows behind the sticky header.
  const tableMaxHeight = useViewportCappedHeight(tableWrapRef, cardRef, { minHeight: 320 });

  // Merchant-introduced placeholder options (Existing Store flow, Step 3) — net-new
  // items with no sales history that the merchant adds to the line for upcoming
  // collections. Kept in local state so they merge into the scored pool below.
  const [extraSKUs, setExtraSKUs] = useState([]);

  // Score + enrich every candidate SKU (static per scope, + any placeholders)
  const scoredSKUs = useMemo(() => [...SOLID_PREFINISHED_CANDIDATES, ...extraSKUs].map(sku => {
    const score = computeSKUScore(sku);
    const enriched = {
      ...sku,
      score,
      rec:          computeAgentRec(sku, score),
      mktPotential: computeMktPotential(sku),
      target:       computeTargetBuyQty(sku, stance),
      aps:          computeAPS(sku),
      st:           computeST(sku),
      mandatory:    isMandatory(sku),
    };
    // Existing Store Reco decision-support fields (harmless when unused).
    enriched.existingReco = computeExistingReco(enriched, score);
    enriched.explain      = computeExplainability(enriched);
    enriched.proMix       = computeProMix(enriched);
    return enriched;
  }).sort((a, b) => b.mktPotential - a.mktPotential), [stance, extraSKUs]);

  // ── Merchant assortment actions (Existing Store flow) ──
  // Every option carries an Add / Keep / Drop action (default = AI recommendation).
  // "drop" removes it from the working plan so OTB / margin / sales recompute live.
  const [recoActions, setRecoActions] = useState(() => initialSnapshot?.tier1?.recoActions || {});
  const effAction = (s) => recoActions[s.id] || s.existingReco || "keep";
  const included = useMemo(
    () => scoredSKUs.filter(s =>
      recoInsights ? (recoActions[s.id] || s.existingReco || "keep") !== "drop"
                   : s.rec === "add"),
    [scoredSKUs, recoActions, recoInsights],
  );

  // ── Line-plan filter bar (Existing Store flow) — borrowed from the retired
  //    Financial-Plan-Reconciliation tab: search + attribute chips. Filters the
  //    full candidate pool so the merchant can look products up and add them. ──
  const [f_search, setFSearch] = useState("");
  const [f_attr, setFAttr] = useState(() => Object.fromEntries(T2_ATTRS.map(a => [a.key, []])));
  const t1AttrValues = useMemo(() => {
    const out = {};
    T2_ATTRS.forEach(a => { out[a.key] = [...new Set(scoredSKUs.map(s => s[a.key]))]; });
    return out;
  }, [scoredSKUs]);
  const activeFilterCount = T2_ATTRS.reduce((n, a) => n + (f_attr[a.key]?.length ? 1 : 0), 0) + (f_search ? 1 : 0);
  const clearFilters = () => { setFSearch(""); setFAttr(Object.fromEntries(T2_ATTRS.map(a => [a.key, []]))); };

  // ── Placeholder SKU introduction (Existing Store flow, Step 3) ──
  // Upcoming items without sales history. Created via the modal below, appended
  // to the scored pool, and defaulted to an "Add" action so they enter the plan.
  const PH_BLANK = { description: "", species: "Oak", finish: "Wirebrushed", width: '5"', retail: "", cost: "", launchDate: "" };
  const [phOpen, setPhOpen] = useState(false);
  const [phForm, setPhForm] = useState(PH_BLANK);
  const phValid = phForm.description.trim() && Number(phForm.retail) > 0 && Number(phForm.cost) >= 0 && Number(phForm.cost) < Number(phForm.retail);
  const addPlaceholder = () => {
    if (!phValid) return;
    const retail = Number(phForm.retail);
    const cost   = Number(phForm.cost);
    const id  = `PH-${Date.now().toString(36)}`;
    const item = {
      id, sku: `NEW-${String(extraSKUs.length + 1).padStart(3, "0")}`,
      description: phForm.description.trim(),
      species: phForm.species, finish: phForm.finish, width: phForm.width,
      retail, cost, margin: Math.max(0, (retail - cost) / retail),
      lifecycle: "NPI", peerVelocity: 0, returnRate: 0, climateFit: 0.82,
      conflictFlag: null, gbbTier: "Better", cartonSqft: 20,
      launchDate: phForm.launchDate || null, endDate: null,
      isPlaceholder: true,
    };
    setExtraSKUs(prev => [...prev, item]);
    setRecoActions(prev => ({ ...prev, [id]: "add" }));   // placeholders enter the plan
    setPhForm(PH_BLANK);
    setPhOpen(false);
    setT1Page(1);
  };
  const t1Filtered = useMemo(() => {
    if (!recoInsights) return scoredSKUs;
    const q = f_search.trim().toLowerCase();
    return scoredSKUs.filter(s => {
      if (q && !`${s.description} ${s.sku}`.toLowerCase().includes(q)) return false;
      for (const a of T2_ATTRS) {
        const sel = f_attr[a.key];
        if (sel && sel.length && !sel.includes(s[a.key])) return false;
      }
      return true;
    });
  }, [scoredSKUs, recoInsights, f_search, f_attr]);

  // ── Line-plan grid pagination (over the filtered source) ──
  const [t1Page, setT1Page]         = useState(1);
  const [t1PageSize, setT1PageSize] = useState(10);
  useEffect(() => { setT1Page(1); }, [t1PageSize]);
  useEffect(() => { setT1Page(1); }, [f_search, f_attr]);
  const t1TotalPages  = Math.max(1, Math.ceil(t1Filtered.length / t1PageSize));
  const t1PageClamped = Math.min(t1Page, t1TotalPages);
  const pagedSKUs = useMemo(
    () => t1Filtered.slice((t1PageClamped - 1) * t1PageSize, t1PageClamped * t1PageSize),
    [t1Filtered, t1PageClamped, t1PageSize],
  );

  // ── Row action + multi-select helpers (Existing Store flow) ──
  const [selRows, setSelRows] = useState(() => new Set());
  const setAction = (id, action) => setRecoActions(prev => ({ ...prev, [id]: action }));
  const setActionForSelected = (action) => {
    setRecoActions(prev => { const next = { ...prev }; selRows.forEach(id => { next[id] = action; }); return next; });
    setSelRows(new Set());
  };
  const toggleSel = (id) => setSelRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelRows(new Set());
  const setPageSelected = (on) => setSelRows(prev => {
    const n = new Set(prev);
    pagedSKUs.forEach(s => { if (on) n.add(s.id); else n.delete(s.id); });
    return n;
  });
  const pageSelCount = pagedSKUs.filter(s => selRows.has(s.id)).length;
  const pageAllSel   = pagedSKUs.length > 0 && pageSelCount === pagedSKUs.length;
  const pageSomeSel  = pageSelCount > 0 && !pageAllSel;
  const droppedCount = useMemo(
    () => scoredSKUs.filter(s => (recoActions[s.id] || s.existingReco) === "drop").length,
    [scoredSKUs, recoActions],
  );

  // ── Editable state (seeded from a re-opened snapshot when present) ──
  const [activeTier, setActiveTier] = useState("tier1");
  const [reconOpen, setReconOpen] = useState(false);
  const [tier1Finalized, setTier1Finalized] = useState(false);
  const [drops, setDrops] = useState(() => initialSnapshot?.tier1?.drops || {});
  const [buyQty, setBuyQty] = useState(() => {
    if (initialSnapshot?.tier1?.buyQty) return initialSnapshot.tier1.buyQty;
    const seed = {};
    scoredSKUs.forEach(s => { if (s.rec === "add") seed[s.id] = computeWssiIntakeTotal(s); });
    return seed;
  });

  // ── Working guardrail caps (reconfigurable; drive Tier-1 reconciliation math) ──
  const [constraints, setConstraints] = useState(() => initialSnapshot?.constraints || { ...CONSTRAINTS_381 });

  // ── Reconfigure studios (Location & Peer Cluster + Enterprise Constraints) ──
  const [clusterCfg, setClusterCfg] = useState(() =>
    initialSnapshot?.clusterCfg || { ...DEFAULT_CLUSTER_CFG, peers: DEFAULT_CLUSTER_CFG.peers.map(p => ({ ...p })) });
  const [reconfigOpen, setReconfigOpen] = useState(false);
  const [reconfigTab, setReconfigTab]   = useState("cluster");   // cluster | constraints
  const [constraintCat, setConstraintCat] = useState("financial"); // financial | space | brand
  const [rerunning, setRerunning]       = useState(false);
  const [newVersionToggle, setNewVersionToggle] = useState(false);
  const [addPeerOpen, setAddPeerOpen]   = useState(false);
  const [peerFilters, setPeerFilters]   = useState({ format: "all", market: "all" });
  const [compare, setCompare]           = useState(null);        // { v1, v2 } for side-by-side banner
  const regionLabel = (v) => (REGION_OPTIONS.find(r => r.value === v) || REGION_OPTIONS[0]).label;

  // ── Scenario / sign-off / lock state ──
  const scenarioIdRef = useRef(initialSnapshot?.id || `SCN-${store.id}-${Date.now().toString(36)}`);
  const [version, setVersion]     = useState(initialSnapshot?.version || 1);
  const [locked, setLocked]       = useState(initialSnapshot?.status === "approved");
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [signOffNotes, setSignOffNotes] = useState(initialSnapshot?.signOffNotes || "");
  const [auditRecord, setAuditRecord] = useState(initialSnapshot?.audit || null);
  const [auditOpen, setAuditOpen]  = useState(!!initialSnapshot?.audit);
  const [justSaved, setJustSaved]  = useState(false);
  const [tier2Report, setTier2Report] = useState(null);   // { rows:[{sku,metric,month,ag,wp,reason}] }
  const savedTickRef = useRef(null);

  // ── Live aggregates (recompute whenever buyQty / drops change) ──
  const agg = useMemo(() => {
    let otbUsed = 0, alignSum = 0, below = 0, marginNum = 0, marginDen = 0;
    included.forEach(s => {
      const q = buyQty[s.id] ?? s.target;
      otbUsed   += q * s.cost;
      const a    = s.target > 0 ? 1 - Math.min(1, Math.abs(q - s.target) / s.target) : 1;
      alignSum  += a;
      if (q < s.target) below += 1;
      marginNum += s.margin * q;
      marginDen += q;
    });
    const dropSet = new Set(included.map(s => drops[s.id] || "Drop 1"));
    return {
      otbUsed,
      otbRemaining: constraints.otbBudget - otbUsed,
      exceeded:     otbUsed > constraints.otbBudget,
      otbPct:       Math.min(100, Math.round(otbUsed / constraints.otbBudget * 100)),
      alignmentPct: included.length ? Math.round((alignSum / included.length) * 100) : 100,
      belowCount:   below,
      wpAssorted:   included.length,
      dropsCount:   dropSet.size,
      mandatoryCount: included.filter(s => s.mandatory).length,
      blendedMargin:  marginDen ? marginNum / marginDen : 0,
    };
  }, [included, buyQty, drops, constraints]);

  const marginGap = agg.blendedMargin - constraints.marginFloor;

  // Close the reconciliation drawer on Escape for a polished slide-over feel.
  useEffect(() => {
    if (!reconOpen) return;
    const onKey = e => { if (e.key === "Escape") setReconOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reconOpen]);

  const otbBudgetK = (constraints.otbBudget / 1000).toFixed(1);
  const otbRemainK = (agg.otbRemaining / 1000).toFixed(1);
  const otbCommittedK = (agg.otbUsed / 1000).toFixed(1);

  // ── Reconciliation dashboard aggregates (space, attribute mix, depth/breadth,
  //    hierarchy roll-up) — all derived from the same live assorted set + buy qty. ──
  const recon = useMemo(() => {
    const { good, better, best, bays, sqftPerBay, linearFtPerBay } = constraints;

    // Physical space vs. capital
    const baysUsed = agg.wpAssorted;
    const space = {
      baysUsed, baysMax: bays,
      overCapacity: baysUsed > bays,
      baysPct:      Math.min(100, Math.round(baysUsed / bays * 100)),
      sqftUsed:     baysUsed * sqftPerBay, sqftMax: bays * sqftPerBay,
      linearFtUsed: baysUsed * linearFtPerBay, linearFtMax: bays * linearFtPerBay,
    };

    // Attribute distribution (by option count across assorted SKUs)
    const bySpecies = {}, byColor = {}, byGBB = { Good: 0, Better: 0, Best: 0 };
    let totalUnits = 0;
    included.forEach(s => {
      const q = buyQty[s.id] ?? s.target;
      totalUnits += q;
      bySpecies[s.species]     = (bySpecies[s.species]     || 0) + 1;
      byColor[s.colorFamily]   = (byColor[s.colorFamily]   || 0) + 1;
      if (byGBB[s.gbbTier] !== undefined) byGBB[s.gbbTier] += 1;
    });
    const n = included.length || 1;
    const gbbPct    = { Good: Math.round(byGBB.Good / n * 100), Better: Math.round(byGBB.Better / n * 100), Best: Math.round(byGBB.Best / n * 100) };
    const gbbTarget = { Good: good, Better: better, Best: best };
    const gbbBalanced = Math.abs(gbbPct.Good - good) <= 8 && Math.abs(gbbPct.Better - better) <= 8 && Math.abs(gbbPct.Best - best) <= 8;

    // Depth & breadth (mirrors the old Step-4 strip; units now WSSI-derived)
    const breadth      = agg.wpAssorted;
    const avgUnits     = breadth ? Math.round(totalUnits / breadth) : 0;
    const expectedTurn = agg.blendedMargin > 0 ? (agg.blendedMargin * 8).toFixed(1) : "—";

    // Hierarchical roll-up by Category (product class = species class)
    const groups = {};
    included.forEach(s => {
      const key = s.productClass;
      if (!groups[key]) groups[key] = { category: key, species: s.species, options: 0, otbCommitted: 0 };
      const q = buyQty[s.id] ?? s.target;
      groups[key].options      += 1;
      groups[key].otbCommitted += q * s.cost;
    });
    const rollup = Object.values(groups)
      .map(g => ({ ...g, bays: g.options, sqft: g.options * sqftPerBay }))
      .sort((a, b) => b.otbCommitted - a.otbCommitted);
    const rollupTotal = { options: agg.wpAssorted, otbCommitted: agg.otbUsed, bays: baysUsed, sqft: space.sqftUsed };

    return {
      otbStatus: agg.otbRemaining >= 0 ? "Surplus" : "Deficit",
      space,
      mix: { bySpecies, byColor, byGBB, gbbPct, gbbTarget, gbbBalanced },
      depthBreadth: { breadth, avgUnits, totalUnits, expectedTurn },
      rollup, rollupTotal,
    };
  }, [included, buyQty, agg, constraints]);

  // ── Reconcile & Approve — OTB financial roll-up (Existing Store flow) ──
  // Aggregates the working plan to the Class level and reconciles it against the
  // enterprise financial budgets: Open-To-Buy receipt $ (hard cap), Gross Margin %
  // (floor), and the Sales Plan of record ($ and units, derived from the AI
  // baseline target buys). Each headline flags a red breach when a budget is broken.
  const reconcileModel = useMemo(() => {
    const groups = {};
    let recWk = 0, salesWkU = 0, salesWk$ = 0, gmNum = 0, gmDen = 0;   // working plan
    let salesBudgetU = 0, salesBudget$ = 0;                            // AI plan of record
    included.forEach(s => {
      const q       = buyQty[s.id] ?? s.target;
      const stf     = (s.st || 0) / 100;
      const sUnits  = q * stf;                 // projected sell-through units
      const sDollars = sUnits * s.retail;      // projected retail sales $
      const recDollars = q * s.cost;           // receipt (OTB) cost $
      recWk    += recDollars;
      salesWkU += sUnits;
      salesWk$ += sDollars;
      gmNum    += s.margin * sDollars;
      gmDen    += sDollars;
      // Enterprise sales budget = AI-recommended target buys at plan sell-through.
      const tUnits = s.target * stf;
      salesBudgetU += tUnits;
      salesBudget$ += tUnits * s.retail;

      const key = s.productClass;
      if (!groups[key]) {
        groups[key] = {
          cls: key, dept: s.department, sub: s.subDepartment, species: s.species,
          options: 0, recUnits: 0, recDollars: 0, salesUnits: 0, salesDollars: 0,
          gmNum: 0, gmDen: 0,
        };
      }
      const g = groups[key];
      g.options      += 1;
      g.recUnits     += q;
      g.recDollars   += recDollars;
      g.salesUnits   += sUnits;
      g.salesDollars += sDollars;
      g.gmNum        += s.margin * sDollars;
      g.gmDen        += sDollars;
    });

    const rows = Object.values(groups).map(g => ({
      cls: g.cls, dept: g.dept, sub: g.sub, species: g.species,
      options: g.options,
      recUnits: g.recUnits,
      recDollars: g.recDollars,
      salesUnits: Math.round(g.salesUnits),
      salesDollars: g.salesDollars,
      gm: g.gmDen ? g.gmNum / g.gmDen : 0,
      otbShare: recWk ? g.recDollars / recWk : 0,
    })).sort((a, b) => b.recDollars - a.recDollars);

    const gm         = gmDen ? gmNum / gmDen : agg.blendedMargin;
    const otbBudget  = constraints.otbBudget;
    const salesVar$  = salesWk$ - salesBudget$;
    const salesVarPct = salesBudget$ ? salesVar$ / salesBudget$ : 0;

    return {
      rows,
      total: {
        options: included.length,
        recUnits: rows.reduce((s, r) => s + r.recUnits, 0),
        recDollars: recWk,
        salesUnits: Math.round(salesWkU),
        salesDollars: salesWk$,
        gm,
      },
      kpi: {
        receipt: {
          value: recWk, budget: otbBudget,
          remaining: otbBudget - recWk,
          pct: Math.min(100, Math.round(recWk / Math.max(otbBudget, 1) * 100)),
          breach: recWk > otbBudget,
        },
        gm: {
          value: gm, floor: constraints.marginFloor,
          pct: Math.min(100, Math.round(gm / Math.max(constraints.marginFloor, 0.01) * 100)),
          breach: gm < constraints.marginFloor,
        },
        sales: {
          dollars: salesWk$, units: Math.round(salesWkU),
          budgetDollars: salesBudget$, budgetUnits: Math.round(salesBudgetU),
          varPct: salesVarPct,
          pct: Math.min(100, Math.round(salesWk$ / Math.max(salesBudget$, 1) * 100)),
          breach: salesVarPct < -0.03,   // under the sales plan of record by > 3%
        },
      },
    };
  }, [included, buyQty, constraints, agg]);

  const anyBreach = reconcileModel.kpi.receipt.breach || reconcileModel.kpi.gm.breach || reconcileModel.kpi.sales.breach;

  // ── Health detail cards (fed from live aggregates) ──
  const healthCards = [
    {
      label: "OTB Budget",
      value: `$${(agg.otbUsed / 1000).toFixed(1)}k`,
      sub:   `of $${otbBudgetK}k`,
      pct:   agg.otbPct,
      grade: agg.exceeded ? "fail" : "pass",
      icon:  <Activity size={14} />,
    },
    {
      label: "Blended Margin",
      value: `${(agg.blendedMargin * 100).toFixed(1)}%`,
      sub:   `floor ${(constraints.marginFloor * 100).toFixed(0)}%`,
      pct:   Math.min(100, Math.round(agg.blendedMargin / constraints.marginFloor * 100)),
      grade: marginGap >= 0 ? "pass" : "fail",
      icon:  <TrendingUp size={14} />,
    },
    {
      label: "Bays Used",
      value: `${recon.space.baysUsed}`,
      sub:   `of ${constraints.bays} bays`,
      pct:   recon.space.baysPct,
      grade: recon.space.overCapacity ? "fail" : "pass",
      icon:  <Grid3x3 size={14} />,
    },
    {
      label: "GBB Mix",
      value: `${recon.mix.gbbPct.Good}/${recon.mix.gbbPct.Better}/${recon.mix.gbbPct.Best}`,
      sub:   `tgt ${recon.mix.gbbTarget.Good}/${recon.mix.gbbTarget.Better}/${recon.mix.gbbTarget.Best}`,
      pct:   100,
      grade: Math.abs(recon.mix.gbbPct.Good - recon.mix.gbbTarget.Good) <= 8 ? "pass" : "fail",
      icon:  <Layers size={14} />,
    },
  ];

  // ── Scenario snapshot + sign-off / governance ──
  const MERCHANT = { name: "Jordan Merchant", role: "Category Merchant" };

  const buildMetrics = () => ({
    skuCount:      agg.wpAssorted,
    otbUsed:       agg.otbUsed,
    otbBudget:     constraints.otbBudget,
    blendedMargin: agg.blendedMargin,
    alignment:     agg.alignmentPct,
  });

  const buildSnapshot = (status, extra = {}) => ({
    id:           scenarioIdRef.current,
    name:         scopeForm.scenarioName,
    storeId:      store.id,
    scope:        scopeForm,
    status,
    version:      extra.version ?? version,
    updatedAt:    Date.now(),
    metrics:      buildMetrics(),
    tier1:        { drops, buyQty, recoActions },
    constraints:  extra.constraints ?? constraints,
    clusterCfg:   extra.clusterCfg ?? clusterCfg,
    signOffNotes: extra.signOffNotes ?? signOffNotes,
    audit:        extra.audit ?? auditRecord,
  });

  const handleSaveScenario = () => {
    onSaveScenario?.(buildSnapshot(locked ? "approved" : "draft"));
    setJustSaved(true);
    clearTimeout(savedTickRef.current);
    savedTickRef.current = setTimeout(() => setJustSaved(false), 2200);
  };

  // Override history rows for the audit trail: Tier-1 buy deviations + Tier-2 reason-coded overrides
  const overrideRows = useMemo(() => {
    const rows = [];
    included.forEach(s => {
      const q = buyQty[s.id] ?? s.target;
      if (q !== s.target) {
        rows.push({
          id: `t1-${s.id}`,
          tier: "Tier 1",
          item: s.description,
          field: "Buy Qty",
          baseline: `${s.target}`,
          final: `${q}`,
          delta: `${q - s.target > 0 ? "+" : ""}${q - s.target}`,
          reason: "Manual buy adjustment",
        });
      }
    });
    (tier2Report?.rows || []).forEach((r, i) => {
      rows.push({
        id: `t2-${i}`,
        tier: "Tier 2",
        item: r.item,
        field: `${r.metric} · ${r.month}`,
        baseline: r.ag,
        final: r.wp,
        delta: r.delta,
        reason: r.reason,
      });
    });
    return rows;
  }, [included, buyQty, tier2Report]);

  const confirmSignOff = () => {
    if (!signOffNotes.trim()) return;
    const audit = {
      merchant: MERCHANT,
      timestamp: Date.now(),
      notes: signOffNotes.trim(),
      overrides: overrideRows,
      settings: {
        peerWeights: { Structure: clusterCfg.weights.structure, Market: clusterCfg.weights.market, "Category Signal": clusterCfg.weights.category },
        region: regionLabel(clusterCfg.region),
        exclusions: clusterCfg.peers.filter(p => !p.included).map(p => `${p.id} ${p.loc}`).join(", ") || "None (all peers in pool retained)",
        caps: {
          otbBudget: constraints.otbBudget,
          marginFloor: constraints.marginFloor,
          maxSKUs: constraints.maxSKUs,
        },
      },
      metrics: buildMetrics(),
    };
    setAuditRecord(audit);
    setLocked(true);
    setAuditOpen(true);
    setSignOffOpen(false);
    onSaveScenario?.(buildSnapshot("approved", { audit, signOffNotes: signOffNotes.trim() }));
  };

  const createVariant = () => {
    const nextVersion = version + 1;
    scenarioIdRef.current = `SCN-${store.id}-${Date.now().toString(36)}`;
    setVersion(nextVersion);
    setLocked(false);
    setAuditRecord(null);
    setAuditOpen(false);
    setSignOffNotes("");
    setTier1Finalized(false);
    setActiveTier("tier1");
    onSaveScenario?.(buildSnapshot("draft", { version: nextVersion, audit: null, signOffNotes: "" }));
  };

  // ── Reconfigure: open / modification tracker / edits / revert / retrigger ──
  const reconfigBaselineRef = useRef(null);
  const openReconfigure = () => {
    reconfigBaselineRef.current = {
      constraints: { ...constraints },
      clusterCfg:  { ...clusterCfg, weights: { ...clusterCfg.weights }, peers: clusterCfg.peers.map(p => ({ ...p })) },
      version,
      metrics: buildMetrics(),
    };
    setNewVersionToggle(locked);   // locked baselines always fork a new version
    setReconfigTab("cluster");
    setReconfigOpen(true);
  };

  const fmtMoneyK = (n) => `$${(n / 1000).toFixed(0)}k`;
  const clusterMods = useMemo(() => {
    const m = [];
    const d = DEFAULT_CLUSTER_CFG;
    if (clusterCfg.region !== d.region) m.push(`Region → ${regionLabel(clusterCfg.region)}`);
    ["structure", "market", "category"].forEach(k => {
      if (clusterCfg.weights[k] !== d.weights[k]) m.push(`${k[0].toUpperCase() + k.slice(1)} weight ${d.weights[k]}% → ${clusterCfg.weights[k]}%`);
    });
    const excluded = clusterCfg.peers.filter(p => !p.included && (d.peers.find(x => x.id === p.id)?.included));
    const added    = clusterCfg.peers.filter(p => !d.peers.find(x => x.id === p.id));
    excluded.forEach(p => m.push(`Excluded ${p.id} ${p.loc}`));
    added.forEach(p => m.push(`Added ${p.id} ${p.loc}`));
    return m;
  }, [clusterCfg]);

  const constraintMods = useMemo(() => {
    const m = [];
    const d = CONSTRAINTS_381;
    if (constraints.otbBudget !== d.otbBudget)     m.push(`OTB Cap ${fmtMoneyK(d.otbBudget)} → ${fmtMoneyK(constraints.otbBudget)}`);
    if (constraints.marginFloor !== d.marginFloor) m.push(`Margin Floor ${(d.marginFloor * 100).toFixed(0)}% → ${(constraints.marginFloor * 100).toFixed(0)}%`);
    if (constraints.maxSKUs !== d.maxSKUs)         m.push(`Max SKUs ${d.maxSKUs} → ${constraints.maxSKUs}`);
    if (constraints.good !== d.good || constraints.better !== d.better || constraints.best !== d.best)
      m.push(`GBB Mix ${d.good}/${d.better}/${d.best} → ${constraints.good}/${constraints.better}/${constraints.best}`);
    return m;
  }, [constraints]);

  const allMods = [...clusterMods, ...constraintMods];
  const weightTotal = clusterCfg.weights.structure + clusterCfg.weights.market + clusterCfg.weights.category;

  const setWeight = (key, val) => setClusterCfg(prev => ({ ...prev, weights: { ...prev.weights, [key]: val } }));
  const swapRegion = (v) => setClusterCfg(prev => ({ ...prev, region: v }));
  const togglePeer = (id) => setClusterCfg(prev => ({ ...prev, peers: prev.peers.map(p => p.id === id ? { ...p, included: !p.included } : p) }));
  const addCustomPeer = (cand) => {
    setClusterCfg(prev => prev.peers.find(p => p.id === cand.id)
      ? prev
      : { ...prev, peers: [...prev.peers, { id: cand.id, loc: cand.loc, score: 80.0, role: "Custom Add", reason: "Manually added", included: true, format: cand.format, sqft: cand.sqft, market: cand.market }] });
    setAddPeerOpen(false);
  };
  const setCap = (key, val) => setConstraints(prev => ({ ...prev, [key]: val }));

  const revertCluster = () => setClusterCfg({ ...DEFAULT_CLUSTER_CFG, peers: DEFAULT_CLUSTER_CFG.peers.map(p => ({ ...p })) });
  const revertConstraints = () => setConstraints({ ...CONSTRAINTS_381 });
  const revertAll = () => { revertCluster(); revertConstraints(); };

  const willCreateV2 = locked || newVersionToggle;

  const retrigger = () => {
    if (allMods.length === 0) return;
    setRerunning(true);
  };

  const onRerunComplete = () => {
    const base = reconfigBaselineRef.current;
    const excludedPeers = clusterCfg.peers.filter(p => !p.included).map(p => `${p.id} ${p.loc}`);
    if (willCreateV2) {
      const nextVersion = base.version + 1;
      // Preserve v1 snapshot in the saved list before forking
      onSaveScenario?.(buildSnapshot(locked ? "approved" : "draft", {
        version: base.version, constraints: base.constraints, clusterCfg: base.clusterCfg,
      }));
      scenarioIdRef.current = `SCN-${store.id}-${Date.now().toString(36)}`;
      setVersion(nextVersion);
      setLocked(false);
      setAuditRecord(null);
      setAuditOpen(false);
      setSignOffNotes("");
      setTier1Finalized(false);
      setCompare({
        mode: "v2",
        v1: { version: base.version, region: regionLabel(base.clusterCfg.region), caps: base.constraints },
        v2: { version: nextVersion, region: regionLabel(clusterCfg.region), caps: constraints, excluded: excludedPeers },
      });
      onSaveScenario?.(buildSnapshot("draft", { version: nextVersion, audit: null, signOffNotes: "" }));
    } else {
      setCompare({
        mode: "overwrite",
        v1: { version, region: regionLabel(base.clusterCfg.region), caps: base.constraints },
        v2: { version, region: regionLabel(clusterCfg.region), caps: constraints, excluded: excludedPeers },
      });
      onSaveScenario?.(buildSnapshot("draft"));
    }
    setRerunning(false);
    setReconfigOpen(false);
    setActiveTier("tier1");
  };

  const exportAuditCSV = () => {
    const lines = [];
    lines.push(`Scenario,${scopeForm.scenarioName}`);
    lines.push(`Store,#${store.id} ${store.market} ${store.state}`);
    lines.push(`Status,Approved & Locked (v${version})`);
    lines.push(`Approved by,${MERCHANT.name} (${MERCHANT.role})`);
    lines.push(`Timestamp,${new Date(auditRecord?.timestamp || Date.now()).toLocaleString()}`);
    lines.push(`Notes,"${(auditRecord?.notes || "").replace(/"/g, "'")}"`);
    lines.push("");
    lines.push("OVERRIDE HISTORY");
    lines.push("Tier,Item,Field,AI Baseline,Final,Delta,Reason");
    overrideRows.forEach(r => lines.push([r.tier, `"${r.item}"`, r.field, r.baseline, r.final, r.delta, r.reason].join(",")));
    lines.push("");
    lines.push("LINE PLAN");
    lines.push("SKU,Description,BuyQty,Target,GM%,Included");
    scoredSKUs.forEach(s => {
      const q = buyQty[s.id] ?? s.target;
      lines.push([s.sku, `"${s.description}"`, s.rec === "add" ? q : 0, s.target, (s.margin * 100).toFixed(1), s.rec === "add" ? "Yes" : "No"].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-${scopeForm.scenarioName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const auditColumns = [
    { field: "tier",     headerName: "Tier",        width: 90 },
    { field: "item",     headerName: "Item",        flex: 1.4, minWidth: 180 },
    { field: "field",    headerName: "Field",       flex: 1,   minWidth: 130 },
    { field: "baseline", headerName: "AI Baseline", width: 120 },
    { field: "final",    headerName: "Final",       width: 110 },
    { field: "delta",    headerName: "Δ",           width: 90 },
    { field: "reason",   headerName: "Reason Code", flex: 1,   minWidth: 150 },
  ];

  // ── Persistent context bar ──
  const scopeText = scopeForm
    ? [scopeForm.department, Array.isArray(scopeForm.subdepartment) ? scopeForm.subdepartment.join(" + ") : scopeForm.subdepartment, Array.isArray(scopeForm.cls) ? (scopeForm.cls.filter(c => c !== "All Classes").join(" + ") || "All Classes") : scopeForm.cls].filter(Boolean).join(" › ")
    : "—";
  const horizonText = scopeForm?.horizon === "ss26_h1" ? "SS26 (W1–W26)"
    : scopeForm?.horizon === "ss26_h2" ? "SS26 (W27–W52)" : "FW26";

  const contextBar = (
    <div className="nsp-t1-context">
      <div className="nsp-t1-ctx-item">
        <MapPin size={13} />
        <span className="nsp-t1-ctx-label">Store</span>
        <span className="nsp-t1-ctx-val">#{store.id} {store.market}, {store.state}</span>
        <Badge label="Cold-Start" color="warning" variant="subtle" size="small" />
            </div>
      <div className="nsp-t1-ctx-divider" />
      <div className="nsp-t1-ctx-item">
        <Layers size={13} />
        <span className="nsp-t1-ctx-label">Scope</span>
        <span className="nsp-t1-ctx-val">{scopeText}</span>
          </div>
      <div className="nsp-t1-ctx-divider" />
      <div className="nsp-t1-ctx-item">
        <Calendar size={13} />
        <span className="nsp-t1-ctx-label">Horizon</span>
        <span className="nsp-t1-ctx-val">{horizonText}</span>
      </div>
      <div className="nsp-t1-ctx-divider" />
      <div className="nsp-t1-ctx-item">
        <RotateCcw size={13} />
        <span className="nsp-t1-ctx-label">Scenario</span>
        <span className="nsp-t1-ctx-val">v{version}</span>
        {locked
          ? <Badge label="Approved & Locked" color="info" variant="subtle" size="small" />
          : <Badge label="Working Draft" color="warning" variant="subtle" size="small" />}
        </div>
      </div>
  );

  // ── Tier 1 panel content ──
  const tier1Panel = (
    <div className="nsp-t1-panel">
      {/* Sticky KPI stack — health banner + health cards freeze beneath the
          tab strip while only the SKU table scrolls underneath. */}
      <div className="nsp-t1-sticky-kpis">
        <div className="nsp-t1-kpi-inner">
        {/* Executive Open-To-Buy headline */}
        <Card size="small" sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
        <div className={`nsp-t1-otb-hero ${agg.exceeded ? "deficit" : "surplus"}`}>
          <div className="nsp-t1-otb-hero-main">
            <span className="nsp-t1-otb-hero-lbl">Remaining Open-To-Buy</span>
            <div className="nsp-t1-otb-hero-figure">
              <span className="nsp-t1-otb-hero-val">${otbRemainK}k</span>
              <Badge
                label={agg.exceeded ? "Deficit" : "Surplus"}
                color={agg.exceeded ? "error" : "success"}
                variant="subtle"
                size="small"
              />
          </div>
                    </div>
          <div className="nsp-t1-otb-hero-eq">
            <span className="nsp-t1-otb-eq-part">
              <span className="nsp-t1-otb-eq-num">${otbBudgetK}k</span>
              <span className="nsp-t1-otb-eq-lbl">Total Budget</span>
            </span>
            <span className="nsp-t1-otb-eq-op">−</span>
            <span className="nsp-t1-otb-eq-part">
              <span className="nsp-t1-otb-eq-num">${otbCommittedK}k</span>
              <span className="nsp-t1-otb-eq-lbl">Committed</span>
            </span>
            <span className="nsp-t1-otb-eq-op">=</span>
            <span className="nsp-t1-otb-eq-part">
              <span className={`nsp-t1-otb-eq-num ${agg.exceeded ? "neg" : "pos"}`}>${otbRemainK}k</span>
              <span className="nsp-t1-otb-eq-lbl">Remaining</span>
            </span>
                    </div>
                    </div>
        </Card>

        {/* Health detail cards */}
        <div className="nsp-eng-health-row">
          {healthCards.map(hc => {
            const gradeColor = hc.grade === "pass" ? "#059669" : "#dc2626";
            return (
              <Card key={hc.label} size="small" sx={{ ...panelSx, padding: "16px 18px" }}>
                <div className="nsp-eng-hcard-top">
                  <div className="nsp-eng-hcard-icon" style={{ color: gradeColor }}>{hc.icon}</div>
                  <span className="nsp-eng-hcard-label">{hc.label}</span>
                  <Badge
                    label={hc.grade === "pass" ? "PASS" : "FAIL"}
                    color={hc.grade === "pass" ? "success" : "error"}
                    variant="subtle"
                    size="small"
                  />
                    </div>
                <div className="nsp-eng-hcard-value">{hc.value}</div>
                <div className="nsp-eng-hcard-sub">{hc.sub}</div>
                <div className="nsp-eng-hcard-bar-track">
                  <div className="nsp-eng-hcard-bar-fill" style={{ width: `${hc.pct}%`, background: gradeColor }} />
                    </div>
              </Card>
            );
          })}
                    </div>

        {/* View More → opens the reconciliation & attribute-mix side panel */}
                      <button
                        type="button"
          className="nsp-recon-viewmore"
          onClick={() => setReconOpen(true)}
        >
          <span className="nsp-recon-viewmore-left">
            <LayoutDashboard size={15} />
            <span className="nsp-recon-viewmore-text">
              <span className="nsp-recon-viewmore-title">Reconciliation &amp; Attribute Mix</span>
              <span className="nsp-recon-viewmore-sub">Space vs. capital · OTB roll-up · distribution</span>
            </span>
          </span>
          <span className="nsp-recon-viewmore-right">
            {recon.space.overCapacity && (
              <Badge label="Over Capacity" color="error" variant="subtle" size="small" />
            )}
            {agg.exceeded && (
              <Badge label="OTB Deficit" color="error" variant="subtle" size="small" />
            )}
            {!recon.space.overCapacity && !agg.exceeded && (
              <Badge label="Balanced" color="success" variant="subtle" size="small" />
            )}
            <span className="nsp-recon-viewmore-cta">View More <ChevronRight size={14} /></span>
          </span>
        </button>
                    </div>
                  </div>

      {/* ── Reconciliation & Attribute Mix — right-side slide-over panel ──────── */}
      {reconOpen && (
      <div className="nsp-recon-drawer-backdrop" onClick={() => setReconOpen(false)}>
      <div className="nsp-recon-drawer" onClick={e => e.stopPropagation()}>
        <div className="nsp-recon-drawer-header">
          <div className="nsp-recon-drawer-header-left">
            <div className="nsp-recon-drawer-icon"><LayoutDashboard size={16} /></div>
            <div>
              <div className="nsp-recon-drawer-title">Reconciliation &amp; Attribute Mix</div>
              <div className="nsp-recon-drawer-sub">{store?.name || "New Store"} · {scopeForm?.department || "Hardwood Flooring"} · Live plan reconciliation</div>
          </div>
        </div>
          <span className="nsp-recon-drawer-header-right">
            {recon.space.overCapacity && (
              <Badge label="Over Capacity" color="error" variant="subtle" size="small" />
            )}
            {agg.exceeded && (
              <Badge label="OTB Deficit" color="error" variant="subtle" size="small" />
            )}
            {!recon.space.overCapacity && !agg.exceeded && (
              <Badge label="Balanced" color="success" variant="subtle" size="small" />
            )}
            <button className="nsp-recon-drawer-close" onClick={() => setReconOpen(false)}><X size={16} /></button>
          </span>
          </div>

        <div className="nsp-recon-body">
            {/* Depth & breadth strip */}
            <div className="nsp-recon-db-strip">
              <div className="nsp-recon-db-item">
                <span className="nsp-recon-db-val">{recon.depthBreadth.breadth}</span>
                <span className="nsp-recon-db-lbl">Breadth (Styles)</span>
            </div>
              <div className="nsp-recon-db-item">
                <span className="nsp-recon-db-val">{recon.depthBreadth.avgUnits}</span>
                <span className="nsp-recon-db-lbl">Avg Units / Style</span>
            </div>
              <div className="nsp-recon-db-item">
                <span className="nsp-recon-db-val">{recon.depthBreadth.totalUnits.toLocaleString()}</span>
                <span className="nsp-recon-db-lbl">Total Units</span>
              </div>
              <div className="nsp-recon-db-item">
                <span className="nsp-recon-db-val">{recon.depthBreadth.expectedTurn}×</span>
                <span className="nsp-recon-db-lbl">Expected Turn</span>
              </div>
          </div>

            <div className="nsp-recon-grid">
              {/* Space vs Capital */}
              <Card size="small" sx={{ ...panelSx, padding: "16px 18px" }}>
                <div className="nsp-recon-card-head">
                  <span className="nsp-recon-card-title">Space vs. Capital</span>
                  {recon.space.overCapacity
                    ? <Badge label="Over Capacity" color="error" variant="subtle" size="small" />
                    : <Badge label="Within Layout" color="success" variant="subtle" size="small" />}
                </div>
                <div className="nsp-recon-space-bays">
                  <span className="nsp-recon-space-bays-val">
                    {recon.space.baysUsed} <span className="nsp-recon-space-bays-max">/ {recon.space.baysMax} bays</span>
              </span>
                  <span className="nsp-recon-space-bays-pct">{recon.space.baysPct}%</span>
            </div>
                <div className="nsp-recon-space-track">
                  <div
                    className="nsp-recon-space-fill"
                    style={{ width: `${recon.space.baysPct}%`, background: recon.space.overCapacity ? "#dc2626" : "linear-gradient(90deg,#4f46e5,#818cf8)" }}
                  />
            </div>
                <div className="nsp-recon-space-foot">
                  <div className="nsp-recon-space-metric">
                    <span className="nsp-recon-space-metric-val">{recon.space.sqftUsed.toLocaleString()}</span>
                    <span className="nsp-recon-space-metric-lbl">of {recon.space.sqftMax.toLocaleString()} sq ft</span>
          </div>
                  <div className="nsp-recon-space-metric">
                    <span className="nsp-recon-space-metric-val">{recon.space.linearFtUsed.toLocaleString()}</span>
                    <span className="nsp-recon-space-metric-lbl">of {recon.space.linearFtMax.toLocaleString()} lin ft</span>
                  </div>
                </div>
              </Card>

              {/* Attribute donuts */}
              <Card size="small" sx={{ ...panelSx, padding: "16px 18px" }}>
                <div className="nsp-recon-card-head">
                  <span className="nsp-recon-card-title">Strategic Attribute Distribution</span>
                  <Badge
                    label={recon.mix.gbbBalanced ? "GBB Balanced" : "GBB Off-Target"}
                    color={recon.mix.gbbBalanced ? "success" : "warning"}
                    variant="subtle"
                    size="small"
                  />
            </div>
                <div className="nsp-recon-donuts">
                  <ReconDonut
                    title="By Category"
                    data={Object.entries(recon.mix.bySpecies).map(([k, v]) => ({ name: k, y: v, color: SPECIES_COLORS[k] || "#94a3b8" }))}
                  />
                  <ReconDonut
                    title="By Colour / Finish"
                    data={["Natural", "Grey", "Dark"]
                      .filter(k => recon.mix.byColor[k])
                      .map(k => ({ name: k, y: recon.mix.byColor[k], color: COLORFAM_COLORS[k] }))}
                  />
                  <ReconDonut
                    title="Price Architecture"
                    note={`tgt ${recon.mix.gbbTarget.Good}/${recon.mix.gbbTarget.Better}/${recon.mix.gbbTarget.Best}`}
                    data={["Good", "Better", "Best"]
                      .filter(k => recon.mix.byGBB[k])
                      .map(k => ({ name: k, y: recon.mix.byGBB[k], color: GBB_MIX_COLORS[k] }))}
                  />
            </div>
              </Card>
          </div>

            {/* Hierarchy roll-up */}
            <Card size="small" sx={{ ...panelSx, padding: "16px 18px" }}>
              <div className="nsp-recon-card-head">
                <span className="nsp-recon-card-title">Hierarchical Roll-Up</span>
                <span className="nsp-recon-card-sub">Aggregated by Category · rolls up to Total Store</span>
            </div>
              <div className="nsp-recon-rollup">
                <div className="nsp-recon-rollup-head">
                  <span className="nsp-recon-ru-c nsp-recon-ru-cat">Category</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">Options</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">OTB Committed</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">Bays</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">Sq Ft</span>
          </div>
                {recon.rollup.map(r => (
                  <div key={r.category} className="nsp-recon-rollup-row">
                    <span className="nsp-recon-ru-c nsp-recon-ru-cat">{r.category}</span>
                    <span className="nsp-recon-ru-c nsp-recon-ru-r">{r.options}</span>
                    <span className="nsp-recon-ru-c nsp-recon-ru-r">${(r.otbCommitted / 1000).toFixed(1)}k</span>
                    <span className="nsp-recon-ru-c nsp-recon-ru-r">{r.bays}</span>
                    <span className="nsp-recon-ru-c nsp-recon-ru-r">{r.sqft.toLocaleString()}</span>
          </div>
                ))}
                <div className="nsp-recon-rollup-row total">
                  <span className="nsp-recon-ru-c nsp-recon-ru-cat">Total Store</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">{recon.rollupTotal.options}</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">${(recon.rollupTotal.otbCommitted / 1000).toFixed(1)}k</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">{recon.rollupTotal.bays}</span>
                  <span className="nsp-recon-ru-c nsp-recon-ru-r">{recon.rollupTotal.sqft.toLocaleString()}</span>
        </div>
      </div>
            </Card>
        </div>
      </div>
      </div>
      )}

      {/* Line-plan filter chip bar (Existing Store flow) — search + attribute
          chips borrowed from the retired Financial-Plan-Reconciliation tab. */}
      {recoInsights && (
        <div className="nsp-t1-filterbar">
          <div className="nsp-t1-filterbar-search">
            <Search size={14} />
            <input
              placeholder="Search style or SKU…"
              value={f_search}
              onChange={e => setFSearch(e.target.value)}
            />
            {f_search && (
              <button className="nsp-t1-filterbar-clearsearch" onClick={() => setFSearch("")} aria-label="Clear search"><X size={12} /></button>
            )}
          </div>
          <div className="nsp-t1-filterbar-chips">
            {T2_ATTRS.map(a => (
              <div key={a.key} className="nsp-t1-filterchip">
                <FdSelect
                  isMulti
                  isClearable
                  isWithSelectAll
                  isWithSelectedOptionTags
                  placeholder={a.label}
                  value={f_attr[a.key]}
                  options={t1AttrValues[a.key].map(v => ({ value: v, label: v }))}
                  onChange={(vals) => setFAttr(prev => ({ ...prev, [a.key]: vals || [] }))}
                  width={190}
                />
              </div>
            ))}
          </div>
          <div className="nsp-t1-filterbar-right">
            <span className="nsp-t1-filterbar-count">
              {t1Filtered.length} of {scoredSKUs.length}
            </span>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="small" icon={<X size={12} />} iconPlacement="left" onClick={clearFilters}>
                Clear
              </Button>
            )}
            {!locked && (
              <Button variant="stroke" size="small" icon={<FilePlus2 size={13} />} iconPlacement="left" onClick={() => setPhOpen(true)}>
                Placeholder SKU
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Placeholder SKU introduction modal (Existing Store flow, Step 3) */}
      <Modal isOpen={phOpen} onClose={() => setPhOpen(false)} title="Introduce Placeholder SKU" size="medium">
        <div className="nsp-ph">
          <p className="nsp-ph-intro">
            Add an upcoming item with no sales history. It enters the plan as a
            <strong> New Introduction </strong> and inherits climate-based demand defaults until real hindsight arrives.
          </p>
          <div className="nsp-ph-field">
            <label className="nsp-ph-lbl">Description</label>
            <input
              className="nsp-ph-input"
              placeholder="e.g. Coastal 7&quot; Wide Plank Hickory — Fog"
              value={phForm.description}
              onChange={e => setPhForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="nsp-ph-grid">
            <div className="nsp-ph-field">
              <label className="nsp-ph-lbl">Species</label>
              <FdSelect
                value={phForm.species}
                onChange={v => setPhForm(f => ({ ...f, species: v }))}
                options={Object.keys(SKU_THUMB_BY_SPECIES).map(s => ({ value: s, label: s }))}
              />
            </div>
            <div className="nsp-ph-field">
              <label className="nsp-ph-lbl">Finish</label>
              <FdSelect
                value={phForm.finish}
                onChange={v => setPhForm(f => ({ ...f, finish: v }))}
                options={["Wirebrushed", "Smooth", "Hand-Scraped", "Distressed", "Matte", "Gloss"].map(v => ({ value: v, label: v }))}
              />
            </div>
            <div className="nsp-ph-field">
              <label className="nsp-ph-lbl">Width</label>
              <FdSelect
                value={phForm.width}
                onChange={v => setPhForm(f => ({ ...f, width: v }))}
                options={['3.25"', '5"', '7"', '9"'].map(v => ({ value: v, label: v }))}
              />
            </div>
          </div>
          <div className="nsp-ph-grid">
            <div className="nsp-ph-field">
              <label className="nsp-ph-lbl">Retail ($/sqft)</label>
              <input
                className="nsp-ph-input" type="number" min="0" step="0.01" placeholder="7.99"
                value={phForm.retail}
                onChange={e => setPhForm(f => ({ ...f, retail: e.target.value }))}
              />
            </div>
            <div className="nsp-ph-field">
              <label className="nsp-ph-lbl">Cost ($/sqft)</label>
              <input
                className="nsp-ph-input" type="number" min="0" step="0.01" placeholder="3.49"
                value={phForm.cost}
                onChange={e => setPhForm(f => ({ ...f, cost: e.target.value }))}
              />
            </div>
            <div className="nsp-ph-field">
              <label className="nsp-ph-lbl">Launch Date</label>
              <input
                className="nsp-ph-input" type="date"
                value={phForm.launchDate}
                onChange={e => setPhForm(f => ({ ...f, launchDate: e.target.value }))}
              />
            </div>
          </div>
          {phForm.retail && phForm.cost && Number(phForm.cost) >= Number(phForm.retail) && (
            <div className="nsp-ph-warn"><AlertTriangle size={13} /> Cost must be below retail.</div>
          )}
          <div className="nsp-ph-foot">
            <span className="nsp-ph-margin">
              {phValid ? <>Projected GM <strong>{Math.round(((Number(phForm.retail) - Number(phForm.cost)) / Number(phForm.retail)) * 100)}%</strong></> : "Enter retail & cost"}
            </span>
            <div className="nsp-ph-foot-btns">
              <Button variant="stroke" size="small" onClick={() => setPhOpen(false)}>Cancel</Button>
              <Button variant="primary" size="small" icon={<Plus size={13} />} iconPlacement="left" disabled={!phValid} onClick={addPlaceholder}>
                Add to Line Plan
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Multi-select bulk action bar (Existing Store flow) */}
      {recoInsights && !locked && selRows.size > 0 && (
        <div className="nsp-t1-selbar">
          <div className="nsp-t1-selbar-left">
            <span className="nsp-t1-selbar-count"><CheckCheck size={14} /> {selRows.size} selected</span>
            <span className="nsp-t1-selbar-hint">Set the assortment action for all selected options</span>
          </div>
          <div className="nsp-t1-selbar-actions">
            <Button variant="stroke" size="small" icon={<Plus size={12} />} iconPlacement="left" onClick={() => setActionForSelected("add")}>Add</Button>
            <Button variant="stroke" size="small" icon={<Check size={12} />} iconPlacement="left" onClick={() => setActionForSelected("keep")}>Keep</Button>
            <Button variant="stroke" size="small" icon={<Minus size={12} />} iconPlacement="left" onClick={() => setActionForSelected("drop")}>Drop</Button>
            <span className="nsp-t1-selbar-div" />
            <Button variant="ghost" size="small" icon={<X size={12} />} iconPlacement="left" onClick={clearSel}>Clear</Button>
          </div>
        </div>
      )}

      {/* Strategic assortment table — capped so only the rows scroll,
          never the page itself. */}
      <div
        className="nsp-t1-table-wrap"
        ref={tableWrapRef}
        style={tableMaxHeight ? { maxHeight: `${tableMaxHeight}px` } : undefined}
      >
      <div className={`nsp-t1-table${recoInsights ? " nsp-t1-reco" : ""}`}>
        <div className="nsp-t1-thead">
          <span className="nsp-t1-th nsp-t1-th-style">Style · Colour</span>
          <span className="nsp-t1-th">Department</span>
          <span className="nsp-t1-th">Sub-Dept</span>
          <span className="nsp-t1-th">Class</span>
          <span className="nsp-t1-th">Sub-Class</span>
          <span className="nsp-t1-th">Launch Date</span>
          <span className="nsp-t1-th">End Date</span>
          <span className="nsp-t1-th">Type</span>
          {recoInsights && (
            <span className="nsp-t1-th nsp-t1-th-c">
              <span className="nsp-t1-reco-th">
                <Tooltip
                  title={pageAllSel ? "Clear selection on this page" : "Select all on this page"}
                  orientation="top" variant="secondary" trigger="hover"
                >
                  <input
                    type="checkbox"
                    className="nsp-t1-sel-check"
                    checked={pageAllSel}
                    disabled={locked || pagedSKUs.length === 0}
                    ref={el => { if (el) el.indeterminate = pageSomeSel; }}
                    onChange={() => setPageSelected(!pageAllSel)}
                    aria-label="Select all options on this page"
                  />
                </Tooltip>
                Recommendation
              </span>
            </span>
          )}
          <span className="nsp-t1-th nsp-t1-th-c">Buy Qty</span>
          {recoInsights && <span className="nsp-t1-th nsp-t1-th-c">Pro %</span>}
          <span className="nsp-t1-th nsp-t1-th-r">APS</span>
          <span className="nsp-t1-th nsp-t1-th-r">ST%</span>
          <span className="nsp-t1-th nsp-t1-th-r">GM%</span>
          <span className="nsp-t1-th nsp-t1-th-c">Mandatory</span>
          <span className="nsp-t1-th nsp-t1-th-wp">WP Assorted</span>
          {recoInsights && <span className="nsp-t1-th nsp-t1-th-c">Explainability</span>}
          <span className="nsp-t1-th nsp-t1-th-mkt">Mkt Potential</span>
        </div>
        {pagedSKUs.map(sku => {
          const action = recoInsights ? effAction(sku) : (sku.rec === "add" ? "add" : "drop");
          const isDropped = recoInsights && action === "drop";
          const isIn = recoInsights ? action !== "drop" : sku.rec === "add";
          const rowSelected = recoInsights && selRows.has(sku.id);
          const q = buyQty[sku.id] ?? sku.target;
          const mktColor = sku.mktPotential >= 70 ? "#059669" : sku.mktPotential >= 45 ? "#d97706" : "#dc2626";
          const thumb = SKU_THUMB_BY_SPECIES[sku.species];
          // Market Potential is a weighted blend — surface the actual driver
          // contributions so the hover tooltip is fully transparent.
          const mktVelScore  = Math.round(Math.min(sku.peerVelocity / 140, 1) * 100);
          const mktClimScore = Math.round(sku.climateFit * 100);
          const mktSkuScore  = Math.round(computeSKUScore(sku));
          const mktTooltip = (
            <div className="nsp-t1-mkt-tip">
              <div className="nsp-t1-mkt-tip-head">
                <span className="nsp-t1-mkt-tip-title">Market Potential</span>
                <span className="nsp-t1-mkt-tip-score" style={{ color: mktColor }}>{sku.mktPotential}<span className="nsp-t1-mkt-tip-of">/100</span></span>
        </div>
              <div className="nsp-t1-mkt-tip-sub">
                Cold-start demand index for the Billings, MT 30-mi catchment. With no local sales history,
                signals are proxied from the weighted peer-store pool and enriched market context.
        </div>
              <div className="nsp-t1-mkt-tip-rows">
                <div className="nsp-t1-mkt-tip-row">
                  <span className="nsp-t1-mkt-tip-w">45%</span>
                  <span className="nsp-t1-mkt-tip-lbl">Peer sales velocity <em>(units/13wk, normalized to 140 cap)</em></span>
                  <span className="nsp-t1-mkt-tip-v">{mktVelScore}</span>
        </div>
                <div className="nsp-t1-mkt-tip-row">
                  <span className="nsp-t1-mkt-tip-w">35%</span>
                  <span className="nsp-t1-mkt-tip-lbl">Climate / heating-season fit <em>(Zone 4b, semi-arid)</em></span>
                  <span className="nsp-t1-mkt-tip-v">{mktClimScore}</span>
      </div>
                <div className="nsp-t1-mkt-tip-row">
                  <span className="nsp-t1-mkt-tip-w">20%</span>
                  <span className="nsp-t1-mkt-tip-lbl">SKU composite score <em>(margin · price tier · attributes)</em></span>
                  <span className="nsp-t1-mkt-tip-v">{mktSkuScore}</span>
                </div>
              </div>
              <div className="nsp-t1-mkt-tip-formula">
                = 0.45×{mktVelScore} + 0.35×{mktClimScore} + 0.20×{mktSkuScore} → capped at 100
              </div>
            </div>
          );

          // ── Existing Store Reco decision-support cells (gated by recoInsights) ──
          const proMix = sku.proMix || { pro: 50, diy: 50 };
          const proLed = proMix.pro >= 55;
          const diyLed = proMix.pro <= 45;
          const proColor = proLed ? "#4f46e5" : diyLed ? "#d97706" : "#475569";
          const proTooltip = (
            <div className="nsp-t1-mkt-tip">
              <div className="nsp-t1-mkt-tip-head">
                <span className="nsp-t1-mkt-tip-title">Demand Mix</span>
                <span className="nsp-t1-mkt-tip-score" style={{ color: proColor }}>{proMix.pro}%<span className="nsp-t1-mkt-tip-of"> Pro</span></span>
              </div>
              <div className="nsp-t1-mkt-tip-sub">
                Expected split of Pro/Contractor vs DIY demand, inferred from finish, plank width and lifecycle for the Billings, MT trade area.
              </div>
              <div className="nsp-t1-mkt-tip-rows">
                <div className="nsp-t1-mkt-tip-row">
                  <span className="nsp-t1-mkt-tip-w">Pro</span>
                  <span className="nsp-t1-mkt-tip-lbl">Contractor / trade demand</span>
                  <span className="nsp-t1-mkt-tip-v">{proMix.pro}%</span>
                </div>
                <div className="nsp-t1-mkt-tip-row">
                  <span className="nsp-t1-mkt-tip-w">DIY</span>
                  <span className="nsp-t1-mkt-tip-lbl">Homeowner / retail demand</span>
                  <span className="nsp-t1-mkt-tip-v">{proMix.diy}%</span>
                </div>
              </div>
              <div className="nsp-t1-mkt-tip-formula">
                {proLed ? "Contractor-led — rustic finish / wide plank skews trade." : diyLed ? "DIY-led — refined finish skews homeowner." : "Balanced Pro / DIY demand."}
              </div>
            </div>
          );
          const explain = sku.explain || { score: 0, parts: [] };
          const explainColor = explain.score >= 70 ? "#059669" : explain.score >= 45 ? "#d97706" : "#dc2626";
          const explainTooltip = (
            <div className="nsp-t1-mkt-tip">
              <div className="nsp-t1-mkt-tip-head">
                <span className="nsp-t1-mkt-tip-title">Explainability Score</span>
                <span className="nsp-t1-mkt-tip-score" style={{ color: explainColor }}>{explain.score}<span className="nsp-t1-mkt-tip-of">/100</span></span>
              </div>
              <div className="nsp-t1-mkt-tip-sub">
                Recommendation confidence — a weighted blend of the KPIs driving this Add / Keep / Drop call.
              </div>
              <div className="nsp-t1-mkt-tip-rows">
                {explain.parts.map(p => (
                  <div key={p.key} className="nsp-t1-mkt-tip-row">
                    <span className="nsp-t1-mkt-tip-w">{Math.round(p.weight * 100)}%</span>
                    <span className="nsp-t1-mkt-tip-lbl">{p.label} <em>({p.hint})</em></span>
                    <span className="nsp-t1-mkt-tip-v">{p.value} → {p.contribution}</span>
                  </div>
                ))}
              </div>
              <div className="nsp-t1-mkt-tip-formula">
                = {explain.parts.map(p => `${Math.round(p.weight * 100)}%×${p.value}`).join(" + ")} → {explain.score}/100
              </div>
            </div>
          );

          return (
            <div key={sku.id} className={`nsp-t1-row ${isIn ? "" : "nsp-t1-row-dim"}${isDropped ? " nsp-t1-row-dropped" : ""}${rowSelected ? " nsp-t1-row-selected" : ""}`}>
              {/* Style-Colour */}
              <span className="nsp-t1-td nsp-t1-td-style">
                {thumb && (
                  <span className="nsp-t1-thumb">
                    <img src={thumb} alt={sku.species} />
                  </span>
                )}
                <span className="nsp-t1-style-text">
                  <Tooltip title={sku.description} orientation="top" variant="secondary" trigger="hover">
                    <span className="nsp-t1-style-name">{sku.description}</span>
                  </Tooltip>
                  <span className="nsp-t1-style-code">{sku.sku}</span>
                </span>
              </span>
              {/* Department */}
              <span className="nsp-t1-td nsp-t1-td-muted">{sku.department}</span>
              {/* Sub-Department */}
              <span className="nsp-t1-td nsp-t1-td-muted">{sku.subDepartment}</span>
              {/* Class */}
              <span className="nsp-t1-td nsp-t1-td-muted">{sku.productClass}</span>
              {/* Sub-Class */}
              <span className="nsp-t1-td nsp-t1-td-muted">{sku.subClass}</span>
              {/* Launch Date */}
              <span className="nsp-t1-td nsp-t1-td-muted">{formatSkuDate(sku.launchDate)}</span>
              {/* End Date */}
              <span className="nsp-t1-td nsp-t1-td-muted">{formatEndDate(sku.endDate)}</span>
              {/* Type */}
              <span className="nsp-t1-td">
                <Tag
                  label={sku.lifecycle === "NPI" ? "New" : "Carryover"}
                  type={sku.lifecycle === "NPI" ? "info" : "default"}
                  variant="filled"
                  size="small"
                />
              </span>
              {/* Recommendation: row select + editable Add/Keep/Drop (Existing Store Reco only) */}
              {recoInsights && (
                <span className="nsp-t1-td nsp-t1-td-c">
                  <span className="nsp-t1-reco-cell">
                    <input
                      type="checkbox"
                      className="nsp-t1-sel-check"
                      checked={rowSelected}
                      disabled={locked}
                      onChange={() => toggleSel(sku.id)}
                      aria-label={`Select ${sku.description}`}
                    />
                    <span className="nsp-t1-actseg" role="group" aria-label="Assortment action">
                      {[
                        { key: "add",  label: "Add",  Icon: Plus  },
                        { key: "keep", label: "Keep", Icon: Check },
                        { key: "drop", label: "Drop", Icon: Minus },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          className={`nsp-t1-actseg-btn ${action === opt.key ? `is-active is-${opt.key}` : ""}`}
                          disabled={locked}
                          onClick={() => setAction(sku.id, opt.key)}
                          title={`Set to ${opt.label}`}
                          aria-pressed={action === opt.key}
                        >
                          <opt.Icon size={11} />
                          {action === opt.key && <span className="nsp-t1-actseg-lbl">{opt.label}</span>}
                        </button>
                      ))}
                    </span>
                  </span>
                </span>
              )}
              {/* Buy Qty — read-only. Quantified downstream in the Tier 3 WSSI
                  engine; Tier 1 mirrors that calculated intake as a locked value. */}
              <span className="nsp-t1-td nsp-t1-td-c">
                {isIn ? (
                  <Tooltip
                    title="Calculated downstream in the Tier 3 WSSI engine (Weeks-of-Cover + Presentation Stock). Adjust it there — Tier 1 is for option assortment, not quantification."
                    orientation="top"
                    variant="secondary"
                    trigger="hover"
                  >
                    <span className="nsp-t1-qty-locked">
                      <Lock size={11} />
                      <span className="nsp-t1-qty-locked-val">{q}</span>
                      <span className="nsp-t1-qty-locked-unit">units</span>
                    </span>
                  </Tooltip>
                ) : (
                  <Tag label="Unassigned" type="default" variant="subtle" size="small" />
                )}
              </span>
              {/* Pro % (Contractor mix) — Existing Store Reco only */}
              {recoInsights && (
                <span className="nsp-t1-td nsp-t1-td-c">
                  <Tooltip title={proTooltip} orientation="top" variant="secondary" trigger="hover">
                    <span className="nsp-t1-promix">
                      <span className="nsp-t1-promix-top">
                        {proLed ? <ArrowUp size={12} style={{ color: proColor }} />
                          : diyLed ? <ArrowDown size={12} style={{ color: proColor }} />
                          : <Minus size={12} style={{ color: proColor }} />}
                        <span className="nsp-t1-promix-val" style={{ color: proColor }}>{proMix.pro}%</span>
                      </span>
                      <span className="nsp-t1-promix-bar">
                        <span className="nsp-t1-promix-fill" style={{ width: `${proMix.pro}%`, background: proColor }} />
                      </span>
                    </span>
                  </Tooltip>
                </span>
              )}
              {/* APS */}
              <span className="nsp-t1-td nsp-t1-td-r">{sku.aps.toFixed(1)}</span>
              {/* ST% */}
              <span className="nsp-t1-td nsp-t1-td-r">{sku.st}%</span>
              {/* GM% */}
              <span className={`nsp-t1-td nsp-t1-td-r ${sku.margin < constraints.marginFloor ? "nsp-eng-warn" : ""}`}>
                {(sku.margin * 100).toFixed(1)}%
              </span>
              {/* Mandatory */}
              <span className="nsp-t1-td nsp-t1-td-c">
                {sku.mandatory
                  ? <Badge label="Yes" color="info" variant="subtle" size="small" />
                  : <span className="nsp-t1-muted">No</span>}
              </span>
              {/* WP assorted */}
              <span className="nsp-t1-td nsp-t1-td-wp">
                {isIn
                  ? <span className="nsp-t1-wp-true"><Check size={13} /> True</span>
                  : <span className="nsp-t1-wp-false">— False</span>}
            </span>
              {/* Explainability Score (Existing Store Reco only) */}
              {recoInsights && (
                <span className="nsp-t1-td nsp-t1-td-c">
                  <Tooltip title={explainTooltip} orientation="left" variant="secondary" trigger="hover">
                    <span className="nsp-t1-mkt-cell nsp-t1-explain-cell">
                      <div className="nsp-t1-mkt-track">
                        <div className="nsp-t1-mkt-fill" style={{ width: `${explain.score}%`, background: explainColor }} />
                      </div>
                      <span className="nsp-t1-mkt-score" style={{ color: explainColor }}>{explain.score}</span>
                    </span>
                  </Tooltip>
                </span>
              )}
              {/* Mkt Potential (moved to end) — hover for calculation methodology */}
              <span className="nsp-t1-td nsp-t1-td-mkt">
                <Tooltip title={mktTooltip} orientation="left" variant="secondary" trigger="hover">
                  <span className="nsp-t1-mkt-cell">
                    <div className="nsp-t1-mkt-track">
                      <div className="nsp-t1-mkt-fill" style={{ width: `${sku.mktPotential}%`, background: mktColor }} />
      </div>
                    <span className="nsp-t1-mkt-score" style={{ color: mktColor }}>{sku.mktPotential}</span>
                  </span>
                </Tooltip>
              </span>
    </div>
  );
        })}
      </div>
      <TablePager
        page={t1PageClamped}
        pageSize={t1PageSize}
        totalRows={t1Filtered.length}
        onPageChange={setT1Page}
        onPageSizeChange={setT1PageSize}
        noun="SKUs"
      />
      </div>
    </div>
  );

  // ── Reconfigure studios renderer ──────────────────────────────────────────
  const WEIGHT_META = [
    { key: "structure", label: "Store Structure",  icon: Building2, desc: "Format · footprint · logistics" },
    { key: "market",    label: "Market Context",   icon: Globe,     desc: "Income · housing · pro density" },
    { key: "category",  label: "Category Signal",  icon: Layers,    desc: "Solid Prefinished velocity" },
  ];

  const constraintCats = [
    { value: "financial", label: "Financial Caps",           icon: DollarSign },
    { value: "space",     label: "Space & POG Caps",         icon: Ruler },
    { value: "brand",     label: "Supply Chain & Brand",     icon: Package },
  ];

  const filteredCandidates = CUSTOM_PEER_CANDIDATES.filter(c =>
    !clusterCfg.peers.find(p => p.id === c.id) &&
    (peerFilters.format === "all" || c.format === peerFilters.format) &&
    (peerFilters.market === "all" || c.market === peerFilters.market));

  const scopePath = `${scopeForm?.department || "Wood"} ❯ ${scopeForm?.subLabel || scopeForm?.subDepartment || "Solid Prefinished"} ❯ ${scopeForm?.horizon || "SS26"}`;

  const capModified = {
    otb:    constraints.otbBudget  !== CONSTRAINTS_381.otbBudget,
    margin: constraints.marginFloor !== CONSTRAINTS_381.marginFloor,
    sku:    constraints.maxSKUs    !== CONSTRAINTS_381.maxSKUs,
    gbb:    constraints.good !== CONSTRAINTS_381.good || constraints.better !== CONSTRAINTS_381.better || constraints.best !== CONSTRAINTS_381.best,
  };

  const renderConstraintRow = ({ param, def, level, modified, children, note }) => (
    <div className="nsp-cst-row" key={param}>
      <div className="nsp-cst-cell nsp-cst-param">
        {param}
        {note && <span className="nsp-cst-note">{note}</span>}
          </div>
      <div className="nsp-cst-cell nsp-cst-def">{def}</div>
      <div className="nsp-cst-cell nsp-cst-override">{children}</div>
      <div className="nsp-cst-cell nsp-cst-level">
        <Badge label={level} color={level.includes("Corporate") ? "default" : level.includes("Permanent") ? "info" : "default"} variant="stroke" size="small" />
        </div>
      <div className="nsp-cst-cell nsp-cst-status">
        {modified
          ? <Badge label="Modified" color="warning" variant="subtle" size="small" />
          : <Badge label="Default" color="default" variant="subtle" size="small" />}
        </div>
      </div>
    );

  const renderReconfigure = () => (
    <div className="nsp-recfg nsp-fade-up">
      {/* Header */}
      <div className="nsp-recfg-head">
        <div className="nsp-recfg-head-left">
          <div className="nsp-recfg-head-icon"><SlidersHorizontal size={16} /></div>
          <div>
            <div className="nsp-recfg-title">Reconfigure Scenario</div>
            <div className="nsp-recfg-scope">Scope: {scopePath} · Target: Store #{store.id} {store.market}, {store.state}</div>
            </div>
        </div>
        <div className="nsp-recfg-switch">
          <Button variant={reconfigTab === "cluster" ? "primary" : "ghost"} size="small"
            icon={<Users size={13} />} iconPlacement="left" onClick={() => setReconfigTab("cluster")}>
            Location &amp; Peer Cluster
          </Button>
          <Button variant={reconfigTab === "constraints" ? "primary" : "ghost"} size="small"
            icon={<Lock size={13} />} iconPlacement="left" onClick={() => setReconfigTab("constraints")}>
            Enterprise Constraints
          </Button>
          <span className="nsp-recfg-switch-sep" />
          <Button variant="stroke" size="small" icon={<X size={13} />} iconPlacement="left"
            onClick={() => { setReconfigOpen(false); setActiveTier("tier1"); }}>
            Back to Line Plan
          </Button>
        </div>
          </div>

      {/* Body */}
      <div className="nsp-recfg-body">
        {reconfigTab === "cluster" ? (
          <div className="nsp-recfg-cluster">
            {/* Left — weights + region */}
            <div className="nsp-recfg-col">
              <div className="nsp-recfg-panel">
                <div className="nsp-recfg-panel-head">
                  <span className="nsp-recfg-panel-title"><Target size={13} /> Multi-Attribute Weight Sliders</span>
                  <Badge label={`Total ${weightTotal}%`} color={weightTotal === 100 ? "success" : "warning"} variant="subtle" size="small" />
          </div>
                <div className="nsp-recfg-sliders">
                  {WEIGHT_META.map(w => {
                    const Icon = w.icon;
    return (
                      <div className="nsp-recfg-slider-row" key={w.key}>
                        <div className="nsp-recfg-slider-lbl">
                          <span className="nsp-recfg-slider-name"><Icon size={13} /> {w.label}</span>
                          <span className="nsp-recfg-slider-desc">{w.desc}</span>
        </div>
                        <input type="range" min="0" max="100" value={clusterCfg.weights[w.key]}
                          className="nsp-recfg-slider" onChange={e => setWeight(w.key, parseInt(e.target.value, 10))} />
                        <span className="nsp-recfg-slider-val">{clusterCfg.weights[w.key]}%</span>
      </div>
    );
                  })}
        </div>
      </div>

              <div className="nsp-recfg-panel">
                <div className="nsp-recfg-panel-head">
                  <span className="nsp-recfg-panel-title"><MapIcon size={13} /> Override Cluster Region</span>
        </div>
                <FdSelect
                  value={clusterCfg.region}
                  onChange={swapRegion}
                  options={REGION_OPTIONS.map(r => ({ value: r.value, label: r.label }))}
                />
                <div className="nsp-recfg-region-desc">
                  {(REGION_OPTIONS.find(r => r.value === clusterCfg.region) || REGION_OPTIONS[0]).desc}
                  <span className="nsp-recfg-region-count">
                    {(REGION_OPTIONS.find(r => r.value === clusterCfg.region) || REGION_OPTIONS[0]).stores} stores
                  </span>
        </div>
                <div className="nsp-recfg-fresh">
                  <span className="nsp-recfg-fresh-lbl"><Zap size={12} /> Need a completely new cluster matrix?</span>
                  <Button variant="stroke" size="small" icon={<RotateCcw size={13} />} iconPlacement="left"
                    onClick={() => { try { sessionStorage.setItem("acs_open_create", "1"); } catch (e) {} onBack?.(); }}>
                    Run Fresh Geographic Clustering Pipeline
                  </Button>
        </div>
        </div>
      </div>

            {/* Right — peer pool & match matrix */}
            <div className="nsp-recfg-col">
              <div className="nsp-recfg-panel nsp-recfg-panel-grow">
                <div className="nsp-recfg-panel-head">
                  <span className="nsp-recfg-panel-title"><Users size={13} /> Peer Store Pool &amp; Match Matrix</span>
                  <Badge label={`${clusterCfg.peers.filter(p => p.included).length} active`} color="info" variant="subtle" size="small" />
        </div>
                <div className="nsp-recfg-matrix">
                  <div className="nsp-recfg-matrix-head">
                    <span>Incl</span><span>Store / Location</span><span>Match</span><span>Role / Reason</span>
                  </div>
                  {clusterCfg.peers.map(p => (
                    <div key={p.id} className={`nsp-recfg-matrix-row ${!p.included ? "is-excluded" : ""}`}>
                      <span className="nsp-recfg-mx-incl">
                        <button className={`nsp-recfg-check ${p.included ? "on" : ""}`} onClick={() => togglePeer(p.id)}
                          title={p.included ? "Exclude peer" : "Include peer"}>
                          {p.included ? <Check size={12} /> : <X size={12} />}
          </button>
                      </span>
                      <span className="nsp-recfg-mx-store"><strong>{p.id}</strong> {p.loc}</span>
                      <span className="nsp-recfg-mx-score">{p.score.toFixed(1)}</span>
                      <span className="nsp-recfg-mx-role">
                        <span className="nsp-recfg-mx-role-name">{p.role}</span>
                        <span className="nsp-recfg-mx-role-reason">{p.reason}</span>
                      </span>
        </div>
                  ))}
      </div>
                <div className="nsp-recfg-matrix-foot">
                  <Button variant="stroke" size="small" icon={<Plus size={13} />} iconPlacement="left" onClick={() => setAddPeerOpen(true)}>
                    Add Custom Peer Store
                  </Button>
                  <span className="nsp-recfg-matrix-foot-hint">Filter by Format · SqFt · Market Type</span>
            </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="nsp-recfg-constraints">
            <div className="nsp-cst-cats">
              {constraintCats.map(c => {
                const Icon = c.icon;
                return (
                  <Button key={c.value} variant={constraintCat === c.value ? "primary" : "ghost"} size="small"
                    icon={<Icon size={13} />} iconPlacement="left" onClick={() => setConstraintCat(c.value)}>
                    {c.label}
                  </Button>
              );
            })}
          </div>

            <div className="nsp-cst-table">
              <div className="nsp-cst-row nsp-cst-row-head">
                <span className="nsp-cst-cell">Constraint Parameter</span>
                <span className="nsp-cst-cell">System Default</span>
                <span className="nsp-cst-cell">Working Override</span>
                <span className="nsp-cst-cell">Override Level</span>
                <span className="nsp-cst-cell">Audit Status</span>
            </div>

              {constraintCat === "financial" && <>
                {renderConstraintRow({
                  param: "Open-To-Buy Budget Cap", def: "$120,000", level: "Scenario-Only", modified: capModified.otb,
                  children: (
                    <div className="nsp-cst-input">
                      <span className="nsp-cst-prefix">$</span>
                      <input type="number" step="1000" value={constraints.otbBudget}
                        onChange={e => setCap("otbBudget", parseFloat(e.target.value) || 0)} />
              </div>
                  ),
                })}
                {renderConstraintRow({
                  param: "Target Gross Margin Floor", def: "60.0%", level: "Scenario-Only", modified: capModified.margin,
                  children: (
                    <div className="nsp-cst-input">
                      <input type="number" step="0.5" value={+(constraints.marginFloor * 100).toFixed(1)}
                        onChange={e => setCap("marginFloor", (parseFloat(e.target.value) || 0) / 100)} />
                      <span className="nsp-cst-suffix">%</span>
          </div>
                  ),
                })}
              </>}

              {constraintCat === "space" && <>
                {renderConstraintRow({
                  param: "Max Planogram Bay Allocation", def: "2 Bays (25 SKUs)", level: "Store #381 Permanent", modified: capModified.sku,
                  children: (
                    <div className="nsp-cst-input">
                      <input type="number" step="1" value={constraints.maxSKUs}
                        onChange={e => setCap("maxSKUs", parseInt(e.target.value, 10) || 0)} />
                      <span className="nsp-cst-suffix">SKUs</span>
        </div>
                  ),
                })}
                {renderConstraintRow({
                  param: "Maximum Days of Supply (DOS)", def: "120 Days", level: "Corporate Baseline", modified: false,
                  children: <span className="nsp-cst-readonly">120 Days</span>,
                })}
              </>}

              {constraintCat === "brand" && <>
                {renderConstraintRow({
                  param: "Good / Better / Best Mix Target", def: "30% / 50% / 20%", level: "Scenario-Only", modified: capModified.gbb,
                  note: "Strategic review check — soft target, not a hard solver constraint",
                  children: (
                    <div className="nsp-cst-gbb">
                      {["good", "better", "best"].map((k, i) => (
                        <div className="nsp-cst-gbb-cell" key={k}>
                          <span className="nsp-cst-gbb-lbl">{["Good", "Better", "Best"][i]}</span>
                          <div className="nsp-cst-input nsp-cst-input-sm">
                            <input type="number" step="5" value={constraints[k]}
                              onChange={e => setCap(k, parseInt(e.target.value, 10) || 0)} />
                            <span className="nsp-cst-suffix">%</span>
            </div>
            </div>
            ))}
          </div>
                  ),
                })}
                {renderConstraintRow({
                  param: "Lead Time Guardrail", def: "Removed", level: "Corporate Baseline", modified: false,
                  note: "Purged from constraint inputs per merchandising policy",
                  children: <span className="nsp-cst-readonly nsp-cst-readonly-muted">Not enforced</span>,
                })}
              </>}
          </div>
        </div>
      )}
        </div>

      {/* Sticky retrigger dock */}
      <div className="nsp-recfg-dock">
        <div className="nsp-recfg-dock-top">
          <div className="nsp-recfg-dock-version">
            <Zap size={13} />
            <span>
              {willCreateV2
                ? `Creating Scenario v${(reconfigBaselineRef.current?.version || version) + 1} (from v${reconfigBaselineRef.current?.version || version} baseline)`
                : `Overwriting working draft (v${version})`}
            </span>
        </div>
          {!locked && (
            <label className="nsp-recfg-dock-toggle">
              <input type="checkbox" checked={newVersionToggle} onChange={e => setNewVersionToggle(e.target.checked)} />
              <span>Save as new version</span>
            </label>
          )}
      </div>
        <div className="nsp-recfg-dock-mods">
          <span className="nsp-recfg-dock-mods-lbl">Modified:</span>
          {allMods.length === 0
            ? <span className="nsp-recfg-dock-mods-none">No changes yet — adjust weights, peers or caps</span>
            : allMods.map((m, i) => <Badge key={i} label={m} color="warning" variant="subtle" size="small" />)}
        </div>
        <div className="nsp-recfg-dock-actions">
          <Button variant="ghost" size="small" icon={<RotateCcw size={13} />} iconPlacement="left"
            onClick={reconfigTab === "cluster" ? revertCluster : revertConstraints}
            disabled={reconfigTab === "cluster" ? clusterMods.length === 0 : constraintMods.length === 0}>
            Revert to {reconfigTab === "cluster" ? "AI Defaults" : "System Defaults"}
          </Button>
          <Button variant="primary" size="medium" icon={<Zap size={14} />} iconPlacement="left"
            onClick={retrigger} disabled={allMods.length === 0}>
            {willCreateV2 ? `Retrigger Scenario & Run v${(reconfigBaselineRef.current?.version || version) + 1}` : "Retrigger Scenario & Run"}
          </Button>
        </div>
      </div>

      {/* Add custom peer modal */}
      {addPeerOpen && (
        <Modal isOpen={addPeerOpen} onClose={() => setAddPeerOpen(false)} title="Add Custom Peer Store" size="medium">
          <div className="nsp-addpeer">
            <div className="nsp-addpeer-filters">
              <div className="nsp-addpeer-filter">
                <span className="nsp-addpeer-filter-lbl"><Filter size={12} /> Format</span>
                <FdSelect value={peerFilters.format} onChange={v => setPeerFilters(f => ({ ...f, format: v }))}
                  options={[{ value: "all", label: "All Formats" }, { value: "Warehouse", label: "Warehouse" }, { value: "Small-Fmt", label: "Small-Format" }]} />
        </div>
              <div className="nsp-addpeer-filter">
                <span className="nsp-addpeer-filter-lbl"><Globe size={12} /> Market Type</span>
                <FdSelect value={peerFilters.market} onChange={v => setPeerFilters(f => ({ ...f, market: v }))}
                  options={[{ value: "all", label: "All Markets" }, ...MARKET_CONTEXTS.map(m => ({ value: m.label, label: m.label }))]} />
      </div>
      </div>
            <div className="nsp-addpeer-list">
              {filteredCandidates.length === 0
                ? <div className="nsp-addpeer-empty">No candidate stores match these filters.</div>
                : filteredCandidates.map(c => (
                  <div key={c.id} className="nsp-addpeer-row">
                    <div className="nsp-addpeer-row-main">
                      <span className="nsp-addpeer-store"><strong>{c.id}</strong> {c.loc}</span>
                      <span className="nsp-addpeer-attrs">
                        <Badge label={c.format} color="default" variant="stroke" size="small" />
                        <Badge label={`${c.sqft}k sqft`} color="default" variant="stroke" size="small" />
                        <Badge label={`${c.proDensity} pro`} color="default" variant="stroke" size="small" />
                      </span>
            </div>
                    <Button variant="stroke" size="small" icon={<Plus size={12} />} iconPlacement="left" onClick={() => addCustomPeer(c)}>
                      Add
                    </Button>
              </div>
            ))}
          </div>
        </div>
        </Modal>
      )}
    </div>
  );

  // ── Reconcile & Approve tab (Existing Store flow only) ──
  const rk = reconcileModel.kpi;
  const reconcilePanel = (
    <div className="nsp-rec">
      {/* KPI ribbon — Open-To-Buy · Gross Margin · Sales Budget */}
      <div className="nsp-rec-ribbon">
        {/* Open-To-Buy (receipt dollars) */}
        <Card size="small" sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
          <div className={`nsp-rec-kpi ${rk.receipt.breach ? "is-breach" : "is-ok"}`}>
            <div className="nsp-rec-kpi-top">
              <span className="nsp-rec-kpi-eyebrow"><Activity size={13} /> Open-To-Buy · Receipts</span>
              <Badge
                label={rk.receipt.breach ? `Over Budget ${fmtMoneyK(Math.abs(rk.receipt.remaining))}` : `Surplus ${fmtMoneyK(rk.receipt.remaining)}`}
                color={rk.receipt.breach ? "error" : "success"}
                variant="subtle"
                size="small"
              />
            </div>
            <div className="nsp-rec-kpi-figure">
              <span className="nsp-rec-kpi-val">{fmtMoneyK(rk.receipt.value)}</span>
              <span className="nsp-rec-kpi-of">of {fmtMoneyK(rk.receipt.budget)} budget</span>
            </div>
            <div className="nsp-rec-kpi-track">
              <div className="nsp-rec-kpi-fill" style={{ width: `${rk.receipt.pct}%`, background: rk.receipt.breach ? "#dc2626" : "linear-gradient(90deg,#4f46e5,#818cf8)" }} />
            </div>
            <div className="nsp-rec-kpi-foot">Committed receipt dollars vs. enterprise OTB cap</div>
          </div>
        </Card>

        {/* Gross Margin % */}
        <Card size="small" sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
          <div className={`nsp-rec-kpi ${rk.gm.breach ? "is-breach" : "is-ok"}`}>
            <div className="nsp-rec-kpi-top">
              <span className="nsp-rec-kpi-eyebrow"><TrendingUp size={13} /> Gross Margin</span>
              <Badge
                label={rk.gm.breach ? "Below Floor" : "On Target"}
                color={rk.gm.breach ? "error" : "success"}
                variant="subtle"
                size="small"
              />
            </div>
            <div className="nsp-rec-kpi-figure">
              <span className="nsp-rec-kpi-val">{(rk.gm.value * 100).toFixed(1)}%</span>
              <span className="nsp-rec-kpi-of">floor {(rk.gm.floor * 100).toFixed(0)}%</span>
            </div>
            <div className="nsp-rec-kpi-track">
              <div className="nsp-rec-kpi-fill" style={{ width: `${rk.gm.pct}%`, background: rk.gm.breach ? "#dc2626" : "linear-gradient(90deg,#059669,#34d399)" }} />
            </div>
            <div className="nsp-rec-kpi-foot">Sales-weighted blended margin across the assorted plan</div>
          </div>
        </Card>

        {/* Sales Budget ($ and units) */}
        <Card size="small" sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
          <div className={`nsp-rec-kpi ${rk.sales.breach ? "is-breach" : "is-ok"}`}>
            <div className="nsp-rec-kpi-top">
              <span className="nsp-rec-kpi-eyebrow"><Target size={13} /> Sales Budget</span>
              <Badge
                label={rk.sales.breach ? `Under Plan ${(rk.sales.varPct * 100).toFixed(1)}%` : `${rk.sales.varPct >= 0 ? "+" : ""}${(rk.sales.varPct * 100).toFixed(1)}% vs plan`}
                color={rk.sales.breach ? "error" : "success"}
                variant="subtle"
                size="small"
              />
            </div>
            <div className="nsp-rec-kpi-figure">
              <span className="nsp-rec-kpi-val">{fmtMoneyK(rk.sales.dollars)}</span>
              <span className="nsp-rec-kpi-of">{rk.sales.units.toLocaleString()} units</span>
            </div>
            <div className="nsp-rec-kpi-track">
              <div className="nsp-rec-kpi-fill" style={{ width: `${rk.sales.pct}%`, background: rk.sales.breach ? "#dc2626" : "linear-gradient(90deg,#0ea5e9,#38bdf8)" }} />
            </div>
            <div className="nsp-rec-kpi-foot">Projected sales vs. plan of record ({fmtMoneyK(rk.sales.budgetDollars)} · {rk.sales.budgetUnits.toLocaleString()} units)</div>
          </div>
        </Card>
      </div>

      {/* Aggregated, read-only roll-up at the Class level */}
      <Card size="small" sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
        <div className="nsp-rec-rollup-head-bar">
          <div className="nsp-rec-rollup-head-text">
            <span className="nsp-rec-rollup-title">Financial Roll-Up · by Class</span>
            <span className="nsp-rec-rollup-sub">{scopeForm.department} · aggregated from {included.length} assorted options — read-only</span>
          </div>
          <Badge label="Read-only" color="default" variant="stroke" size="small" />
        </div>
        <div className="nsp-rec-table">
          <div className="nsp-rec-thead">
            <span className="nsp-rec-th">Class</span>
            <span className="nsp-rec-th nsp-rec-th-r">Options</span>
            <span className="nsp-rec-th nsp-rec-th-r">Receipt Units</span>
            <span className="nsp-rec-th nsp-rec-th-r">Receipt $ (OTB)</span>
            <span className="nsp-rec-th nsp-rec-th-r">Sales Units</span>
            <span className="nsp-rec-th nsp-rec-th-r">Sales $</span>
            <span className="nsp-rec-th nsp-rec-th-r">GM %</span>
            <span className="nsp-rec-th nsp-rec-th-r">OTB Mix</span>
          </div>
          {reconcileModel.rows.map(r => (
            <div key={r.cls} className="nsp-rec-row">
              <span className="nsp-rec-td nsp-rec-td-cls">
                <span className="nsp-rec-cls-name">{r.cls}</span>
                <span className="nsp-rec-cls-sub">{r.sub}</span>
              </span>
              <span className="nsp-rec-td nsp-rec-td-r">{r.options}</span>
              <span className="nsp-rec-td nsp-rec-td-r">{r.recUnits.toLocaleString()}</span>
              <span className="nsp-rec-td nsp-rec-td-r nsp-rec-td-strong">{fmtMoneyK(r.recDollars)}</span>
              <span className="nsp-rec-td nsp-rec-td-r">{r.salesUnits.toLocaleString()}</span>
              <span className="nsp-rec-td nsp-rec-td-r">{fmtMoneyK(r.salesDollars)}</span>
              <span className={`nsp-rec-td nsp-rec-td-r ${r.gm < constraints.marginFloor ? "nsp-rec-td-warn" : ""}`}>{(r.gm * 100).toFixed(1)}%</span>
              <span className="nsp-rec-td nsp-rec-td-r">
                <span className="nsp-rec-share">
                  <span className="nsp-rec-share-bar"><span className="nsp-rec-share-fill" style={{ width: `${Math.round(r.otbShare * 100)}%` }} /></span>
                  <span className="nsp-rec-share-val">{Math.round(r.otbShare * 100)}%</span>
                </span>
              </span>
            </div>
          ))}
          <div className="nsp-rec-row nsp-rec-row-total">
            <span className="nsp-rec-td nsp-rec-td-cls">Total Store</span>
            <span className="nsp-rec-td nsp-rec-td-r">{reconcileModel.total.options}</span>
            <span className="nsp-rec-td nsp-rec-td-r">{reconcileModel.total.recUnits.toLocaleString()}</span>
            <span className={`nsp-rec-td nsp-rec-td-r nsp-rec-td-strong ${rk.receipt.breach ? "nsp-rec-td-warn" : ""}`}>{fmtMoneyK(reconcileModel.total.recDollars)}</span>
            <span className="nsp-rec-td nsp-rec-td-r">{reconcileModel.total.salesUnits.toLocaleString()}</span>
            <span className="nsp-rec-td nsp-rec-td-r">{fmtMoneyK(reconcileModel.total.salesDollars)}</span>
            <span className={`nsp-rec-td nsp-rec-td-r ${rk.gm.breach ? "nsp-rec-td-warn" : ""}`}>{(reconcileModel.total.gm * 100).toFixed(1)}%</span>
            <span className="nsp-rec-td nsp-rec-td-r">100%</span>
          </div>
        </div>
      </Card>

      {/* Reconcile & approve footer */}
      <div className={`nsp-rec-approve ${anyBreach ? "is-blocked" : "is-clear"}`}>
        <div className="nsp-rec-approve-status">
          {anyBreach ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <div className="nsp-rec-approve-text">
            <span className="nsp-rec-approve-title">
              {anyBreach ? "Budget breach — resolve before approval" : "Plan reconciles to all budgets"}
            </span>
            <span className="nsp-rec-approve-sub">
              {anyBreach
                ? "One or more headline budgets is in breach. Re-configure caps or the line plan to clear the red flags."
                : "Open-To-Buy, Gross Margin and Sales Budget are all within tolerance."}
            </span>
          </div>
        </div>
        {!locked && (
          <Button
            variant="primary"
            size="small"
            icon={<ShieldCheck size={13} />}
            iconPlacement="left"
            disabled={anyBreach || !tier1Finalized}
            onClick={() => setSignOffOpen(true)}
          >
            {tier1Finalized ? "Submit for Approval" : "Finalize line plan first"}
          </Button>
        )}
        {locked && (
          <Badge label="Approved & Locked" color="info" variant="subtle" size="small" />
        )}
      </div>
    </div>
  );

  // Existing Store Reco retires the monthly WP-override tab (its filters now live
  // on the Line Plan) and adds Reconcile & Approve. New Store keeps the full trio.
  const tabNames = recoInsights
    ? [
        { label: "Line Plan & Architecture", value: "tier1" },
        { label: "Weekly Buy Plan (WSSI)",   value: "tier3" },
        { label: "Reconcile & Approve",      value: "reconcile" },
      ]
    : [
        { label: "Line Plan & Architecture",      value: "tier1" },
        { label: "Financial Plan Reconciliation", value: "tier2" },
        { label: "Weekly Buy Plan (WSSI)",        value: "tier3" },
      ];
  const tabPanels = recoInsights
    ? [
        tier1Panel,
        <Tier3WssiEngine included={included} locked={locked} />,
        reconcilePanel,
      ]
    : [
        tier1Panel,
        <Tier2OverrideGrid
          included={included}
          buyQty={buyQty}
          drops={drops}
          locked={locked}
          onReport={setTier2Report}
          onSubmitApproved={tier1Finalized ? () => setSignOffOpen(true) : undefined}
        />,
        <Tier3WssiEngine included={included} locked={locked} />,
      ];

  return (
    <div
      className="nsp-eng-tier1 nsp-fade-up"
      ref={cardRef}
      style={{
        "--nsp-t1-tabnav-top": `${tabNavOffset}px`,
        "--nsp-t1-kpi-top": `${kpiStickyOffset}px`,
      }}
    >

      {/* ── Sticky head: tier title/actions + persistent context bar ─────────── */}
      <div className="nsp-t1-sticky-head" ref={stickyHeadRef}>
        <div className="nsp-eng-tier-header">
          <div className="nsp-eng-tier-left">
            <button className="nsp-eng-back-btn" onClick={onBack} title="Back to New Store Planning">
              <ArrowLeft size={15} />
            </button>
            <div className="nsp-eng-tier-badge">ASSORTMENT</div>
        <div>
              <div className="nsp-eng-tier-title">Line Plan & Architecture</div>
              <div className="nsp-eng-tier-sub">
                Smart Assortment Recommendation Engine · {scopeForm.scenarioName}
          </div>
        </div>
          </div>
          <div className="nsp-eng-tier-actions">
            {locked ? (
              <Button variant="primary" size="small" icon={<Lock size={13} />} iconPlacement="left" disabled>
                Master Plan Locked
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="small" icon={<RotateCcw size={13} />} iconPlacement="left" onClick={openReconfigure}>
                  Re-configure
                </Button>
                <Button
                  variant="stroke"
                  size="small"
                  icon={justSaved ? <Check size={13} /> : <Save size={13} />}
                  iconPlacement="left"
                  onClick={handleSaveScenario}
                >
                  {justSaved ? "Saved" : "Save Scenario"}
                </Button>
                <Button
                  variant="stroke"
                  size="small"
                  icon={tier1Finalized ? <Check size={13} /> : <ArrowRight size={13} />}
                  iconPlacement="right"
                  onClick={() => { setTier1Finalized(true); setActiveTier(recoInsights ? "tier3" : "tier2"); }}
                >
                  {tier1Finalized ? "Line Plan Finalized" : "Finalize Line Plan"}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  icon={<ShieldCheck size={13} />}
                  iconPlacement="left"
                  disabled={!tier1Finalized}
                  onClick={() => setSignOffOpen(true)}
                >
                  Submit Approved Plan
                </Button>
              </>
            )}
          </div>
      </div>

        {/* ── Persistent context bar ──────────────────────────────────────────── */}
        {contextBar}
            </div>

      {/* ── Locked banner ─────────────────────────────────────────────────────── */}
      {locked && !reconfigOpen && !rerunning && (
        <div className="nsp-lock-banner">
          <Lock size={14} />
          <span><strong>Master plan locked.</strong> Approved by {auditRecord?.merchant?.name} · {auditRecord ? new Date(auditRecord.timestamp).toLocaleString() : ""} — all tiers are read-only.</span>
          <span className="nsp-lock-banner-spacer" />
          <Button variant="ghost" size="small" icon={auditOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />} iconPlacement="right" onClick={() => setAuditOpen(v => !v)}>
            {auditOpen ? "Hide audit trail" : "Show audit trail"}
          </Button>
          </div>
      )}

      {/* ── Post-finalization action bar ──────────────────────────────────────── */}
      {locked && !reconfigOpen && !rerunning && (
        <div className="nsp-postfin-bar">
          <Button variant="stroke" size="small" icon={<FileDown size={13} />} iconPlacement="left" onClick={exportAuditCSV}>
            Export Audit (CSV)
          </Button>
          <Button variant="stroke" size="small" icon={<FileText size={13} />} iconPlacement="left" onClick={() => window.print()}>
            Export Report (PDF)
          </Button>
          <Button variant="stroke" size="small" icon={<FilePlus2 size={13} />} iconPlacement="left" onClick={createVariant}>
            Create New Scenario Variant
          </Button>
          <span className="nsp-postfin-spacer" />
          <Button variant="primary" size="small" icon={<Home size={13} />} iconPlacement="left" onClick={onBack}>
            Return to Studio Dashboard
          </Button>
      </div>
      )}

      {/* ── Scenario comparison banner (after a versioned retrigger) ──────────── */}
      {compare && !reconfigOpen && !rerunning && (
        <div className="nsp-cmp-banner nsp-fade-up">
          <div className="nsp-cmp-head">
            <div className="nsp-cmp-head-icon"><GitCompare size={15} /></div>
            <div className="nsp-cmp-head-text">
              <div className="nsp-cmp-title">
                {compare.mode === "v2"
                  ? `Scenario v${compare.v2.version} created — v${compare.v1.version} baseline preserved`
                  : `Scenario v${compare.v2.version} overwritten with retriggered values`}
            </div>
              <div className="nsp-cmp-sub">Side-by-side of the retriggered guardrails &amp; cluster context</div>
          </div>
            <button className="nsp-cmp-close" onClick={() => setCompare(null)} title="Dismiss"><X size={14} /></button>
      </div>
          <div className="nsp-cmp-grid">
            {[
              { lbl: "Cluster Region", v1: compare.v1.region, v2: compare.v2.region },
              { lbl: "OTB Cap",        v1: fmtMoneyK(compare.v1.caps.otbBudget), v2: fmtMoneyK(compare.v2.caps.otbBudget) },
              { lbl: "Margin Floor",   v1: `${(compare.v1.caps.marginFloor * 100).toFixed(0)}%`, v2: `${(compare.v2.caps.marginFloor * 100).toFixed(0)}%` },
              { lbl: "Max SKUs",       v1: `${compare.v1.caps.maxSKUs}`, v2: `${compare.v2.caps.maxSKUs}` },
              { lbl: "GBB Mix",        v1: `${compare.v1.caps.good}/${compare.v1.caps.better}/${compare.v1.caps.best}`, v2: `${compare.v2.caps.good}/${compare.v2.caps.better}/${compare.v2.caps.best}` },
            ].map(row => {
              const changed = String(row.v1) !== String(row.v2);
              return (
                <div key={row.lbl} className={`nsp-cmp-row ${changed ? "is-changed" : ""}`}>
                  <span className="nsp-cmp-row-lbl">{row.lbl}</span>
                  <span className="nsp-cmp-row-v1">v{compare.v1.version}: {row.v1}</span>
                  <ArrowRight size={12} className="nsp-cmp-arrow" />
                  <span className="nsp-cmp-row-v2">v{compare.v2.version}: {row.v2}</span>
          </div>
  );
            })}
        </div>
          {compare.v2.excluded?.length > 0 && (
            <div className="nsp-cmp-excl">
              <Users size={12} /> Peers excluded: {compare.v2.excluded.join(", ")}
      </div>
          )}
        </div>
      )}

      {/* ── Reconfigure re-run: Glass-Box terminal ────────────────────────────── */}
      {rerunning && (
        <div className="nsp-recfg-rerun">
          <div className="nsp-recfg-rerun-note">
            <Zap size={13} /> Retriggering scenario with revised {clusterMods.length ? "cluster" : ""}{clusterMods.length && constraintMods.length ? " + " : ""}{constraintMods.length ? "constraint" : ""} inputs · cached store metadata reused
          </div>
          <EngineTerminal
            scopeForm={{ ...scopeForm, scenarioName: `${scopeForm.scenarioName}${willCreateV2 ? ` · v${(reconfigBaselineRef.current?.version || version) + 1}` : ""}` }}
            onComplete={onRerunComplete}
          />
        </div>
      )}

      {/* ── Reconfigure studios (Cluster / Constraints) ───────────────────────── */}
      {reconfigOpen && !rerunning && renderReconfigure()}

      {/* ── Tier tabs ──
          A hand-rolled strip rather than the Impact UI <Tabs> component —
          the library renders its tab list as a MUI `Tabs` root, and (verified
          at length) that specific element never honors `position: sticky`
          regardless of how it's styled, while a plain div in the exact same
          slot sticks perfectly. Rolling our own keeps the same look/values
          and guarantees the freeze-on-scroll behaviour actually works. */}
      {!reconfigOpen && !rerunning && (
        <div className="nsp-t1-tabs" ref={tabsWrapRef}>
          <div className="nsp-t1-tabstrip" role="tablist" aria-label="Assortment tiers">
            {tabNames.map(t => (
          <button
                key={t.value}
            type="button"
                role="tab"
                aria-selected={activeTier === t.value}
                className={`nsp-t1-tabstrip-btn${activeTier === t.value ? " is-active" : ""}`}
                onClick={() => setActiveTier(t.value)}
              >
                {t.label}
          </button>
            ))}
          </div>
          <div className="nsp-t1-tabpanel" role="tabpanel">
            {tabPanels[tabNames.findIndex(t => t.value === activeTier)]}
          </div>
        </div>
      )}

      {/* ── Governance / audit trail panel ────────────────────────────────────── */}
      {locked && auditRecord && auditOpen && !reconfigOpen && !rerunning && (
        <div className="nsp-audit-panel nsp-fade-up">
          <div className="nsp-audit-head">
            <div className="nsp-audit-head-icon"><ShieldCheck size={15} /></div>
            <div className="nsp-audit-head-text">
              <div className="nsp-audit-title">Governance & Audit Trail</div>
              <div className="nsp-audit-sub">
                Signed off by <strong>{auditRecord.merchant.name}</strong> · {auditRecord.merchant.role} ·{" "}
                {new Date(auditRecord.timestamp).toLocaleString()}
        </div>
          </div>
            <Badge label={`v${version} · Approved & Locked`} color="info" variant="subtle" size="small" />
        </div>

          {auditRecord.notes && (
            <div className="nsp-audit-notes">
              <FileText size={13} />
              <span>{auditRecord.notes}</span>
          </div>
        )}

          <div className="nsp-audit-section-label">Override History — manual edits vs. AI baseline</div>
          {overrideRows.length > 0 ? (
            <div className="nsp-audit-table">
              <Table
                defaultColDef={{ resizable: true, sortable: true }}
                columnDefs={auditColumns}
                rowData={overrideRows}
                domLayout="autoHeight"
                cardContainer
                hideTableSetting
                hideTableActions
                suppressPaginationPanel
                pagination={false}
              />
      </div>
          ) : (
            <div className="nsp-audit-empty">No manual overrides — plan matches the AI baseline exactly.</div>
          )}

          <div className="nsp-audit-section-label">Settings Snapshot</div>
          <div className="nsp-audit-settings">
            <div className="nsp-audit-setting">
              <span className="nsp-audit-setting-lbl">Peer Cluster Weights</span>
              <div className="nsp-audit-chips">
                {Object.entries(auditRecord.settings.peerWeights).map(([k, v]) => (
                  <Badge key={k} label={`${k} ${v}%`} color="default" variant="stroke" size="small" />
                ))}
            </div>
          </div>
            <div className="nsp-audit-setting">
              <span className="nsp-audit-setting-lbl">Store Exclusions</span>
              <span className="nsp-audit-setting-val">{auditRecord.settings.exclusions}</span>
      </div>
            <div className="nsp-audit-setting">
              <span className="nsp-audit-setting-lbl">Constraint Caps</span>
              <div className="nsp-audit-chips">
                <Badge label={`OTB $${(auditRecord.settings.caps.otbBudget / 1000).toFixed(0)}k`} color="default" variant="stroke" size="small" />
                <Badge label={`Margin floor ${(auditRecord.settings.caps.marginFloor * 100).toFixed(0)}%`} color="default" variant="stroke" size="small" />
                <Badge label={`Max ${auditRecord.settings.caps.maxSKUs} SKUs`} color="default" variant="stroke" size="small" />
            </div>
          </div>
      </div>
        </div>
      )}

      {/* ── Sign-Off pre-flight modal ─────────────────────────────────────────── */}
      <Modal
        open={signOffOpen}
        onClose={() => setSignOffOpen(false)}
        width="560px"
        maxHeight="88vh"
        title="Submit Approved Plan — Sign-Off"
      >
        <div className="nsp-signoff">
          <p className="nsp-signoff-lead">
            Review the final plan health before locking. Once submitted, all three tiers become read-only
            and a governance record is written.
          </p>
          <div className="nsp-signoff-grid">
            {[
              { label: "Final SKU Count", value: `${agg.wpAssorted}`, sub: `of ${constraints.maxSKUs} max`, pass: agg.wpAssorted <= constraints.maxSKUs },
              { label: "OTB Committed", value: `$${(agg.otbUsed / 1000).toFixed(1)}k`, sub: `of $${otbBudgetK}k`, pass: !agg.exceeded },
              { label: "Blended Margin", value: `${(agg.blendedMargin * 100).toFixed(1)}%`, sub: `floor ${(constraints.marginFloor * 100).toFixed(0)}%`, pass: marginGap >= 0 },
            ].map(t => (
              <div key={t.label} className="nsp-signoff-tile">
                <div className="nsp-signoff-tile-top">
                  <span className="nsp-signoff-tile-lbl">{t.label}</span>
                  <Badge label={t.pass ? "PASS" : "CHECK"} color={t.pass ? "success" : "warning"} variant="subtle" size="small" />
          </div>
                <div className="nsp-signoff-tile-val">{t.value}</div>
                <div className="nsp-signoff-tile-sub">{t.sub}</div>
        </div>
            ))}
      </div>

          <div className="nsp-signoff-notes">
            <label className="nsp-signoff-notes-lbl">
              Sign-Off Notes <span className="nsp-signoff-req">required</span>
            </label>
            <TextArea
              placeholder="e.g. Approved v1 line plan with reduced OTB cap and higher Hickory allocation. Peer pool validated against Bozeman/Spokane."
              value={signOffNotes}
              onChange={(e) => setSignOffNotes(e.target.value)}
              width="100%"
              height="90px"
            />
          </div>

          <div className="nsp-signoff-footer">
            <Button variant="ghost" size="medium" onClick={() => setSignOffOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              size="medium"
              icon={<Lock size={14} />}
              iconPlacement="left"
              disabled={!signOffNotes.trim()}
              onClick={confirmSignOff}
            >
              Confirm &amp; Lock Plan
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewStorePlanningNew({ onNavigate }) {
  const newStores = useMemo(() => LOCATIONS.filter(l => l.storeType === "New Store"), []);
  const [selectedId, setSelectedId] = useState("");

  // Market intel phase: idle | loading | running | results
  const [phase, setPhase]           = useState("idle");
  const [logs, setLogs]             = useState([]);
  const [progress, setProgress]     = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const logEndRef = useRef(null);
  const timers = useRef([]);

  // Assortment engine state machine: landing | modal | running | tier1
  const [engineState, setEngineState] = useState("landing");
  const [engineReady, setEngineReady] = useState(false);
  const [scopeForm, setScopeForm]     = useState(null);

  // ── Saved scenarios (persisted) ──
  const [savedScenarios, setSavedScenarios] = useState(() => {
    try {
      const raw = localStorage.getItem("nsp_saved_scenarios");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const reopenGuard = useRef(false);

  useEffect(() => {
    try { localStorage.setItem("nsp_saved_scenarios", JSON.stringify(savedScenarios)); } catch { /* quota / privacy mode */ }
  }, [savedScenarios]);

  const upsertScenario = (snap) => {
    setSavedScenarios(prev => {
      const idx = prev.findIndex(s => s.id === snap.id);
      if (idx === -1) return [snap, ...prev];
      const next = [...prev];
      next[idx] = snap;
      return next;
    });
  };
  const deleteScenario = (id) => setSavedScenarios(prev => prev.filter(s => s.id !== id));
  const openScenario = (snap) => {
    reopenGuard.current = true;
    setActiveSnapshot(snap);
    setScopeForm(snap.scope);
    setSelectedId(String(snap.storeId));
    setPhase("results");
    setEngineState("tier1");
  };

  const store = useMemo(
    () => LOCATIONS.find(l => String(l.id) === String(selectedId)) || null,
    [selectedId]
  );
  const inputRecord = store ? NEW_STORE_INPUTS[store.id] : null;
  const intel = store ? MARKET_INTEL[store.id] : null;
  const fdValue = label => inputRecord?.fdProvided?.find(r => r.label === label)?.value ?? "—";

  // Reset on store change
  useEffect(() => {
    // Skip the reset when we're re-opening a saved scenario (jump straight to Tier 1)
    if (reopenGuard.current) { reopenGuard.current = false; return; }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLogs([]); setProgress(0);
    setEngineState("landing");
    setEngineReady(false);
    setActiveSnapshot(null);
    if (!selectedId) { setPhase("idle"); return; }
    // Stage 1: load the store profile, then seamlessly continue into market-context hydration
    setPhase("loading");
  }, [selectedId]);

  // Unified hydration driver — the SAME progress engine powers both stages
  // (store profile → market context) so the two loads feel like one sequence.
  // Feels like streaming pre-computed data from the backend (not a live fetch).
  useEffect(() => {
    if (phase !== "loading" && phase !== "intel") return;
    setProgress(0);
    const DURATION = phase === "loading" ? 2000 : 4200;
    const nextPhase = phase === "loading" ? "intel" : "results";
    const gap = phase === "loading" ? 260 : 550;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(100, Math.round(((now - start) / DURATION) * 100));
      setProgress(p);
      if (p < 100) { raf = requestAnimationFrame(tick); }
      else { timers.current.push(setTimeout(() => setPhase(nextPhase), gap)); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Re-hydrate market context (used by the "Refresh" action on the results view)
  function rerunIntel() {
    setProgress(0);
    setPhase("intel");
  }

  // Shared premium hydration card — one visual language for both load stages
  const renderHydration = ({ title, badge, desc, sources }) => {
    const per       = 100 / sources.length;
    const activeIdx = Math.min(sources.length - 1, Math.floor(progress / per));
    const activeLbl = sources[activeIdx]?.label || "Finalizing";
    return (
      <Card sx={{
        ...panelSx,
        padding: "24px 28px 26px",
        background: "linear-gradient(135deg, #f5f3ff 0%, #fafafe 42%, #fff 100%)",
        borderLeft: "4px solid #6366f1",
        boxShadow: "0 2px 18px rgba(99,102,241,.10)",
      }}>
        <div className="nsp-intel-load">
          <div className="nsp-intel-load-head">
            <div className="nsp-intel-load-glyph">
              <span className="nsp-intel-load-ring" />
              <Globe size={20} />
            </div>
            <div className="nsp-intel-load-head-text">
              <div className="nsp-intel-load-title-row">
                <span className="nsp-intel-load-title">{title}</span>
                <Badge label={badge} color="info" variant="subtle" size="small" />
              </div>
              <p className="nsp-intel-load-desc">{desc}</p>
            </div>
          </div>

          <div className="nsp-intel-load-progress">
            <div className="nsp-intel-progress-row">
              <span className="nsp-intel-progress-lbl">{progress >= 100 ? "Finalizing" : activeLbl}…</span>
              <span className="nsp-intel-progress-pct">{progress}%</span>
            </div>
            <ProgressBar value={progress} showTime={false} status={progress >= 100 ? "completed" : "remaining"} />
          </div>

          <div className="nsp-intel-load-sources">
            {sources.map((s, i) => {
              const done   = progress >= (i + 1) * per;
              const active = !done && i === activeIdx;
              return (
                <div key={s.key} className={`nsp-intel-src ${done ? "is-done" : active ? "is-active" : "is-pending"}`}>
                  <span className="nsp-intel-src-status">
                    {done ? <Check size={13} /> : active ? <Loader size="small" /> : <span className="nsp-intel-src-dot" />}
                  </span>
                  <span className="nsp-intel-src-text">
                    <span className="nsp-intel-src-label">{s.label}</span>
                    <span className="nsp-intel-src-detail">{s.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  function handleLaunchEngine(form) {
    setScopeForm(form);
    setEngineReady(false);
    setEngineState("running");
  }

  return (
    <div className="nsp-root">

      {/* ── Page hero header ─────────────────────────────────────────────── */}
      <div className="nsp-page-hero">
        <div className="nsp-page-hero-left">
          <div className="nsp-page-eyebrow"><Cpu size={12} /> Store Planning Studio</div>
          <h1 className="nsp-page-title">New Store Planning</h1>
          <p className="nsp-page-sub">
            Select a site · auto-populate profile · run agentic market intelligence
          </p>
        </div>
        <div className="nsp-page-hero-right">
          <div className="nsp-store-count-badge">
            <Activity size={13} />
            {newStores.length} New Store{newStores.length !== 1 ? "s" : ""} · Cold-Start
          </div>
        </div>
      </div>

      {/* ── Scope drawer (left slide-over) ───────────────────────────────────── */}
      {engineState === "modal" && (
        <ScopeDrawer
          store={store}
          onClose={() => setEngineState("landing")}
          onLaunch={handleLaunchEngine}
        />
      )}

      {/* ── Engine run: CoT panel + inline recommendation (same page) ────────── */}
      {engineState === "running" && scopeForm && store && (
        <div className="nsp-eng-runner-wrap">
          <EngineTerminal
            persistent
            scopeForm={scopeForm}
            onReady={() => setEngineReady(true)}
          />
          {engineReady && (
            <Tier1LinePlan
              key={activeSnapshot?.id || scopeForm.scenarioName}
              scopeForm={scopeForm}
          store={store}
              initialSnapshot={activeSnapshot}
              onReset={() => { setScopeForm(null); setActiveSnapshot(null); setEngineReady(false); setEngineState("landing"); }}
              onBack={() => { setEngineReady(false); setEngineState("landing"); }}
              onSaveScenario={upsertScenario}
            />
          )}
        </div>
      )}

      {/* ── Tier 1 Line Plan (reopened saved scenario — no CoT panel) ─────────── */}
      {engineState === "tier1" && scopeForm && store && (
        <Tier1LinePlan
          key={activeSnapshot?.id || scopeForm.scenarioName}
          scopeForm={scopeForm}
          store={store}
          initialSnapshot={activeSnapshot}
          onReset={() => { setScopeForm(null); setActiveSnapshot(null); setEngineState("landing"); }}
          onBack={() => setEngineState("landing")}
          onSaveScenario={upsertScenario}
        />
      )}

      {/* ── Landing / Market Intel ───────────────────────────────────────────── */}
      {(engineState === "landing" || engineState === "modal") && (
        <>

      {/* ── Store selector card + Trigger button ────────────────────────────── */}
      <div className="nsp-selector-card">
        <div className="nsp-selector-top-row">
          <div>
        <div className="nsp-selector-label">
          <Building2 size={13} /> Select New Store
        </div>
        <p className="nsp-selector-hint">
          Showing stores flagged as <strong>New Store</strong> in Location Attributes
        </p>
            <FdSelect
              label="New Store"
              value={selectedId}
              options={newStores.map(s => ({ value: String(s.id), label: `#${s.id}  ${s.name.replace(/^\d+\s+/, "")}  (${s.state})` }))}
          onChange={id => setSelectedId(id)}
              width={400}
              isWithSearch
            />
          </div>
          <div className="nsp-eng-trigger-wrap">
            <Button
              variant="primary"
              size="large"
              icon={<Zap size={16} />}
              iconPlacement="left"
              disabled={phase !== "results"}
              onClick={() => setEngineState("modal")}
              className={phase === "results" ? "nsp-eng-trigger-pulse" : ""}
            >
              Trigger Assortment Engine
            </Button>
            {phase !== "results" && (
              <div className="nsp-eng-trigger-hint">
                Available once market intelligence loads
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Saved Scenarios ─────────────────────────────────────────────── */}
      {savedScenarios.length > 0 && (
        <div className="nsp-saved-card">
          <div className="nsp-saved-header">
            <ClipboardList size={14} className="nsp-saved-icon" />
            <span>Saved Scenarios</span>
            <Badge label={`${savedScenarios.length}`} color="default" variant="stroke" size="small" />
            <span className="nsp-saved-hint">Click a scenario to reopen its line plan</span>
          </div>
          <div className="nsp-saved-list">
            {savedScenarios.map(snap => {
              const sc = snap.scope || {};
              const scPath = [
                sc.department,
                Array.isArray(sc.subdepartment) ? sc.subdepartment.join(" + ") : sc.subdepartment,
                Array.isArray(sc.cls) ? (sc.cls.filter(c => c !== "All Classes").join(" + ") || "All Classes") : sc.cls,
              ].filter(Boolean).join(" › ");
              const st = LOCATIONS.find(l => String(l.id) === String(snap.storeId));
              const approved = snap.status === "approved";
              return (
                <div key={snap.id} className="nsp-saved-row" role="button" tabIndex={0}
                  onClick={() => openScenario(snap)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openScenario(snap); } }}>
                  <div className="nsp-saved-row-main">
                    <div className="nsp-saved-row-top">
                      <span className="nsp-saved-name">{snap.name}</span>
                      <Badge
                        label={approved ? "Approved & Locked" : "Working Draft"}
                        color={approved ? "info" : "warning"}
                        variant="subtle"
                        size="small"
                      />
                      <span className="nsp-saved-ver">v{snap.version || 1}</span>
                    </div>
                    <div className="nsp-saved-row-sub">
                      <span><MapPin size={11} /> #{snap.storeId} {st ? `${st.market}, ${st.state}` : ""}</span>
                      <span className="nsp-saved-dot">·</span>
                      <span>{scPath || "—"}</span>
                      <span className="nsp-saved-dot">·</span>
                      <span><Clock size={11} /> {new Date(snap.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="nsp-saved-row-metrics">
                    <div className="nsp-saved-metric">
                      <span className="nsp-saved-metric-val">{snap.metrics?.skuCount ?? "—"}</span>
                      <span className="nsp-saved-metric-lbl">SKUs</span>
                    </div>
                    <div className="nsp-saved-metric">
                      <span className="nsp-saved-metric-val">${((snap.metrics?.otbUsed || 0) / 1000).toFixed(0)}k</span>
                      <span className="nsp-saved-metric-lbl">OTB</span>
                    </div>
                    <div className="nsp-saved-metric">
                      <span className="nsp-saved-metric-val">{((snap.metrics?.blendedMargin || 0) * 100).toFixed(1)}%</span>
                      <span className="nsp-saved-metric-lbl">GM</span>
                    </div>
                  </div>
                  <div className="nsp-saved-row-actions">
                    <Button variant="ghost" size="small" icon={<ArrowRight size={13} />} iconPlacement="right"
                      onClick={e => { e.stopPropagation(); openScenario(snap); }}>Open</Button>
                    <button className="nsp-saved-del" title="Delete scenario"
                      onClick={e => { e.stopPropagation(); deleteScenario(snap.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Waiting state — no store selected yet ────────────────────────── */}
      {!selectedId && newStores.length > 0 && (
        <div className="nsp-waiting-state" key="waiting">
          <div className="nsp-wait-glyph">
            <div className="nsp-wait-ring nsp-wait-ring-outer" />
            <div className="nsp-wait-ring nsp-wait-ring-inner" />
            <div className="nsp-wait-icon">
              <MapPin size={22} strokeWidth={1.5} />
            </div>
          </div>
          <div className="nsp-wait-heading">Select a new store to begin</div>
          <div className="nsp-wait-desc">
            Choose a store from the dropdown above — the profile and market&nbsp;intelligence will load automatically.
          </div>
        </div>
      )}

      {/* ── Stage 1: store-profile hydration (same visual language as Stage 2) ── */}
      {store && phase === "loading" && (
        <div className="nsp-hydration-wrap" key={`sk-${selectedId}`}>
          {renderHydration({
            title: "Loading Store Profile",
            badge: "Reading",
            desc: (
              <>Loading the store master record &amp; <strong>F&amp;D-provided specifications</strong> for{" "}
              {store.market}, {store.state} — store attributes, format, size, opening window and geo coordinates.</>
            ),
            sources: STORE_SOURCES,
          })}
        </div>
      )}

      {/* ── Store profile — revealed after loading ────────────────────────── */}
      {store && phase !== "loading" ? (
        <div className="nsp-store-reveal" key={`reveal-${selectedId}`}>
          {/* Hero banner */}
          <div className="nsp-store-hero">
            <div className="nsp-store-hero-content">
              <div className="nsp-store-hero-left">
                <div className="nsp-hero-badges">
                  <Badge label="New Store"      color="warning" variant="subtle" size="small" />
                  <Badge label={`#${store.id}`} color="default" variant="stroke"  size="small" />
                  <Badge label="Cold-Start"     color="info"    variant="subtle" size="small" />
                </div>
                <div className="nsp-hero-name">
                  {store.name.replace(/^\d+\s/, "")}
                  <span className="nsp-hero-state">, {store.state}</span>
                </div>
                <div className="nsp-hero-meta">
                  <span><MapPin size={11} /> {store.market}</span>
                  <span>·</span>
                  <span>{store.region}</span>
                  <span>·</span>
                  <span>{store.sqft ? store.sqft.toLocaleString() : "55,000"} sq ft</span>
                  <span>·</span>
                  <span>Opening: {store.openingDate || "SS26 · Aug 2026"}</span>
                </div>
              </div>
              <div className="nsp-store-hero-right">
                <div className="nsp-hero-coord-block">
                  <div className="nsp-hero-coord-label">Coordinates</div>
                  <div className="nsp-hero-coord">{store.lat?.toFixed(4)}°N</div>
                  <div className="nsp-hero-coord">{Math.abs(store.lon)?.toFixed(4)}°W</div>
                </div>
              </div>
            </div>
          </div>

          {/* Store Information card */}
          <div className="nsp-info-card">
            <div className="nsp-info-card-header">
              <Building2 size={14} className="nsp-info-icon" />
              <span>Store Information</span>
              <span className="nsp-info-badge">F&amp;D Provided · Read-only</span>
            </div>
            <div className="nsp-info-grid">
              {[
                { label: "Store Name",           value: store.name.replace(/^\d+\s/, "") },
                { label: "Store Number",         value: `#${store.id}`, mono: true },
                { label: "City",                 value: store.market },
                { label: "State",                value: store.state },
                { label: "Store Type",           value: store.storeType,          accent: "#d97706" },
                { label: "Store Format",         value: fdValue("Store Format") },
                { label: "Store Size (Sq. Ft.)", value: store.sqft?.toLocaleString() || "55,000", mono: true },
                { label: "Planned Opening",      value: store.openingDate || "SS26 – Aug 2026" },
                { label: "Store Status",         value: fdValue("Store Status"),  accent: "#d97706" },
                { label: "Sales History",        value: "None",                   accent: "#94a3b8" },
                { label: "Latitude",             value: store.lat?.toFixed(4),    mono: true },
                { label: "Longitude",            value: store.lon?.toFixed(4),    mono: true },
              ].map(f => (
                <div className="nsp-info-field" key={f.label}>
                  <div className="nsp-info-field-label">{f.label}</div>
                  <div
                    className="nsp-info-field-value"
                    style={{
                      fontFamily: f.mono ? "var(--font-mono,monospace)" : undefined,
                      color: f.accent,
                    }}
                  >
                    {f.value ?? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Agentic Panel ─────────────────────────────────────────────── */}

          {phase === "intel" && renderHydration({
            title: "Loading Market Context",
            badge: "Hydrating",
            desc: (
              <>Loading external market context for the <strong>30-mile catchment area</strong> around{" "}
              {store.market}, {store.state} — including market catchment, demographics, climate,
              demand potential, and competitor insights.</>
            ),
            sources: INTEL_SOURCES,
          })}

          {phase === "results" && intel && (
            <div className="nsp-results-wrap">

              {/* ── Success bar ──────────────────────────────────────────── */}
              <div className="nsp-results-done-bar">
                <div className="nsp-results-done-left">
                  <span className="nsp-done-dot" />
                  <span>Agent complete · all data sources populated</span>
                  <span className="nsp-done-tag">market-intel-agent</span>
                </div>
                <button className="nsp-rerun-btn" onClick={rerunIntel}>↺ Refresh</button>
              </div>

              {/* ══ TWO-COLUMN BODY — left intel / right map ══════════════ */}
              <div className="nsp-results-2col">

                {/* LEFT column: KPIs + Climate stacked */}
                <div className="nsp-results-left-col">

                  {/* Market Catchment KPIs — 3×3 grid */}
                  <div className="nsp-r1-catchment nsp-fade-up" style={{ animationDelay: "0s" }}>
                    <div className="nsp-r1-header">
                      <Globe size={13} />
                    <span>30-Mile Market Catchment</span>
                      <Badge label={`${intel.catchment.zctas} ZCTAs`} color="default" variant="stroke" size="small" />
                      <span className="nsp-r1-sources">Census · Zillow · IRS</span>
                  </div>
                  <div className="nsp-kpi-grid">
                      <KpiTile animate label="Households"     value={intel.catchment.households}             prefix="" suffix=""   delay={0.04} trend="+4.1% YoY" trendUp barPct={62} />
                      <KpiTile animate label="Population"     value={intel.catchment.population}            prefix="" suffix=""   delay={0.08} trend="+3.8% YoY" trendUp barPct={58} />
                      <KpiTile animate label="Median Income"  value={58.1}                                  prefix="$" suffix="k" delay={0.12} sub="Census ACS"  trend="+6.2%"  trendUp barPct={55} />
                      <KpiTile animate label="Median Home"    value={287.5}                                 prefix="$" suffix="k" delay={0.16} sub="Zillow ZHVI" trend="+11.4%" trendUp barPct={72} />
                      <KpiTile animate label="Homeownership"  value={68.5}                                  prefix="" suffix="%"  delay={0.20} trend="Strong"    trendUp barPct={68} />
                      <KpiTile animate label="Pre-1990 Homes" value={41.2}                                  prefix="" suffix="%"  delay={0.24} sub="Remodel signal" trend="High" trendUp barPct={41} />
                      <KpiTile        label="Pro Contractor"  value={`${intel.catchment.proContractorDensity} Nat'l`} delay={0.28} trend="Above Avg" trendUp barPct={78} />
                      <KpiTile        label="Permit Growth"   value={intel.catchment.permitGrowth}          delay={0.32} sub="YoY"  trend="+8.3%"  trendUp barPct={83} />
                      <KpiTile        label="Remodel Spend"   value={intel.catchment.annualRemodelingSpend} delay={0.36} sub="/ area" trend="Strong" trendUp barPct={70} />
                  </div>
                </div>

                  {/* Climate Context */}
                  <div className="nsp-r-climate nsp-fade-up" style={{ animationDelay: "0.1s" }}>
                  <div className="nsp-result-card-header cyan">
                      <Wind size={13} />
                    <span>Climate Context</span>
                    <span className="nsp-result-badge cyan">{intel.climate.station}</span>
                  </div>
                    <div className="nsp-clim-zone-row">
                      <div className="nsp-clim-zone-icon"><Wind size={14} /></div>
                      <div className="nsp-clim-zone-info">
                        <div className="nsp-clim-zone-lbl">Climate Zone</div>
                        <div className="nsp-clim-zone-val">{intel.climate.zone}</div>
                    </div>
                      <Badge label="NOAA" color="default" variant="stroke" size="small" />
                    </div>
                    <div className="nsp-clim-temp-section">
                      <div className="nsp-clim-temp-ends">
                        <div className="nsp-clim-temp-lo">
                          <span className="nsp-clim-temp-num cold">{intel.climate.avgWinterLow}</span>
                          <span className="nsp-clim-temp-tag">Winter Low</span>
                    </div>
                        <div className="nsp-clim-temp-hi">
                          <span className="nsp-clim-temp-num warm">{intel.climate.avgSummerHigh}</span>
                          <span className="nsp-clim-temp-tag">Summer High</span>
                    </div>
                    </div>
                      <div className="nsp-temp-range-track">
                        <div className="nsp-temp-range-cold">14°F</div>
                        <div className="nsp-temp-range-warm">88°F</div>
                      </div>
                    </div>
                    <div className="nsp-clim-stats">
                      <div className="nsp-clim-stat">
                        <span className="nsp-clim-stat-lbl">Annual Precip</span>
                        <span className="nsp-clim-stat-val">{intel.climate.annualPrecip}</span>
                  </div>
                      <div className="nsp-clim-stat">
                        <span className="nsp-clim-stat-lbl">Snow Days</span>
                        <span className="nsp-clim-stat-val">{intel.climate.snowDays}</span>
                  </div>
                      <div className="nsp-clim-stat">
                        <span className="nsp-clim-stat-lbl">Flood Risk</span>
                        <Badge label={intel.climate.floodRisk} color="success" variant="subtle" size="small" />
                </div>
                      <div className="nsp-clim-stat">
                        <span className="nsp-clim-stat-lbl">Hazard Score</span>
                        <Badge label="22 / 100" color="success" variant="subtle" size="small" />
              </div>
                  </div>
                    <div className="nsp-climate-insight">
                      <TrendingUp size={11} /> {intel.climate.floorNote}
                </div>
                      </div>

                </div>{/* /nsp-results-left-col */}

                {/* RIGHT column: Map fills the full height */}
                <div className="nsp-results-right-col nsp-fade-up" style={{ animationDelay: "0.05s" }}>
                  <div className="nsp-map-panel-header">
                    <div className="nsp-map-ph-left">
                      <MapPin size={13} />
                      <span>F&D Store Network — Continental USA</span>
                      </div>
                    <div className="nsp-map-ph-right">
                      <div className="nsp-map-legend">
                        <span className="nsp-legend-dot blue" />
                        <span>{STORE_COORDINATES.filter(s => s.status === "existing").length} stores</span>
                        <span className="nsp-legend-dot amber" />
                        <span>{store.market} · New</span>
                    </div>
                      <Button
                        variant="ghost"
                        size="small"
                        icon={<Maximize2 size={13} />}
                        iconPlacement="left"
                        onClick={() => setMapExpanded(true)}
                      >
                        Expand
                      </Button>
                </div>
              </div>
                  <div className="nsp-right-col-map">
                    <USAStoreMap newStore={store} allStores={FD_STORES} hideHeader />
                  </div>
              </div>

              </div>{/* /nsp-results-2col */}

              {/* ══ BELOW MAP — Competitor Scan full-width ═══════════════════ */}
              <div className="nsp-r-competitor nsp-fade-up" style={{ animationDelay: "0.2s" }}>
                <div className="nsp-comp-card-header">
                  <div className="nsp-comp-header-left">
                    <div className="nsp-comp-header-icon"><Store size={14} /></div>
                  <div>
                      <div className="nsp-comp-header-title">Competitor Scan</div>
                      <div className="nsp-comp-header-sub">50-mile trade area · {intel.competitors.length} in range</div>
                  </div>
                </div>
                  <div className="nsp-comp-header-badges">
                    <Badge label={`Primary ${intel.trade.primary}`}     color="default" variant="stroke" size="small" />
                    <Badge label={`Secondary ${intel.trade.secondary}`} color="default" variant="stroke" size="small" />
                    <Badge label={intel.trade.territory}                color="success" variant="subtle" size="small" />
                  </div>
                </div>
                <div className="nsp-comp-summary-strip">
                  <div className="nsp-comp-summary-item">
                    <span className="nsp-comp-summary-num red">2</span>
                    <span className="nsp-comp-summary-lbl">High Threat</span>
                  </div>
                  <div className="nsp-comp-summary-divider" />
                  <div className="nsp-comp-summary-item">
                    <span className="nsp-comp-summary-num amber">1</span>
                    <span className="nsp-comp-summary-lbl">Medium</span>
                  </div>
                  <div className="nsp-comp-summary-divider" />
                  <div className="nsp-comp-summary-item">
                    <span className="nsp-comp-summary-num green">1</span>
                    <span className="nsp-comp-summary-lbl">Low</span>
                  </div>
                  <div className="nsp-comp-summary-divider" />
                  <div className="nsp-comp-summary-item">
                    <span className="nsp-comp-summary-num blue">0</span>
                    <span className="nsp-comp-summary-lbl">Specialty</span>
                  </div>
                  <div className="nsp-comp-greenfield">
                    <Badge label="Greenfield · No F&D within 300 mi" color="success" variant="subtle" size="small" />
                  </div>
                </div>
                {/* Competitor table */}
                <div className="nsp-comp-table">
                  <div className="nsp-comp-table-head">
                    <span className="nsp-cth nsp-cth-name">Competitor</span>
                    <span className="nsp-cth nsp-cth-cat">Category</span>
                    <span className="nsp-cth nsp-cth-size">Size</span>
                    <span className="nsp-cth nsp-cth-dist">Distance</span>
                    <span className="nsp-cth nsp-cth-note">Overlap Note</span>
                    <span className="nsp-cth nsp-cth-threat">Threat</span>
                  </div>
                  {intel.competitors.map((c, i) => {
                    const threatColor = c.threat === "High" ? "error" : c.threat === "Medium" ? "warning" : "default";
                    return (
                      <div key={c.name} className="nsp-comp-table-row nsp-fade-up" style={{ animationDelay: `${0.22 + i * 0.05}s` }}>
                        <div className="nsp-ctd nsp-ctd-name">
                          <div className="nsp-comp-v2-avatar">{c.name[0]}</div>
                          <span className="nsp-ctd-name-text">{c.name}</span>
                        </div>
                        <span className="nsp-ctd nsp-ctd-cat">{c.category}</span>
                        <span className="nsp-ctd nsp-ctd-size">{c.sqft}</span>
                        <span className="nsp-ctd nsp-ctd-dist">{c.dist}</span>
                        <span className="nsp-ctd nsp-ctd-note">{c.note}</span>
                        <div className="nsp-ctd nsp-ctd-threat">
                          <Badge label={c.threat} color={threatColor} variant="subtle" size="small" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="nsp-comp-footer-insight">
                  <Store size={11} />
                  <span>No specialty flooring (Tile Shop, LL Flooring, Lumber Liquidators) within 100 mi — strong greenfield opportunity for F&D.</span>
                </div>
              </div>


              {/* ── Map fullscreen modal ──────────────────────────────────── */}
              {mapExpanded && (
                <div className="nsp-map-modal" onClick={() => setMapExpanded(false)}>
                  <div className="nsp-map-modal-inner" onClick={e => e.stopPropagation()}>
                    <div className="nsp-map-modal-header">
                      <div className="nsp-map-ph-left">
                        <MapPin size={14} />
                        <span>F&D Store Network — Continental USA</span>
                        <Badge label={`${STORE_COORDINATES.filter(s => s.status === "existing").length} Active + 1 New`} color="default" variant="stroke" size="small" />
                      </div>
                      <Button
                        variant="ghost"
                        size="small"
                        icon={<X size={14} />}
                        iconPlacement="left"
                        onClick={() => setMapExpanded(false)}
                      >
                        Close
                      </Button>
                    </div>
                    <div className="nsp-map-modal-body">
                      <USAStoreMap newStore={store} allStores={FD_STORES} hideHeader />
                    </div>
              </div>
            </div>
          )}

            </div>
          )}
        </div>
      ) : (
        newStores.length === 0 ? (
        <div className="nsp-empty-state">
          <Building2 size={36} />
          <div>No new stores available</div>
          <p>Flag a location as "New Store" in the Location Attributes table.</p>
        </div>
        ) : null
      )}  {/* end store && phase !== loading ternary */}
        </> /* close landing wrapper */
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Step 1 — Hindsight Scan
 * The agent scans every active option, scores it, and tags a Keep / Introduce /
 * Drop decision with the last-season signals behind it. The merchant reviews the
 * roster then transfers the qualified line onto the Scenario 2 Line Plan.
 * ────────────────────────────────────────────────────────────────────────── */
function HindsightScan({ store, scopeForm, onTransfer }) {
  const rows = useMemo(() => buildHindsightRows(), []);

  const keepRows = rows.filter(r => r.existingReco === "keep");
  const addRows  = rows.filter(r => r.existingReco === "add");
  const dropRows = rows.filter(r => r.existingReco === "drop");
  const qualified = rows.filter(r => r.existingReco !== "drop");
  const blended = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.explain.score, 0) / rows.length)
    : 0;

  const money = (v) => `$${(v / 1000).toFixed(1)}k`;

  const handleTransfer = () => {
    const recoActions = Object.fromEntries(rows.map(r => [r.id, r.existingReco]));
    onTransfer(recoActions);
  };

  const stats = [
    { key: "scan", label: "Items Scanned",      value: rows.length,     tone: "neutral", Icon: Search,       sub: "active options in hindsight" },
    { key: "keep", label: "Carryover",          value: keepRows.length, tone: "success", Icon: CheckCircle,  sub: "proven performers retained" },
    { key: "add",  label: "New Introductions",  value: addRows.length,  tone: "info",    Icon: Sparkles,     sub: "top-scoring recommendations" },
    { key: "drop", label: "Drop Candidates",    value: dropRows.length, tone: "error",   Icon: AlertTriangle,sub: "underperformers held back" },
  ];

  return (
    <div className="nsp-hs">
      <div className="nsp-hs-head">
        <div className="nsp-hs-head-left">
          <div className="nsp-hs-eyebrow">
            <Cpu size={13} /> Assortment Agent · Step 1 of 3
          </div>
          <h2 className="nsp-hs-title">Hindsight Scan &amp; Recommendation</h2>
          <p className="nsp-hs-sub">
            Scored <strong>{rows.length}</strong> active options for{" "}
            <strong>{store?.name || store?.label || "the store"}</strong> ·{" "}
            {scopeForm?.department} using the weighted engine (sales · gross margin · sell-through).
          </p>
        </div>
        <div className="nsp-hs-head-right">
          <div className="nsp-hs-blend">
            <span className="nsp-hs-blend-val">{blended}</span>
            <span className="nsp-hs-blend-lbl">Blended<br />Confidence</span>
          </div>
        </div>
      </div>

      <div className="nsp-hs-kpis">
        {stats.map(({ key, label, value, tone, Icon, sub }) => (
          <Card key={key} className={`nsp-hs-kpi is-${tone}`} sx={panelSx}>
            <div className="nsp-hs-kpi-top">
              <span className="nsp-hs-kpi-ic"><Icon size={15} /></span>
              <span className="nsp-hs-kpi-lbl">{label}</span>
            </div>
            <div className="nsp-hs-kpi-val">{value}</div>
            <div className="nsp-hs-kpi-sub">{sub}</div>
          </Card>
        ))}
      </div>

      <Card className="nsp-hs-tablecard" sx={panelSx}>
        <div className="nsp-hs-tablehead">
          <div className="nsp-hs-tablehead-left">
            <Layers size={14} />
            <span>Scored Roster</span>
            <Badge label={`${rows.length} options`} color="default" variant="stroke" size="small" />
          </div>
          <span className="nsp-hs-tablehead-hint">Ranked by recommendation confidence</span>
        </div>

        <div className="nsp-hs-table" role="table">
          <div className="nsp-hs-row nsp-hs-row-head" role="row">
            <span className="nsp-hs-th nsp-hs-th-prod">Option</span>
            <span className="nsp-hs-th">Lifecycle</span>
            <span className="nsp-hs-th nsp-hs-th-num">Sales (LY)</span>
            <span className="nsp-hs-th nsp-hs-th-num">GM%</span>
            <span className="nsp-hs-th nsp-hs-th-num">Sell-Thru</span>
            <span className="nsp-hs-th nsp-hs-th-score">Reco Score</span>
            <span className="nsp-hs-th nsp-hs-th-dec">Decision</span>
          </div>

          {rows.map((r) => {
            const dec = HINDSIGHT_DECISION[r.existingReco] || HINDSIGHT_DECISION.keep;
            const thumb = SKU_THUMB_BY_SPECIES[r.species];
            return (
              <div key={r.id} className={`nsp-hs-row is-${r.existingReco}`} role="row">
                <span className="nsp-hs-td nsp-hs-td-prod">
                  {thumb
                    ? <img className="nsp-hs-thumb" src={thumb} alt="" />
                    : <span className="nsp-hs-thumb nsp-hs-thumb-ph"><Package size={14} /></span>}
                  <span className="nsp-hs-prod-txt">
                    <span className="nsp-hs-prod-name">{r.description}</span>
                    <span className="nsp-hs-prod-sub">{r.sku} · {r.species} · {r.finish} · {r.width}</span>
                  </span>
                </span>
                <span className="nsp-hs-td">
                  <Tag label={r.lifecycle} size="small" />
                </span>
                <span className="nsp-hs-td nsp-hs-td-num">{money(r.hindsight.salesDollars)}</span>
                <span className="nsp-hs-td nsp-hs-td-num">{r.hindsight.gmPct}%</span>
                <span className="nsp-hs-td nsp-hs-td-num">{r.hindsight.sellThrough}%</span>
                <span className="nsp-hs-td nsp-hs-td-score">
                  <span className="nsp-hs-scorebar">
                    <span className="nsp-hs-scorebar-fill" style={{ width: `${r.explain.score}%` }} />
                  </span>
                  <span className="nsp-hs-scoreval">{r.explain.score}</span>
                </span>
                <span className="nsp-hs-td nsp-hs-td-dec">
                  <Badge label={dec.label} color={dec.color} variant="subtle" size="small" />
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="nsp-hs-cta" sx={panelSx}>
        <div className="nsp-hs-cta-left">
          <ArrowRight size={16} />
          <div className="nsp-hs-cta-txt">
            <span className="nsp-hs-cta-title">
              Transfer {qualified.length} qualified options to the Line Plan
            </span>
            <span className="nsp-hs-cta-sub">
              {keepRows.length} carryover · {addRows.length} new introduction{addRows.length === 1 ? "" : "s"} ·{" "}
              {dropRows.length} drop candidate{dropRows.length === 1 ? "" : "s"} held back
            </span>
          </div>
        </div>
        <Button
          variant="primary"
          size="medium"
          icon={<ArrowRight size={15} />}
          iconPlacement="right"
          onClick={handleTransfer}
        >
          Transfer to Line Plan
        </Button>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Step 2 — Transfer / Line Population
 * A short glass-box sequence that carries the scored + tagged roster onto the
 * Scenario 2 Line Plan workspace, then reveals the recommendation screen.
 * ────────────────────────────────────────────────────────────────────────── */
function TransferStage({ store, scopeForm, count, onComplete }) {
  const STEPS = useMemo(() => ([
    "Locking hindsight recommendation scores",
    "Selecting qualified carryover + top recommendations",
    "Attaching explainability & historical signals",
    `Populating "${scopeForm?.scenarioName || "Scenario 2"}" line plan workspace`,
    "Reconciling Open-To-Buy envelope",
  ]), [scopeForm]);

  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const perStep = 620;
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setDone(i + 1), perStep * (i + 1))
    );
    const start = Date.now();
    const total = perStep * STEPS.length + 220;
    let raf;
    const tick = () => {
      const p = Math.min(100, Math.round(((Date.now() - start) / total) * 100));
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      else setTimeout(() => onComplete?.(), 260);
    };
    raf = requestAnimationFrame(tick);
    return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="nsp-xfer">
      <Card className="nsp-xfer-card" sx={panelSx}>
        <div className="nsp-xfer-head">
          <span className="nsp-xfer-ic"><Cpu size={18} /></span>
          <div className="nsp-xfer-head-txt">
            <span className="nsp-xfer-title">Transferring to Line Plan</span>
            <span className="nsp-xfer-sub">
              Carrying {count} option{count === 1 ? "" : "s"} · scores · explainability · history
            </span>
          </div>
          <Badge label={`${progress}%`} color="info" variant="subtle" size="small" />
        </div>

        <ProgressBar value={progress} max={100} />

        <div className="nsp-xfer-steps">
          {STEPS.map((label, i) => {
            const state = i < done ? "done" : i === done ? "active" : "wait";
            return (
              <div key={i} className={`nsp-xfer-step is-${state}`}>
                <span className="nsp-xfer-step-ic">
                  {state === "done"
                    ? <Check size={13} />
                    : state === "active"
                      ? <Loader size="small" />
                      : <span className="nsp-xfer-dot" />}
                </span>
                <span className="nsp-xfer-step-lbl">{label}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Existing Store Reco — staged workflow:
 *   Step 1 Hindsight Scan → Step 2 Transfer → Step 3 Line Plan (recommendation)
 * The Hindsight decisions seed the Line Plan's Add / Keep / Drop actions so the
 * scan, the transfer and the recommendation screen stay one consistent story.
 * ────────────────────────────────────────────────────────────────────────── */
export function ExistingStoreReco() {
  // Default anchor store — prefer an existing (non-new) store to match the name.
  const store = useMemo(
    () => LOCATIONS.find(l => l.storeType && l.storeType !== "New Store") || LOCATIONS[0],
    []
  );

  // Default scope mirrors the ScopeDrawer's initial selection.
  const scopeForm = useMemo(() => {
    const dept = HIERARCHY[0].label;
    const subs = [HIERARCHY[0].subs[0].label];
    const cls  = ["All Classes"];
    return {
      scenarioName:  buildScenarioName(dept, subs, cls),
      department:    dept,
      subdepartment: subs,
      cls,
      horizon:       "ss26_h1",
      stance:        "balanced",
    };
  }, []);

  // Independent persistence namespace so it never collides with New Store scenarios.
  const [savedScenarios, setSavedScenarios] = useState(() => {
    try { const raw = localStorage.getItem("esr_saved_scenarios"); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("esr_saved_scenarios", JSON.stringify(savedScenarios)); }
    catch { /* quota / privacy mode */ }
  }, [savedScenarios]);
  const upsertScenario = (snap) => setSavedScenarios(prev => {
    const i = prev.findIndex(s => s.id === snap.id);
    if (i === -1) return [snap, ...prev];
    const next = [...prev]; next[i] = snap; return next;
  });

  // stage: hindsight → transfer → lineplan
  const [stage, setStage] = useState("hindsight");
  const [seedActions, setSeedActions] = useState({});
  const [transferCount, setTransferCount] = useState(0);
  const [runKey, setRunKey] = useState(0);

  const goHindsight = () => { setStage("hindsight"); setRunKey(k => k + 1); };
  const startTransfer = (recoActions) => {
    setSeedActions(recoActions);
    setTransferCount(Object.values(recoActions).filter(a => a !== "drop").length);
    setStage("transfer");
  };

  return (
    <div className="nsp-root">
      {stage === "hindsight" && (
        <HindsightScan store={store} scopeForm={scopeForm} onTransfer={startTransfer} />
      )}

      {stage === "transfer" && (
        <TransferStage
          store={store}
          scopeForm={scopeForm}
          count={transferCount}
          onComplete={() => setStage("lineplan")}
        />
      )}

      {stage === "lineplan" && (
        <Tier1LinePlan
          key={runKey}
          scopeForm={scopeForm}
          store={store}
          initialSnapshot={{ tier1: { recoActions: seedActions } }}
          onReset={goHindsight}
          onBack={goHindsight}
          onSaveScenario={upsertScenario}
          recoInsights
        />
      )}
    </div>
  );
}
