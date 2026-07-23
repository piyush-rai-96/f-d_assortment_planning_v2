/*
 * Planning Admin data — ported from the ADMIN_S / renderAdminPlanning module
 * (section === "planning") in the legacy fd-assortment-v4-2.html.
 *
 * Three tabs: Products (source from FD_SKUS, Core/BG + Status editable),
 * Location Attributes (source from FD_STORES, 5 editable attrs derived from
 * cluster defaults), and Global Exceptions (attribute×store / item×store
 * matrices).
 */
import { FD_SKUS } from "./skus.js";
import { FD_STORES } from "./stores.js";

/* ── Products: editable attribute options ─────────────────────────────────── */
export const CORE_BG_OPTS = ["", "Core", "BG", "East", "West"];
export const STATUS_OPTS = ["Active", "Discontinued", "Pending"];

/* ── Location attributes (editable) + cluster-derived defaults ────────────── */
export const LOC_ATTRS = [
  { key: "climate", label: "Climate", opts: ["Temperate", "Hot Humid", "Hot Dry", "Cold", "Mixed Humid"] },
  { key: "customerType", label: "Customer Type", opts: ["Mainstream", "Premium", "Value", "Pro Contractor", "Mixed"] },
  { key: "storeFormat", label: "Store Format", opts: ["Large Format", "Mid-Size", "Compact", "Flagship", "Outlet"] },
  { key: "installMix", label: "Install Mix", opts: ["High Pro", "Mixed", "High DIY"] },
  { key: "locationType", label: "Location Type", opts: ["Suburban", "Urban", "Strip Mall", "Standalone", "Mixed Use"] },
];

const CLIMATE_BY_REGION = { "Mid-South": "Hot Dry", Gulf: "Hot Humid", "Mid-Atlantic": "Mixed Humid", "North Florida": "Hot Humid", "South Florida": "Hot Humid", "New England": "Cold", Northeast: "Temperate", Rockies: "Cold", "Pacific Northwest": "Temperate", "Great Lakes": "Mixed Humid", Midwest: "Mixed Humid", "Pac South": "Hot Dry" };
const CUSTOMER_BY_REGION = { "Mid-South": "Pro Contractor", Gulf: "Pro Contractor", "Mid-Atlantic": "Premium", "North Florida": "Mainstream", "South Florida": "Premium", "New England": "Mainstream", Northeast: "Premium", Rockies: "Mainstream", "Pacific Northwest": "Premium", "Great Lakes": "Value", Midwest: "Value", "Pac South": "Premium" };
const MIX_BY_REGION = { "Mid-South": "High Pro", Gulf: "High Pro", "Mid-Atlantic": "Mixed", "North Florida": "Mixed", "South Florida": "High DIY", "New England": "Mixed", Northeast: "High Pro", Rockies: "High Pro", "Pacific Northwest": "Mixed", "Great Lakes": "High DIY", Midwest: "High DIY", "Pac South": "Mixed" };
const LOCTYPE_BY_REGION = { "Mid-South": "Suburban", Gulf: "Suburban", "Mid-Atlantic": "Suburban", "North Florida": "Suburban", "South Florida": "Suburban", "New England": "Strip Mall", Northeast: "Urban", Rockies: "Strip Mall", "Pacific Northwest": "Suburban", "Great Lakes": "Strip Mall", Midwest: "Strip Mall", "Pac South": "Suburban" };
const FORMAT_BY_VELOCITY = { A: "Large Format", B: "Mid-Size", C: "Mid-Size", D: "Compact", E: "Compact" };
export const BAND_PCT = { A: "5%", B: "15%", C: "60%", D: "15%", E: "5%" };

/* ─── New store openings (not yet in FD_STORES) ──────────────────────────── */
const RAW_NEW_STORES = [
  {
    id: 381, name: "381 Billings", region: "Rockies", market: "Billings", state: "MT",
    dc: 995, velocity: null, lat: 45.7833, lon: -108.5007,
    sqft: 55000, openingDate: "SS26 — Aug 2026",
  },
];

/** Set of store IDs flagged as "New Store" — used by UI to gate cold-start warnings */
export const NEW_STORE_IDS = new Set(RAW_NEW_STORES.map((s) => String(s.id)));

/* Stores enriched with format + default editable attributes + storeType. */
export const LOCATIONS = [
  ...FD_STORES.map((s) => ({
    id: String(s.id),
    name: s.name,
    region: s.region,
    market: s.market,
    state: s.state,
    dc: s.dc,
    velocity: s.velocity,
    storeType: "Existing",
    format: FORMAT_BY_VELOCITY[s.velocity] || "Mid-Size",
    defaults: {
      climate:      CLIMATE_BY_REGION[s.region]    || "Temperate",
      customerType: CUSTOMER_BY_REGION[s.region]   || "Mainstream",
      storeFormat:  FORMAT_BY_VELOCITY[s.velocity] || "Mid-Size",
      installMix:   MIX_BY_REGION[s.region]        || "Mixed",
      locationType: LOCTYPE_BY_REGION[s.region]    || "Suburban",
    },
  })),
  ...RAW_NEW_STORES.map((s) => ({
    id: String(s.id),
    name: s.name,
    region: s.region,
    market: s.market,
    state: s.state,
    dc: s.dc,
    lat: s.lat,
    lon: s.lon,
    sqft: s.sqft,
    openingDate: s.openingDate,
    velocity: "—",
    storeType: "New Store",
    format: "Smaller-footprint warehouse",
    defaults: {
      climate:      CLIMATE_BY_REGION[s.region]  || "Cold",
      customerType: CUSTOMER_BY_REGION[s.region] || "Mainstream",
      storeFormat:  "Compact",
      installMix:   MIX_BY_REGION[s.region]      || "Mixed",
      locationType: LOCTYPE_BY_REGION[s.region]  || "Strip Mall",
    },
  })),
];

/* ─── New Store Input Records ─────────────────────────────────────────────── *
 * Full traceability record for each new-store opening.
 * Each enriched attribute carries: value, source, provider, freshness date,
 * confidence (1–5) and confidenceLabel.
 * ─────────────────────────────────────────────────────────────────────────── */
export const NEW_STORE_INPUTS = {
  "381": {
    fdProvided: [
      { label: "Location",      value: "Billings, MT" },
      { label: "Store Size",    value: "~55,000 sq ft" },
      { label: "Store Format",  value: "Smaller-footprint warehouse" },
      { label: "Store Status",  value: "New Store — Opening SS26" },
      { label: "Sales History", value: "None (Zero-sales cold-start)" },
    ],
    enrichedAttributes: [
      { category: "Demographics",  attribute: "Household Count (30-mi radius)",    value: "52,408",                        source: "US Census ACS 2023",      provider: "Census Bureau",   freshness: "Mar 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Demographics",  attribute: "Median Household Income",            value: "$58,142",                       source: "IRS Statistics of Income 2022", provider: "IRS",         freshness: "Dec 2023",  confidence: 4, confidenceLabel: "High"      },
      { category: "Demographics",  attribute: "Median Home Value",                  value: "$287,500",                      source: "Zillow ZHVI Dec 2023",    provider: "Zillow",          freshness: "Jan 2024",  confidence: 5, confidenceLabel: "Very High" },
      { category: "Demographics",  attribute: "% Older Homes (Pre-1980)",           value: "41.2%",                         source: "US Census ACS 2023",      provider: "Census Bureau",   freshness: "Mar 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Demographics",  attribute: "Homeownership Rate",                 value: "68.5%",                         source: "US Census ACS 2023",      provider: "Census Bureau",   freshness: "Mar 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Trade Area",    attribute: "Contractor Density",                 value: "1.4× National Average",         source: "ZBP 2022 (NAICS 238)",    provider: "Census Bureau",   freshness: "Feb 2024",  confidence: 3, confidenceLabel: "Moderate"  },
      { category: "Trade Area",    attribute: "Competitive Density",                value: "Low — 1 competitor within 50 mi", source: "IBIS World / Google Maps", provider: "IBIS World",   freshness: "Apr 2024",  confidence: 3, confidenceLabel: "Moderate"  },
      { category: "Trade Area",    attribute: "Regional / Rural Trade-Area Reach",  value: "~85 mi draw radius",            source: "F&D Site Evaluation",     provider: "F&D Internal",    freshness: "Jun 2026",  confidence: 5, confidenceLabel: "Very High" },
      { category: "Climate",       attribute: "Climate Zone Indicator",             value: "Cold Continental (USDA Zone 4b)", source: "USDA Plant Hardiness 2023", provider: "USDA",         freshness: "Jan 2024",  confidence: 5, confidenceLabel: "Very High" },
      { category: "Climate",       attribute: "FEMA National Risk Index",           value: "Moderate — 38 / 100",           source: "FEMA NRI 2023",           provider: "FEMA",            freshness: "Nov 2023",  confidence: 4, confidenceLabel: "High"      },
    ],
  },
  "382": {
    fdProvided: [
      { label: "Location",      value: "Bozeman, MT" },
      { label: "Store Size",    value: "~58,000 sq ft" },
      { label: "Store Format",  value: "Smaller-footprint warehouse" },
      { label: "Store Status",  value: "New Store — Opening FW26" },
      { label: "Sales History", value: "None (Zero-sales cold-start)" },
    ],
    enrichedAttributes: [
      { category: "Demographics",  attribute: "Household Count (30-mi radius)",    value: "38,114",                        source: "US Census ACS 2023",      provider: "Census Bureau",   freshness: "Mar 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Demographics",  attribute: "Median Household Income",            value: "$67,481",                       source: "IRS Statistics of Income 2022", provider: "IRS",         freshness: "Dec 2023",  confidence: 4, confidenceLabel: "High"      },
      { category: "Demographics",  attribute: "Median Home Value",                  value: "$542,000",                      source: "Zillow ZHVI Dec 2023",    provider: "Zillow",          freshness: "Jan 2024",  confidence: 5, confidenceLabel: "Very High" },
      { category: "Demographics",  attribute: "% Older Homes (Pre-1980)",           value: "29.4%",                         source: "US Census ACS 2023",      provider: "Census Bureau",   freshness: "Mar 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Demographics",  attribute: "Homeownership Rate",                 value: "54.2%",                         source: "US Census ACS 2023",      provider: "Census Bureau",   freshness: "Mar 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Trade Area",    attribute: "Contractor Density",                 value: "1.1× National Average",         source: "ZBP 2022 (NAICS 238)",    provider: "Census Bureau",   freshness: "Feb 2024",  confidence: 3, confidenceLabel: "Moderate"  },
      { category: "Trade Area",    attribute: "Competitive Density",                value: "None within 100 mi",            source: "IBIS World / Google Maps", provider: "IBIS World",     freshness: "Apr 2024",  confidence: 4, confidenceLabel: "High"      },
      { category: "Trade Area",    attribute: "Regional / Rural Trade-Area Reach",  value: "~110 mi draw radius",           source: "F&D Site Evaluation",     provider: "F&D Internal",    freshness: "Jun 2026",  confidence: 5, confidenceLabel: "Very High" },
      { category: "Climate",       attribute: "Climate Zone Indicator",             value: "Cold Continental (USDA Zone 5a)", source: "USDA Plant Hardiness 2023", provider: "USDA",         freshness: "Jan 2024",  confidence: 5, confidenceLabel: "Very High" },
      { category: "Climate",       attribute: "FEMA National Risk Index",           value: "Low — 22 / 100",                source: "FEMA NRI 2023",           provider: "FEMA",            freshness: "Nov 2023",  confidence: 4, confidenceLabel: "High"      },
    ],
  },
};

/* ── Products enriched (effective Core/BG + Status default from FD_SKUS) ──── */
export const PRODUCTS = FD_SKUS.map((s) => ({
  sku: String(s.sku),
  vsn: s.vsn,
  dept: s.dept,
  subDept: s.subDept,
  cls: s.cls,
  subCls: s.subCls,
  desc: s.desc,
  color: s.color,
  finish: s.finish,
  size: s.size,
  price: s.price,
  lead: s.lead,
  attrs: s.attrs,
  defCoreBG: s.tag || "",
  defStatus: s.status || "Active",
}));

/* ── Global Exceptions: attribute groups + product departments ────────────── */
export const ATTR_GROUPS = [
  { key: "material", label: "Material", values: ["Porcelain", "Ceramic", "Glass", "Natural Stone", "Travertine", "Slate", "Marble", "Vinyl", "Hardwood", "Grout", "Mortar"] },
  { key: "format", label: "Format", values: ['Mosaic (< 4")', 'Small (4"–12")', 'Medium (12"–18")', 'Large (18"–24")', 'Extra Large (24"+)', "Plank", "Sheet", "Bag/Tub"] },
  { key: "finish", label: "Finish", values: ["Matte", "Polished", "Honed", "Brushed", "Textured", "Glazed", "Unglazed", "Natural"] },
  { key: "edgeType", label: "Edge Type", values: ["Rectified", "Non-Rectified", "Bevelled", "Bullnose"] },
  { key: "suitability", label: "Suitability", values: ["Floor & Wall", "Floor Only", "Wall Only", "Outdoor Rated", "Wet Area", "Commercial Grade"] },
];

/* Products grouped by department, for the Item × Store matrix. */
export const PRODUCTS_BY_DEPT = PRODUCTS.reduce((acc, p) => {
  (acc[p.dept] = acc[p.dept] || []).push(p);
  return acc;
}, {});

export const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info", Stone: "info", "Decorative Accessories": "warning" };
export const STATUS_BADGE = { Active: "success", Discontinued: "error", Pending: "warning" };
export const VEL_BADGE = { A: "success", B: "info", C: "warning", D: "error", E: "error" };

/* ── Assortment Periods ───────────────────────────────────────────────────── */
export const ADMIN_WEEKS = Array.from({ length: 52 }, (_, i) => `W${String(i + 1).padStart(2, "0")}`);
export const ADMIN_DEPT_OPTS = ["Wood", "Tile", "Laminate & Vinyl", "Stone", "Decorative Accessories"];
export const ADMIN_SEASON_OPTS = ["SS 2026", "AW 2026", "SS 2027", "AW 2027"];
export const PHASE_COLORS = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0B7A6C"];
export const DEPT_COLORS = {
  Wood: { color: "#B45309", bg: "#FEF3C7" },
  Tile: { color: "#0B7A6C", bg: "#E6F7F4" },
  "Laminate & Vinyl": { color: "#2563EB", bg: "#DBEAFE" },
  Stone: { color: "#7C3AED", bg: "#F5F3FF" },
  "Decorative Accessories": { color: "#DC2626", bg: "#FEF2F2" },
};

export const INITIAL_ASSORT_PERIODS = [
  {
    id: "ap-1", dept: "Wood", season: "SS 2026", startWeek: "W01", endWeek: "W26",
    presDate: "2026-04-21", dueDate: "2026-04-23", status: "active",
    phases: [
      { id: "ph1", name: "Pre-Season", startWeek: "W01", endWeek: "W04", color: "#2563EB" },
      { id: "ph2", name: "Core",       startWeek: "W05", endWeek: "W16", color: "#059669" },
      { id: "ph3", name: "Transition", startWeek: "W17", endWeek: "W20", color: "#D97706" },
      { id: "ph4", name: "Clearance",  startWeek: "W21", endWeek: "W26", color: "#DC2626" },
    ],
  },
  {
    id: "ap-2", dept: "Tile", season: "SS 2026", startWeek: "W01", endWeek: "W26",
    presDate: "2026-04-14", dueDate: "2026-04-16", status: "active",
    phases: [
      { id: "ph1", name: "Pre-Season", startWeek: "W01", endWeek: "W04", color: "#2563EB" },
      { id: "ph2", name: "Core",       startWeek: "W05", endWeek: "W18", color: "#059669" },
      { id: "ph3", name: "Transition", startWeek: "W19", endWeek: "W22", color: "#D97706" },
      { id: "ph4", name: "Clearance",  startWeek: "W23", endWeek: "W26", color: "#DC2626" },
    ],
  },
  {
    id: "ap-3", dept: "Laminate & Vinyl", season: "SS 2026", startWeek: "W01", endWeek: "W26",
    presDate: "2026-04-28", dueDate: "2026-04-30", status: "draft",
    phases: [
      { id: "ph1", name: "Pre-Season", startWeek: "W01", endWeek: "W06", color: "#2563EB" },
      { id: "ph2", name: "Core",       startWeek: "W07", endWeek: "W18", color: "#059669" },
      { id: "ph3", name: "Clearance",  startWeek: "W19", endWeek: "W26", color: "#DC2626" },
    ],
  },
];

/* ── Planning Rules ───────────────────────────────────────────────────────── */
export const PLANNING_RULES = [
  { name: "Minimum confidence threshold for recommendation", value: "72%",     type: "threshold", editable: true  },
  { name: "Velocity band A — minimum presentation units",   value: "4",        type: "integer",   editable: true  },
  { name: "Velocity band B — minimum presentation units",   value: "3",        type: "integer",   editable: true  },
  { name: "Velocity band C — minimum presentation units",   value: "2",        type: "integer",   editable: true  },
  { name: "Minimum depth of buy (weeks of supply)",         value: "8 wks",    type: "integer",   editable: true  },
  { name: "Maximum depth of buy (weeks of supply)",         value: "20 wks",   type: "integer",   editable: true  },
  { name: "Market intel signal — threat discount factor",   value: "−15 pp",   type: "formula",   editable: false },
  { name: "Market intel signal — opportunity boost factor", value: "+10 pp",   type: "formula",   editable: false },
  { name: "New item minimum trial period (weeks)",          value: "8 wks",    type: "integer",   editable: true  },
  { name: "Core SKU — carry-forward protection",            value: "Locked",   type: "system",    editable: false },
  { name: "Price ladder minimum gap",                       value: "$0.50/sqft", type: "threshold", editable: true },
  { name: "Like-item correlation window",                   value: "52 weeks", type: "formula",   editable: false },
];

/* ── Planning dept splits (mirrors HTML ADMIN_S.planningRules) ─────────────── */
export const GLOBAL_OPTION_SPLIT = { national: 40, regional: 30, store: 30 };

export const DEPT_COLORS_HEX = {
  "Wood":                    "#B45309",
  "Tile":                    "#0B7A6C",
  "Laminate & Vinyl":        "#2563EB",
  "Stone":                   "#7C3AED",
  "Decorative Accessories":  "#D97706",
};

export const PLANNING_DEPT_SPLITS = [
  { dept: "Wood",                   total: 35, national: 40, regional: 30, store: 30 },
  { dept: "Tile",                   total: 45, national: 35, regional: 35, store: 30 },
  { dept: "Laminate & Vinyl",       total: 30, national: 45, regional: 30, store: 25 },
  { dept: "Stone",                  total: 20, national: 50, regional: 25, store: 25 },
  { dept: "Decorative Accessories", total: 40, national: 30, regional: 30, store: 40 },
];

/* ── Agent rules (mirrors HTML ADMIN_S.rules) ─────────────────────────────── */
export const AGENT_RULES = [
  { id: "R001", name: "Minimum agent confidence to auto-recommend", value: "70%",         type: "threshold", editable: true  },
  { id: "R002", name: "High-confidence dismissal alert threshold",  value: "80%",         type: "threshold", editable: true  },
  { id: "R003", name: "Override rate warning trigger",              value: "25%",         type: "threshold", editable: true  },
  { id: "R004", name: "Max store slot budget (default)",            value: "80 SKUs",     type: "limit",     editable: true  },
  { id: "R005", name: "Sister store sell-through signal weight",    value: "High",        type: "weight",    editable: true  },
  { id: "R006", name: "Cluster signal weight",                      value: "Medium",      type: "weight",    editable: true  },
  { id: "R007", name: "Model retraining cadence",                   value: "Seasonal",    type: "config",    editable: true  },
  { id: "R008", name: "Catalogue fence enforcement",                value: "Hard (system)", type: "config",  editable: false },
];

/* ── Role permission matrix ──────────────────────────────────────────────── */
export const ROLE_DEFINITIONS = [
  { role: "VP Merchandising",   badge: "info",    level: "Corporate", permissions: ["View all", "Approve PLR", "Override agent", "Manage users", "Edit rules"] },
  { role: "Regional VP",        badge: "success", level: "Regional",  permissions: ["View region", "Approve PLR", "Override agent", "Manage regional users"] },
  { role: "Merchant Analyst",   badge: "info",    level: "Corporate", permissions: ["View all", "Edit catalogue", "Run clustering", "Log intelligence"] },
  { role: "Buyer",              badge: "warning", level: "Dept",      permissions: ["View dept", "Submit PLR", "Log intelligence"] },
  { role: "Store Manager",      badge: "warning", level: "Store",     permissions: ["View store", "Override curation", "Log intelligence"] },
  { role: "Planning Admin",     badge: "error",   level: "System",    permissions: ["View all", "Edit rules", "Manage users", "System config"] },
];

/* ── Admin Users ──────────────────────────────────────────────────────────── */
const AVATAR_COLORS = ["#185FA5", "#0B7A6C", "#B45309", "#7C3AED", "#993C1D", "#2D6A2D"];
export const ADMIN_USERS = [
  { id: "U001", name: "Karen Mitchell",  email: "k.mitchell@fd.com",  role: "VP Merchandising",  access: "National",           status: "Active",  lastActive: "Today",    color: AVATAR_COLORS[0] },
  { id: "U002", name: "Jason Rodriguez", email: "j.rodriguez@fd.com", role: "Regional VP",        access: "Southeast + Gulf",   status: "Active",  lastActive: "Today",    color: AVATAR_COLORS[1] },
  { id: "U003", name: "Lisa Torres",     email: "l.torres@fd.com",    role: "Store Manager",      access: "ATL-01",             status: "Active",  lastActive: "2h ago",   color: AVATAR_COLORS[2] },
  { id: "U004", name: "Priya Nair",      email: "p.nair@fd.com",      role: "Merchant Analyst",   access: "National",           status: "Active",  lastActive: "Yesterday",color: AVATAR_COLORS[3] },
  { id: "U005", name: "David Chen",      email: "d.chen@fd.com",      role: "Planning Admin",     access: "All",                status: "Active",  lastActive: "Today",    color: AVATAR_COLORS[4] },
  { id: "U006", name: "Sarah Williams",  email: "s.williams@fd.com",  role: "Buyer",              access: "Tile + Stone",       status: "Pending", lastActive: "—",        color: AVATAR_COLORS[5] },
];
