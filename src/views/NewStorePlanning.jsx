/**
 * NewStorePlanning.jsx — "Wow" Edition
 *
 * Flow:
 *  Step 1 → Market Intelligence (catchment · climate · competitors · USA map)
 *  Step 2 → Constraint Configurator (SKU · margin · price architecture)
 *  Step 3 → SKU Plan  (placeholder)
 *  Step 4 → Review & Lock  (placeholder)
 */
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronDown, Zap, Globe, Wind, Store, Check,
  MapPin, Building2, Cpu, Activity, TrendingUp,
  ArrowRight, RotateCcw, Save, Lock, AlertTriangle, CheckCircle, ChevronRight,
} from "lucide-react";
import { LOCATIONS, NEW_STORE_INPUTS } from "../data/admin.js";
import { FD_STORES } from "../data/stores.js";
import { CLUSTERS_BY_RUN, STUDIO_RUN_HISTORY } from "../data/agenticClustering.js";
import { SOLID_PREFINISHED_CANDIDATES, INSTALL_ATTACH_CONFIG } from "../data/newStoreSKUs.js";
import "./NewStorePlanning.css";

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
      { name: "Home Depot",  dist: "2.1 mi",  threat: "High", threatPct: 80 },
      { name: "Lowe's",      dist: "3.4 mi",  threat: "High", threatPct: 70 },
      { name: "Menards",     dist: "100+ mi", threat: "None", threatPct: 0  },
      { name: "Tile Shop",   dist: "100+ mi", threat: "None", threatPct: 0  },
      { name: "LL Flooring", dist: "100+ mi", threat: "None", threatPct: 0  },
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

// Full merchandise hierarchy: category → sub-categories
const HIERARCHY = [
  {
    label: "Hardwood Flooring",
    subs:  ["Solid Prefinished", "Engineered Hardwood", "Laminate Wood", "Parquet"],
  },
  {
    label: "Tile",
    subs:  ["Ceramic Tile", "Porcelain Tile", "Natural Stone", "Mosaic & Decorative"],
  },
  {
    label: "LVP / Vinyl",
    subs:  ["Luxury Vinyl Plank", "Luxury Vinyl Tile", "Sheet Vinyl", "WPC Core"],
  },
  {
    label: "Vanities",
    subs:  ["Freestanding Vanities", "Wall-Mount Vanities", "Mirrors & Accessories", "Vanity Tops"],
  },
  {
    label: "Installation Accessories",
    subs:  ["Underlayment", "Adhesives & Grout", "Trim & Molding", "Hand Tools"],
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

// ─── Step 2 calibration logs ──────────────────────────────────────────────────

const STEP2_CALIB = [
  { t: 250,  text: "Loading cluster profile — Billings, MT (#381)…"          },
  { t: 650,  text: "Analyzing Rockies comparables (Denver CO, Salt Lake UT)…" },
  { t: 1050, text: "Calibrating SKU capacity for 55,000 sq ft format…"        },
  { t: 1450, text: "Computing margin baseline — Cold Continental cluster…"     },
  { t: 1900, text: "✓  Defaults calibrated — pre-filling constraint form."    },
];

// ─── Map ───────────────────────────────────────────────────────────────────────

const MAP_W = 820, MAP_H = 500;
function project(lat, lon) {
  return {
    x: Math.round((lon + 125) / 59 * MAP_W),
    y: Math.round((50 - lat) / 26 * MAP_H),
  };
}
const US_PATH =
  "M 0,18 L 8,50 L 12,155 L 31,232 L 110,340 L 195,362 L 258,352 " +
  "L 299,404 L 348,465 L 386,465 C 406,443 428,403 436,390 " +
  "L 508,381 L 529,377 C 550,402 572,443 591,454 L 613,481 " +
  "C 611,462 607,436 614,404 L 614,373 C 636,343 661,302 681,265 " +
  "L 702,236 L 711,182 L 737,174 L 752,147 L 779,115 L 800,46 " +
  "L 800,18 L 418,18 L 348,18 L 208,18 L 0,18 Z";

function USAStoreMap({ newStore, allStores }) {
  const newPos = newStore?.lat && newStore?.lon ? project(newStore.lat, newStore.lon) : null;
  const dots = allStores.filter(s => s.lat && s.lon).map(s => ({ ...s, ...project(s.lat, s.lon) }));

  return (
    <div className="nsp-map-outer">
      <div className="nsp-map-topbar">
        <span className="nsp-map-title-row">
          <MapPin size={13} /> F&D Network — Continental USA
        </span>
        <div className="nsp-map-legend">
          <span className="nsp-legend-dot blue" /><span>{dots.length} Active</span>
          <span className="nsp-legend-dot amber" /><span>New · {newStore?.market}</span>
        </div>
      </div>
      <div className="nsp-map-body">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="nsp-usa-svg">
          <defs>
            <radialGradient id="mapBg" cx="50%" cy="50%" r="70%">
              <stop offset="0%"   stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="dotGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Background */}
          <rect width={MAP_W} height={MAP_H} fill="url(#mapBg)" />
          {/* Grid lines */}
          {[1,2,3,4,5,6,7].map(i => (
            <line key={`h${i}`} x1="0" y1={i*70} x2={MAP_W} y2={i*70} stroke="rgba(99,102,241,.06)" strokeWidth="1" />
          ))}
          {[1,2,3,4,5,6,7,8,9,10,11].map(i => (
            <line key={`v${i}`} x1={i*75} y1="0" x2={i*75} y2={MAP_H} stroke="rgba(99,102,241,.06)" strokeWidth="1" />
          ))}
          {/* US land */}
          <path d={US_PATH} fill="rgba(30,41,59,0.9)" stroke="rgba(99,102,241,.35)" strokeWidth="1.5" strokeLinejoin="round" />
          {/* Great Lakes */}
          <ellipse cx="558" cy="158" rx="16" ry="9"  fill="rgba(56,189,248,.15)" />
          <ellipse cx="585" cy="143" rx="11" ry="7"  fill="rgba(56,189,248,.12)" />
          {/* Store dots */}
          {dots.map(s => (
            <g key={s.id}>
              <circle cx={s.x} cy={s.y} r={7} fill="rgba(59,130,246,.18)" />
              <circle cx={s.x} cy={s.y} r={4} fill="#3b82f6" stroke="rgba(255,255,255,.3)" strokeWidth="1" filter="url(#glow)" />
              <title>{s.name} · {s.market}, {s.state}</title>
            </g>
          ))}
          {/* New store */}
          {newPos && (
            <g>
              <circle cx={newPos.x} cy={newPos.y} r={34} fill="rgba(245,158,11,.06)" stroke="rgba(245,158,11,.3)" strokeWidth="1" strokeDasharray="5 3" className="nsp-svg-catchment-ring" />
              <circle cx={newPos.x} cy={newPos.y} r={34} fill="none" stroke="rgba(245,158,11,.4)" strokeWidth="1.5" className="nsp-svg-catchment-pulse" />
              <circle cx={newPos.x} cy={newPos.y} r={14} fill="rgba(245,158,11,.15)" />
              <circle cx={newPos.x} cy={newPos.y} r={7}  fill="#f59e0b" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" filter="url(#dotGlow)" className="nsp-svg-new-dot" />
              <text x={newPos.x} y={newPos.y - 22} textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="700" letterSpacing="0.3">
                {newStore.market}, {newStore.state}
              </text>
              <text x={newPos.x} y={newPos.y + 24} textAnchor="middle" fill="rgba(253,230,138,.5)" fontSize="9">
                30-mi catchment
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="nsp-map-footer-bar">
        <span>📍 {dots.length} active stores</span>
        <span className="nsp-map-footer-sep">+</span>
        <span className="nsp-map-footer-new">⭐ {newStore?.market}, {newStore?.state} — New (SS26)</span>
        <span className="nsp-map-footer-coords">Lat/lon approximate · actuals pending</span>
      </div>
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

function KpiTile({ label, value, sub, accent, delay = 0, animate = false, prefix = "", suffix = "" }) {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return (
    <div className="nsp-kpi-tile nsp-fade-up" style={{ animationDelay: `${delay}s` }}>
      <div className="nsp-kpi-value" style={{ color: accent }}>
        {animate && !isNaN(num)
          ? <CountUp end={num} prefix={prefix} suffix={suffix} />
          : value}
      </div>
      <div className="nsp-kpi-label">{label}</div>
      {sub && <div className="nsp-kpi-sub">{sub}</div>}
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

function Step2Screen({ store, onBack, onNext }) {
  const [calibDone, setCalibDone] = useState(false);
  const [calibLogs, setCalibLogs] = useState([]);
  const [constraints, setConstraints] = useState({ ...DEFAULT_CONSTRAINTS });
  const [saving, setSaving] = useState(false);
  const timers = useRef([]);

  const actuals = ACTUALS_381;
  const health  = computeHealth(constraints, actuals);

  // Derive available options from hierarchy
  const selectedCategoryObj = HIERARCHY.find(h => h.label === constraints.category) || HIERARCHY[0];
  const subCategoryOptions  = selectedCategoryObj.subs;

  const update = (key, val) => setConstraints(prev => ({ ...prev, [key]: val }));

  // When category changes, reset sub-category to first in new list
  const handleCategoryChange = (cat) => {
    const catObj = HIERARCHY.find(h => h.label === cat) || HIERARCHY[0];
    setConstraints(prev => ({ ...prev, category: cat, subCategory: catObj.subs[0] }));
  };

  // Scope label for health panel header
  const scopeDisplayLabel =
    constraints.scope === "global"      ? "Entire Store"      :
    constraints.scope === "subcategory" ? `${constraints.category} › ${constraints.subCategory}` :
    constraints.category;

  useEffect(() => {
    STEP2_CALIB.forEach(({ t, text }) => {
      const tid = setTimeout(() => setCalibLogs(p => [...p, text]), t);
      timers.current.push(tid);
    });
    const doneTid = setTimeout(() => setCalibDone(true), 2300);
    timers.current.push(doneTid);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function handleSave() {
    setSaving(true);
    setTimeout(() => { setSaving(false); onNext(); }, 1200);
  }

  const tierOk = health.tierSum === 100;

  return (
    <div className="nsp-step2-root nsp-fade-up">
      {/* Calibration loading overlay */}
      {!calibDone && (
        <div className="nsp-s2-calib">
          <div className="nsp-s2-calib-inner">
            <div className="nsp-s2-calib-orb"><Cpu size={22} /></div>
            <div className="nsp-s2-calib-title">Calibrating Constraint Baseline</div>
            <div className="nsp-s2-calib-sub">{store.market}, {store.state} · {constraints.category}</div>
            <div className="nsp-s2-calib-logs">
              {calibLogs.map((l, i) => (
                <div key={i} className="nsp-s2-calib-line nsp-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content (hidden until calib done) */}
      <div className={`nsp-s2-body ${calibDone ? "nsp-s2-visible" : "nsp-s2-hidden"}`}>

        {/* Scope bar */}
        <div className="nsp-s2-scope-bar">
          {/* Level pills */}
          <div className="nsp-s2-scope-options">
            {[
              { key: "global",      label: "Entire Store"  },
              { key: "category",    label: "Category"      },
              { key: "subcategory", label: "Sub-Category"  },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`nsp-scope-opt${constraints.scope === key ? " active" : ""}`}
                onClick={() => update("scope", key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Cascading dropdowns — only visible when scope ≠ global */}
          {constraints.scope !== "global" && (
            <div className="nsp-s2-cascade">
              {/* Category dropdown — always shown for category + subcategory */}
              <div className="nsp-s2-cascade-group">
                <span className="nsp-s2-cascade-label">Category</span>
                <div className="nsp-s2-scope-select-wrap">
                  <select
                    className="nsp-s2-scope-select"
                    value={constraints.category}
                    onChange={e => handleCategoryChange(e.target.value)}
                  >
                    {HIERARCHY.map(h => (
                      <option key={h.label} value={h.label}>{h.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="nsp-s2-scope-chev" />
                </div>
              </div>

              {/* Sub-category dropdown — only shown when scope === subcategory */}
              {constraints.scope === "subcategory" && (
                <>
                  <span className="nsp-s2-cascade-arrow">›</span>
                  <div className="nsp-s2-cascade-group">
                    <span className="nsp-s2-cascade-label">Sub-Category</span>
                    <div className="nsp-s2-scope-select-wrap">
                      <select
                        className="nsp-s2-scope-select"
                        value={constraints.subCategory}
                        onChange={e => update("subCategory", e.target.value)}
                      >
                        {subCategoryOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="nsp-s2-scope-chev" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Two-panel body */}
        <div className="nsp-s2-panels">

          {/* LEFT: Constraint form */}
          <div className="nsp-s2-left">

            {/* A: Space */}
            <div className="nsp-s2-section">
              <div className="nsp-s2-section-head">
                <span className="nsp-s2-section-letter">A</span>
                <span>Space &amp; Physical</span>
              </div>
              <div className="nsp-cf-grid">
                <ConstraintField label="Max SKU Count"     unit="SKUs"          value={constraints.maxSkuCount}   onChange={v => update("maxSkuCount", v)}   aiSuggested />
                <ConstraintField label="Min Facings/SKU"   unit="Facings"       value={constraints.minFacings}    onChange={v => update("minFacings", v)}    aiSuggested />
                <ConstraintField label="Max Linear Feet"   unit="Lin. Ft."      value={constraints.maxLinearFeet} onChange={v => update("maxLinearFeet", v)} aiSuggested />
              </div>
            </div>

            {/* B: Financial */}
            <div className="nsp-s2-section">
              <div className="nsp-s2-section-head">
                <span className="nsp-s2-section-letter">B</span>
                <span>Financial Guardrails</span>
              </div>
              <div className="nsp-cf-grid">
                <ConstraintField label="Gross Margin Floor" unit="%"        step={0.5}  value={constraints.targetMargin} onChange={v => update("targetMargin", v)} aiSuggested />
                <ConstraintField label="Max AUC"            unit="$ / unit" step={0.50} value={constraints.maxAUC}       onChange={v => update("maxAUC", v)}       aiSuggested />
                <ConstraintField label="Max Lead Time"      unit="Days"                 value={constraints.maxLeadTime}  onChange={v => update("maxLeadTime", v)}  aiSuggested />
                <ConstraintField label="OTB Budget"         unit="$"                    value={constraints.otbBudget}    onChange={v => update("otbBudget", v)}    aiSuggested />
              </div>
            </div>

            {/* C: Price Mix */}
            <div className="nsp-s2-section">
              <div className="nsp-s2-section-head">
                <span className="nsp-s2-section-letter">C</span>
                <span>Price Architecture Mix</span>
                <span className={`nsp-tier-total ${tierOk ? "ok" : "err"}`}>
                  {tierOk ? "✓" : "✗"} Total: {health.tierSum}%
                </span>
              </div>
              <div className="nsp-price-tier-grid">
                <div className="nsp-tier-field">
                  <div className="nsp-tier-label"><span className="nsp-tier-dot good" />Good (Entry)</div>
                  <div className="nsp-tier-input-row">
                    <input className="nsp-cf-input" type="number" step={5} value={constraints.goodPct} onChange={e => update("goodPct", +e.target.value || 0)} />
                    <span className="nsp-cf-unit">%</span>
                  </div>
                </div>
                <div className="nsp-tier-field">
                  <div className="nsp-tier-label"><span className="nsp-tier-dot better" />Better (Mid)</div>
                  <div className="nsp-tier-input-row">
                    <input className="nsp-cf-input" type="number" step={5} value={constraints.betterPct} onChange={e => update("betterPct", +e.target.value || 0)} />
                    <span className="nsp-cf-unit">%</span>
                  </div>
                </div>
                <div className="nsp-tier-field">
                  <div className="nsp-tier-label"><span className="nsp-tier-dot best" />Best (Premium)</div>
                  <div className="nsp-tier-input-row">
                    <input className="nsp-cf-input" type="number" step={5} value={constraints.bestPct} onChange={e => update("bestPct", +e.target.value || 0)} />
                    <span className="nsp-cf-unit">%</span>
                  </div>
                </div>
              </div>
              {/* Tier bar visualization */}
              <div className="nsp-tier-viz">
                <div className="nsp-tier-bar-good"   style={{ flex: constraints.goodPct   }} />
                <div className="nsp-tier-bar-better" style={{ flex: constraints.betterPct }} />
                <div className="nsp-tier-bar-best"   style={{ flex: constraints.bestPct   }} />
              </div>
            </div>
          </div>

          {/* RIGHT: Live health */}
          <div className="nsp-s2-right">
            <div className="nsp-s2-health-header">
              <Activity size={13} />
              <span>Live Health Check</span>
              <span className="nsp-s2-health-scope">{scopeDisplayLabel}</span>
            </div>

            <div className="nsp-s2-health-body">
              <HealthRow
                label="SKU Capacity"
                grade={health.sku.grade}
                pct={health.sku.pct}
                barLabel={health.sku.label}
              />
              <HealthRow
                label="Gross Margin"
                grade={health.margin.grade}
                gap={health.margin.gap}
                pct={health.margin.gap >= 0 ? 100 : Math.max(10, 100 + health.margin.gap * 5)}
                barLabel={health.margin.label}
              />
              <HealthRow
                label="OTB Budget"
                grade={health.otb.grade}
                pct={health.otb.pct}
                barLabel={health.otb.label}
              />
              <HealthRow
                label="Price Tier Balance"
                grade={health.tier.grade}
                pct={health.tier.gap >= 0 ? 100 : 65}
                barLabel={health.tier.label}
              />
            </div>

            {/* Agent insight */}
            <div className="nsp-s2-insight">
              <div className="nsp-s2-insight-head"><Zap size={11} /> Agent Insight</div>
              <p>
                Billings sits in a cold-continental cluster with strong contractor demand.
                Comparable stores (Denver, Salt Lake) run <strong>58–62% margin</strong> on Hardwood.
                Raising OTB to <strong>$135k</strong> and tightening AUC to <strong>$32</strong> would close the margin gap.
              </p>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="nsp-s2-action-bar">
          <button className="nsp-s2-back-btn" onClick={onBack} type="button">
            <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} /> Back
          </button>
          <button
            className="nsp-s2-reset-btn"
            onClick={() => setConstraints({ ...DEFAULT_CONSTRAINTS })}
            type="button"
          >
            <RotateCcw size={13} /> Reset to Defaults
          </button>
          <div style={{ flex: 1 }} />
          <button className="nsp-s2-template-btn" type="button">
            <Save size={13} /> Save as Template
          </button>
          <button
            className={`nsp-s2-save-btn${saving ? " saving" : ""}`}
            onClick={handleSave}
            disabled={saving || !tierOk}
            type="button"
          >
            {saving ? (
              <><span className="nsp-s2-saving-dot" /> Locking…</>
            ) : (
              <><Lock size={14} /> Save &amp; Lock Constraints<ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Gate Modal ───────────────────────────────────────────────────────

function S3GateModal({ onDone }) {
  const [logs, setLogs] = useState([]);
  const tids = useRef([]);

  useEffect(() => {
    GATE_LOGS.forEach(({ t, ok, warn, text }) => {
      const tid = setTimeout(() => setLogs(p => [...p, { ok, warn, text }]), t);
      tids.current.push(tid);
    });
    const doneTid = setTimeout(onDone, GATE_LOGS[GATE_LOGS.length - 1].t + 550);
    tids.current.push(doneTid);
    return () => tids.current.forEach(clearTimeout);
  }, []);

  return (
    <div className="nsp-s3-gate-modal">
      <div className="nsp-s3-gate-inner">
        <div className="nsp-s3-gate-orb">
          <Activity size={20} />
        </div>
        <div className="nsp-s3-gate-title">Fetching Global Exceptions &amp; Category Gates</div>
        <div className="nsp-s3-gate-sub">Wood › Solid Prefinished · Billings, MT</div>
        <div className="nsp-s3-gate-logs">
          {logs.map((l, i) => (
            <div
              key={i}
              className={`nsp-s3-gate-line nsp-fade-up ${l.warn ? "warn" : l.ok ? "ok" : ""}`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <span className="nsp-s3-gate-icon">{l.warn ? "⚠" : "✓"}</span>
              {l.text}
            </div>
          ))}
          {logs.length < GATE_LOGS.length && (
            <div className="nsp-s3-gate-spinner-row">
              <span className="nsp-s3-gate-dot-loader" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Weight slider helper ────────────────────────────────────────────

function WeightSlider({ label, value, color, onChange }) {
  return (
    <div className="nsp-s3-slider-row">
      <div className="nsp-s3-slider-label">{label}</div>
      <div className="nsp-s3-slider-track">
        <input
          type="range" min={0} max={100} value={value}
          className="nsp-s3-range"
          style={{ "--pct": `${value}%`, "--clr": color }}
          onChange={e => onChange(+e.target.value)}
        />
        <div className="nsp-s3-slider-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="nsp-s3-slider-pct" style={{ color }}>{value}%</div>
    </div>
  );
}

// ─── Step 3: Main Screen ──────────────────────────────────────────────────────
// Note: GlobalClusterDrawer removed. "Create New Cluster" now deep-links to the
// Agentic Clustering Studio so both modules share one authoritative creation flow.

function Step3Screen({ store, onBack, onNext, onNavigate }) {
  const [gatePhase, setGatePhase]           = useState("checking");
  const [clusterMode, setClusterMode]       = useState("existing");
  const [selectedMarket, setSelectedMarket] = useState("M3");
  const [weights, setWeights]               = useState({ structure: 35, market: 30, category: 20, climate: 15 });
  const [saving, setSaving]                 = useState(false);

  // Real cluster families from the Agentic Clustering Studio
  const clusterFamilies = useMemo(() => deriveClusterFamilies(LIVE_WOOD_RUN.id), []);
  const recommendedFamily = clusterFamilies.find(f => f.recommended) || clusterFamilies[0];
  const [selectedFamilyId, setSelectedFamilyId] = useState(recommendedFamily?.id || "");

  // Adjust weights proportionally so total stays at 100
  function adjustWeight(key, newVal) {
    const clamped = Math.max(0, Math.min(100, newVal));
    const remaining = 100 - clamped;
    const others = Object.keys(weights).filter(k => k !== key);
    const oldOtherSum = others.reduce((s, k) => s + weights[k], 0);
    const scaled = {};
    if (oldOtherSum === 0) {
      others.forEach((k, i) => { scaled[k] = i === 0 ? remaining : 0; });
    } else {
      let leftover = remaining;
      others.forEach((k, i) => {
        if (i === others.length - 1) { scaled[k] = leftover; }
        else { const v = Math.round(weights[k] / oldOtherSum * remaining); scaled[k] = v; leftover -= v; }
      });
    }
    setWeights({ ...weights, [key]: clamped, ...scaled });
  }

  // Recompute peer scores live from weights
  const scoredPeers = useMemo(() => {
    return BASE_PEERS.map(p => ({
      ...p,
      score: +(p.baseSim * (
        (weights.structure / 35) * 0.35 +
        (weights.market   / 30) * 0.30 +
        (weights.category / 20) * 0.20 +
        (weights.climate  / 15) * 0.15
      )).toFixed(1),
    })).sort((a, b) => b.score - a.score);
  }, [weights]);

  function handleSave() {
    setSaving(true);
    setTimeout(() => { setSaving(false); onNext(); }, 1200);
  }

  const selectedFamily = clusterFamilies.find(f => f.id === selectedFamilyId);
  const activeClusterLabel = selectedFamily
    ? `${selectedFamily.name} (${LIVE_WOOD_RUN.id})`
    : "Select a cluster";

  return (
    <div className="nsp-step3-root nsp-fade-up">
      {/* Gate modal */}
      {gatePhase === "checking" && <S3GateModal onDone={() => setGatePhase("done")} />}

      <div className={gatePhase === "done" ? "nsp-s3-visible" : "nsp-s2-hidden"}>

        {/* Gate banner */}
        <div className="nsp-s3-gate-banner">
          <AlertTriangle size={14} className="nsp-s3-banner-icon" />
          <div>
            <strong>Product-Profile Clustering Gated</strong>
            <span className="nsp-s3-banner-detail"> — Catalog Bridge Coverage 50.7% (gate: 80%). Tier 3 locked. Peer-pool inference active.</span>
          </div>
          <span className="nsp-s3-banner-badge">Fallback Active</span>
        </div>

        {/* Cluster mode toggle */}
        <div className="nsp-s3-mode-bar">
          <div className="nsp-s3-mode-label">Cluster Source</div>
          <div className="nsp-s3-mode-opts">
            <button
              type="button"
              className={`nsp-s3-mode-opt${clusterMode === "existing" ? " active" : ""}`}
              onClick={() => setClusterMode("existing")}
            >
              <span className={`nsp-s3-mode-radio${clusterMode === "existing" ? " on" : ""}`} />
              Select from Existing Cluster Family
            </button>
            <button
              type="button"
              className="nsp-s3-mode-opt nsp-s3-mode-opt-new"
              onClick={() => {
                // Signal AgenticClustering to open at the scope-selection workflow directly
                sessionStorage.setItem("acs_open_at", "scope");
                onNavigate && onNavigate("agentic-clustering");
              }}
            >
              <span className="nsp-s3-mode-radio" />
              <Globe size={12} style={{ marginRight: 4, color: "#818cf8" }} />
              Create New Cluster
              <span className="nsp-s3-external-chip">↗ Agentic Studio</span>
            </button>
          </div>
        </div>

        {/* Main two-panel body */}
        <div className="nsp-s3-panels">

          {/* LEFT: 4-tier selector */}
          <div className="nsp-s3-left">

            {/* Run provenance — pulled from Agentic Clustering Studio */}
            <div className="nsp-s3-run-provenance">
              <div className="nsp-s3-rp-icon">⚙</div>
              <div className="nsp-s3-rp-body">
                <div className="nsp-s3-rp-title">{LIVE_WOOD_RUN.scenarioName}</div>
                <div className="nsp-s3-rp-meta">
                  {LIVE_WOOD_RUN.id} · {LIVE_WOOD_RUN.scope} · {LIVE_WOOD_RUN.tiers} · Silhouette {LIVE_WOOD_RUN.silhouette}
                </div>
              </div>
              <span className="nsp-s3-live-chip">LIVE</span>
            </div>

            {/* Active cluster label */}
            <div className="nsp-s3-active-cluster">
              <div className="nsp-s3-active-cluster-label">Active Cluster</div>
              <div className="nsp-s3-active-cluster-name">{activeClusterLabel}</div>
            </div>

            {/* Tier 1A: Store Structure — sourced from Agentic Clustering Studio run {LIVE_WOOD_RUN.id} */}
            <div className="nsp-s3-tier-block">
              <div className="nsp-s3-tier-head">
                <span className="nsp-s3-tier-badge tier1a">1A</span>
                <span>Store Structure</span>
                <span className="nsp-s3-tier-status verified">Verified</span>
              </div>
              <div className="nsp-s3-family-list">
                {clusterFamilies.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    className={`nsp-s3-family-opt${selectedFamilyId === f.id ? " active" : ""}`}
                    onClick={() => setSelectedFamilyId(f.id)}
                  >
                    <div className="nsp-s3-family-top">
                      <span className="nsp-s3-family-letter">{f.name}</span>
                      {f.recommended && <span className="nsp-s3-rec-chip">Recommended</span>}
                      <span className="nsp-s3-fit-bar-wrap">
                        <span className="nsp-s3-fit-bar" style={{ width: `${f.fit}%`, background: f.fit >= 70 ? "#059669" : f.fit >= 40 ? "#d97706" : "#dc2626" }} />
                      </span>
                      <span className="nsp-s3-fit-pct">{f.fit}%</span>
                    </div>
                    <div className="nsp-s3-family-name">{f.stores} stores · cohesion {f.cohesion}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tier 1B: Market Context */}
            <div className="nsp-s3-tier-block">
              <div className="nsp-s3-tier-head">
                <span className="nsp-s3-tier-badge tier1b">1B</span>
                <span>Market Context</span>
                <span className="nsp-s3-tier-status verified">Verified</span>
              </div>
              <div className="nsp-s3-market-pills">
                {MARKET_CONTEXTS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`nsp-s3-market-pill${selectedMarket === m.id ? " active" : ""}`}
                    onClick={() => setSelectedMarket(m.id)}
                    title={m.desc}
                  >
                    {m.id}
                    {m.recommended && selectedMarket !== m.id && <span className="nsp-s3-market-rec-dot" />}
                  </button>
                ))}
              </div>
              {selectedMarket && (
                <div className="nsp-s3-market-desc">
                  <strong>{MARKET_CONTEXTS.find(m => m.id === selectedMarket)?.label}</strong>
                  {" — "}{MARKET_CONTEXTS.find(m => m.id === selectedMarket)?.desc}
                </div>
              )}
            </div>

            {/* Tier 2: Commercial Behavior — inferred */}
            <div className="nsp-s3-tier-block locked-amber">
              <div className="nsp-s3-tier-head">
                <span className="nsp-s3-tier-badge tier2">2</span>
                <span>Commercial Behavior</span>
                <span className="nsp-s3-tier-status inferred">Inferred</span>
              </div>
              <div className="nsp-s3-lock-msg amber">
                <Activity size={12} />
                Inferred via Peer Pool — No store sales history available.
                Demand proxied from {scoredPeers.slice(0, 3).map(p => p.loc).join(", ")}.
              </div>
            </div>

            {/* Tier 3: Product Profile — gated */}
            <div className="nsp-s3-tier-block locked-red">
              <div className="nsp-s3-tier-head">
                <span className="nsp-s3-tier-badge tier3">3</span>
                <span>Product Profile</span>
                <span className="nsp-s3-tier-status gated">Gated</span>
              </div>
              <div className="nsp-s3-lock-msg red">
                <Lock size={12} />
                Locked — Catalog Bridge Coverage 50.7% is below the 80% production gate.
                SKU scoring will rely on peer sales velocity &amp; vendor constraints.
              </div>
            </div>
          </div>

          {/* RIGHT: Synthetic scoring & peer pool */}
          <div className="nsp-s3-right">
            <div className="nsp-s3-right-header">
              <TrendingUp size={13} />
              <span>Synthetic Scoring &amp; Peer Pool</span>
              <span className="nsp-s3-right-target">Billings, MT · 55K sq ft</span>
            </div>

            {/* Weight sliders */}
            <div className="nsp-s3-sliders-wrap">
              <div className="nsp-s3-sliders-title">4-Lens Peer Weighting</div>
              <WeightSlider label="Store Structure Fit (Tier 1A)"      value={weights.structure} color="#4f46e5" onChange={v => adjustWeight("structure", v)} />
              <WeightSlider label="Enriched Market Context (Tier 1B)"  value={weights.market}    color="#0891b2" onChange={v => adjustWeight("market", v)}    />
              <WeightSlider label="Category Commercial Signal (Tier 2)" value={weights.category} color="#059669" onChange={v => adjustWeight("category", v)} />
              <WeightSlider label="Climate / Heating Season Fit"        value={weights.climate}  color="#d97706" onChange={v => adjustWeight("climate", v)}   />
              <div className="nsp-s3-weight-total">
                Total: <strong>100%</strong>
              </div>
            </div>

            {/* Peer table */}
            <div className="nsp-s3-peer-table-wrap">
              <div className="nsp-s3-peer-table-title">Top Matched Peer Stores</div>
              <table className="nsp-s3-peer-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Location</th>
                    <th>Size</th>
                    <th>Sim Score</th>
                    <th>Primary Fit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scoredPeers.map((p, i) => (
                    <tr key={p.id} className="nsp-fade-up" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                      <td className="nsp-s3-peer-id">{p.id}</td>
                      <td className="nsp-s3-peer-loc">{p.loc}</td>
                      <td className="nsp-s3-peer-sq">{p.sq}</td>
                      <td className="nsp-s3-peer-score">
                        <span className="nsp-s3-score-bar-wrap">
                          <span className="nsp-s3-score-bar" style={{ width: `${p.score}%` }} />
                        </span>
                        <span>{p.score}%</span>
                      </td>
                      <td className="nsp-s3-peer-fit">{p.fit}</td>
                      <td>
                        <span className={`nsp-s3-status-badge ${p.status}`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="nsp-s3-add-peer-btn" type="button">
                <Check size={11} /> Add / Remove Custom Peer Store
              </button>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="nsp-s2-action-bar">
          <button className="nsp-s2-back-btn" onClick={onBack} type="button">
            <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} /> Back to Constraints
          </button>
          <div style={{ flex: 1 }} />
          <button
            className={`nsp-s2-save-btn${saving ? " saving" : ""}`}
            onClick={handleSave}
            disabled={saving}
            type="button"
          >
            {saving
              ? <><span className="nsp-s2-saving-dot" /> Saving…</>
              : <><CheckCircle size={14} /> Save &amp; Proceed to SKU Evidence Base <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Step 4: SKU Optimization Engine ─────────────────────────────────────────

const CONSTRAINTS_381 = {
  maxSKUs: 25,
  marginFloor: 0.60,
  otbBudget: 120000,
  good: 30, better: 50, best: 20,
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

function Step4Screen({ store, onBack, onNext }) {
  const [pipelineStep, setPipelineStep] = useState(0);
  const [decisions, setDecisions]       = useState({});   // { [id]: "add"|"drop"|null }
  const [saving, setSaving]             = useState(false);

  // Animate through pipeline steps on mount
  useEffect(() => {
    const timers = [];
    [800, 1600, 2400].forEach((ms, i) => {
      timers.push(setTimeout(() => setPipelineStep(i + 1), ms));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const scoredSKUs = useMemo(() => {
    return SOLID_PREFINISHED_CANDIDATES.map(sku => {
      const score   = computeSKUScore(sku);
      const agentRec= computeAgentRec(sku, score);
      const reasons = computeReasonCodes(sku, score);
      const conf    = computeConfidence(sku, score);
      return { ...sku, score, agentRec, reasonCodes: reasons, confidence: conf };
    }).sort((a, b) => b.score - a.score);
  }, []);

  const effectiveDecisions = useMemo(() => {
    return scoredSKUs.map(s => decisions[s.id] ?? s.agentRec);
  }, [scoredSKUs, decisions]);

  const addedSKUs    = scoredSKUs.filter((s, i) => effectiveDecisions[i] === "add");
  const droppedSKUs  = scoredSKUs.filter((s, i) => effectiveDecisions[i] === "drop");

  // Live health
  const totalCost       = addedSKUs.reduce((sum, s) => sum + s.cost * 400, 0); // 400 sqft estimate per SKU
  const blendedMargin   = addedSKUs.length
    ? addedSKUs.reduce((s, k) => s + k.margin, 0) / addedSKUs.length
    : 0;
  const optionCount     = addedSKUs.length;
  const gbbCounts       = { Good: 0, Better: 0, Best: 0 };
  addedSKUs.forEach(s => { if (gbbCounts[s.gbbTier] !== undefined) gbbCounts[s.gbbTier]++; });
  const gbbTotal        = addedSKUs.length || 1;
  const gbbGoodPct      = Math.round(gbbCounts.Good   / gbbTotal * 100);
  const gbbBetterPct    = Math.round(gbbCounts.Better / gbbTotal * 100);
  const gbbBestPct      = Math.round(gbbCounts.Best   / gbbTotal * 100);
  const marginGap       = blendedMargin - CONSTRAINTS_381.marginFloor;
  const otbUsed         = Math.min(totalCost, ACTUALS_OTB);

  // OTB cutoff index — find where cumulative cost exceeds budget
  let runningCost = 0;
  const cutoffIdx = scoredSKUs.findIndex(s => {
    if (effectiveDecisions[scoredSKUs.indexOf(s)] === "add") {
      runningCost += s.cost * 400;
    }
    return runningCost > CONSTRAINTS_381.otbBudget;
  });

  // Depth & breadth
  const totalCartons  = addedSKUs.reduce((sum, s) => sum + Math.ceil(400 / s.cartonSqft) * 2, 0);
  const avgCartons    = addedSKUs.length ? Math.round(totalCartons / addedSKUs.length) : 0;
  const expectedTurn  = blendedMargin > 0 ? (blendedMargin * 8).toFixed(1) : "—";

  function toggleDecision(id, val) {
    setDecisions(prev => ({ ...prev, [id]: prev[id] === val ? null : val }));
  }

  function handleProceed() {
    setSaving(true);
    setTimeout(() => { setSaving(false); onNext(); }, 1200);
  }

  const rcColor = { "Peer Velocity Leader": "#059669", "Climate Match": "#0ea5e9", "High Margin Anchor": "#8b5cf6", "Core Carry": "#6366f1", "Conflict Risk": "#f59e0b", "End-of-Life": "#dc2626" };

  return (
    <div className="nsp-step4-root">

      {/* ── Sub-pipeline stepper ────────────────────────────────────────── */}
      <div className="nsp-s4-pipeline">
        {PIPELINE_STEPS.map((ps, i) => (
          <div key={ps.id} className={`nsp-s4-pipe-step${i <= pipelineStep ? " done" : ""}${i === pipelineStep ? " active" : ""}`}>
            <div className="nsp-s4-pipe-icon">
              {i < pipelineStep ? <CheckCircle size={13} /> : <span>{i + 1}</span>}
            </div>
            <span>{ps.label}</span>
            {i < PIPELINE_STEPS.length - 1 && <ChevronRight size={12} className="nsp-s4-pipe-arrow" />}
          </div>
        ))}
      </div>

      {/* ── Constraint guardrail bar ────────────────────────────────────── */}
      <div className="nsp-s4-guard-bar">
        <div className="nsp-s4-guard-title"><AlertTriangle size={13} /> Constraint Guardrails Active</div>
        <div className="nsp-s4-guard-pills">
          {[
            { label: `OTB $${(CONSTRAINTS_381.otbBudget/1000).toFixed(0)}k`, ok: totalCost <= CONSTRAINTS_381.otbBudget },
            { label: `Margin ≥ ${(CONSTRAINTS_381.marginFloor*100).toFixed(0)}%`, ok: marginGap >= 0 },
            { label: `Max ${CONSTRAINTS_381.maxSKUs} SKUs`, ok: optionCount <= CONSTRAINTS_381.maxSKUs },
            { label: `GBB ${CONSTRAINTS_381.good}/${CONSTRAINTS_381.better}/${CONSTRAINTS_381.best}%`, ok: Math.abs(gbbGoodPct - CONSTRAINTS_381.good) <= 8 },
          ].map(g => (
            <span key={g.label} className={`nsp-s4-guard-pill ${g.ok ? "pass" : "fail"}`}>
              {g.ok ? <CheckCircle size={10} /> : <AlertTriangle size={10} />} {g.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main two-panel body ─────────────────────────────────────────── */}
      <div className="nsp-s4-panels">

        {/* LEFT: Scored SKU table */}
        <div className="nsp-s4-left">
          <div className="nsp-s4-table-head">
            <span className="nsp-s4-th-score">Score</span>
            <span className="nsp-s4-th-desc">SKU / Description</span>
            <span className="nsp-s4-th-margin">Margin</span>
            <span className="nsp-s4-th-vel">Peer Vel.</span>
            <span className="nsp-s4-th-lc">Lifecycle</span>
            <span className="nsp-s4-th-codes">Signals</span>
            <span className="nsp-s4-th-action">Decision</span>
          </div>
          <div className="nsp-s4-table-body">
            {scoredSKUs.map((sku, idx) => {
              const eff = decisions[sku.id] ?? sku.agentRec;
              const isOverridden = decisions[sku.id] && decisions[sku.id] !== sku.agentRec;
              const pastCutoff   = cutoffIdx !== -1 && idx >= cutoffIdx;
              return (
                <React.Fragment key={sku.id}>
                  {cutoffIdx !== -1 && idx === cutoffIdx && (
                    <div className="nsp-s4-otb-line">
                      <span>—— OTB Budget Ceiling ——</span>
                    </div>
                  )}
                  <div className={`nsp-s4-sku-row${eff === "drop" ? " dropped" : ""}${pastCutoff ? " past-cutoff" : ""}`}>
                    {/* Score ring */}
                    <div className={`nsp-s4-score-ring ${sku.score >= 70 ? "high" : sku.score >= 45 ? "mid" : "low"}`}>
                      {sku.score}
                    </div>
                    {/* SKU + desc */}
                    <div className="nsp-s4-sku-info">
                      <div className="nsp-s4-sku-desc">{sku.description}</div>
                      <div className="nsp-s4-sku-meta">{sku.sku} · {sku.finish} · {sku.width} · {sku.gbbTier}</div>
                      {sku.conflictFlag && <div className="nsp-s4-conflict-tag"><AlertTriangle size={9}/> {sku.conflictFlag}</div>}
                    </div>
                    {/* Margin */}
                    <div className="nsp-s4-cell-margin">
                      {(sku.margin * 100).toFixed(0)}%
                      {sku.margin < CONSTRAINTS_381.marginFloor && <span className="nsp-s4-margin-warn">↓</span>}
                    </div>
                    {/* Peer velocity */}
                    <div className="nsp-s4-cell-vel">
                      {sku.peerVelocity > 0 ? sku.peerVelocity.toFixed(0) : "—"}
                    </div>
                    {/* Lifecycle */}
                    <div className={`nsp-s4-lc-badge lc-${sku.lifecycle.toLowerCase().replace(/\s/g,"")}`}>
                      {sku.lifecycle}
                    </div>
                    {/* Reason code chips */}
                    <div className="nsp-s4-codes">
                      {sku.reasonCodes.map(rc => (
                        <span key={rc} className="nsp-s4-rc-chip" style={{ borderColor: rcColor[rc] || "#64748b", color: rcColor[rc] || "#94a3b8" }}>{rc}</span>
                      ))}
                    </div>
                    {/* Decision buttons */}
                    <div className="nsp-s4-actions">
                      {isOverridden && <span className="nsp-s4-override-dot" title="Overridden" />}
                      <button
                        type="button"
                        className={`nsp-s4-dec-btn add${eff === "add" ? " active" : ""}`}
                        onClick={() => toggleDecision(sku.id, "add")}
                      >Add</button>
                      <button
                        type="button"
                        className={`nsp-s4-dec-btn drop${eff === "drop" ? " active" : ""}`}
                        onClick={() => toggleDecision(sku.id, "drop")}
                      >Drop</button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Live health panel */}
        <div className="nsp-s4-right">
          <div className="nsp-s4-health-header">
            <Activity size={13} /> Live Health Check
          </div>

          {/* OTB */}
          <div className="nsp-s4-health-block">
            <div className="nsp-s4-hb-label">OTB Budget</div>
            <div className="nsp-s4-hb-values">
              <span>${(otbUsed/1000).toFixed(0)}k</span>
              <span className="nsp-s4-hb-sep">/</span>
              <span>${(CONSTRAINTS_381.otbBudget/1000).toFixed(0)}k</span>
            </div>
            <div className="nsp-s4-hb-bar-track">
              <div className="nsp-s4-hb-bar" style={{ width: `${Math.min(100, (otbUsed/CONSTRAINTS_381.otbBudget)*100)}%`, background: otbUsed > CONSTRAINTS_381.otbBudget ? "#dc2626" : "#059669" }} />
            </div>
            <span className={`nsp-s4-hb-badge ${otbUsed <= CONSTRAINTS_381.otbBudget ? "pass" : "fail"}`}>{otbUsed <= CONSTRAINTS_381.otbBudget ? "PASS" : "OVER"}</span>
          </div>

          {/* Blended margin */}
          <div className="nsp-s4-health-block">
            <div className="nsp-s4-hb-label">Blended Gross Margin</div>
            <div className="nsp-s4-hb-values">
              <span className={marginGap >= 0 ? "nsp-s4-hb-pos" : "nsp-s4-hb-neg"}>
                {(blendedMargin * 100).toFixed(1)}%
              </span>
              <span className="nsp-s4-hb-sep">target</span>
              <span>{(CONSTRAINTS_381.marginFloor * 100).toFixed(0)}%</span>
            </div>
            <div className="nsp-s4-hb-bar-track">
              <div className="nsp-s4-hb-bar" style={{ width: `${Math.min(100, blendedMargin / CONSTRAINTS_381.marginFloor * 100)}%`, background: marginGap >= 0 ? "#059669" : "#dc2626" }} />
            </div>
            <span className={`nsp-s4-hb-badge ${marginGap >= 0 ? "pass" : "fail"}`}>
              {marginGap >= 0 ? `+${(marginGap*100).toFixed(1)}%` : `${(marginGap*100).toFixed(1)}%`}
            </span>
          </div>

          {/* Option count */}
          <div className="nsp-s4-health-block">
            <div className="nsp-s4-hb-label">Option Count</div>
            <div className="nsp-s4-hb-values">
              <span>{optionCount}</span><span className="nsp-s4-hb-sep">/</span><span>{CONSTRAINTS_381.maxSKUs} Max</span>
            </div>
            <div className="nsp-s4-hb-bar-track">
              <div className="nsp-s4-hb-bar" style={{ width: `${Math.min(100, (optionCount/CONSTRAINTS_381.maxSKUs)*100)}%`, background: "#6366f1" }} />
            </div>
            <span className={`nsp-s4-hb-badge ${optionCount <= CONSTRAINTS_381.maxSKUs ? "pass" : "fail"}`}>{optionCount <= CONSTRAINTS_381.maxSKUs ? "PASS" : "OVER"}</span>
          </div>

          {/* GBB mix */}
          <div className="nsp-s4-health-block">
            <div className="nsp-s4-hb-label">GBB Mix</div>
            <div className="nsp-s4-gbb-row">
              <span className="nsp-s4-gbb-seg good">{gbbGoodPct}% Good</span>
              <span className="nsp-s4-gbb-seg better">{gbbBetterPct}% Better</span>
              <span className="nsp-s4-gbb-seg best">{gbbBestPct}% Best</span>
            </div>
            <span className={`nsp-s4-hb-badge ${Math.abs(gbbGoodPct - CONSTRAINTS_381.good) <= 8 ? "warn" : "fail"}`}>
              {Math.abs(gbbGoodPct - CONSTRAINTS_381.good) <= 8 ? "WARNING" : "FAIL"}
            </span>
          </div>

          {/* Dropped count */}
          <div className="nsp-s4-dropped-note">
            <AlertTriangle size={11} /> {droppedSKUs.length} SKU{droppedSKUs.length !== 1 ? "s" : ""} dropped by guardrails
          </div>
        </div>
      </div>

      {/* ── Depth & Breadth summary ─────────────────────────────────────── */}
      <div className="nsp-s4-depth-bar">
        <div className="nsp-s4-db-cell">
          <div className="nsp-s4-db-val">{optionCount}</div>
          <div className="nsp-s4-db-label">Styles Selected (Breadth)</div>
        </div>
        <div className="nsp-s4-db-divider" />
        <div className="nsp-s4-db-cell">
          <div className="nsp-s4-db-val">{avgCartons}</div>
          <div className="nsp-s4-db-label">Avg Cartons / Style (Depth)</div>
        </div>
        <div className="nsp-s4-db-divider" />
        <div className="nsp-s4-db-cell">
          <div className="nsp-s4-db-val">{totalCartons}</div>
          <div className="nsp-s4-db-label">Total Cartons</div>
        </div>
        <div className="nsp-s4-db-divider" />
        <div className="nsp-s4-db-cell">
          <div className="nsp-s4-db-val">{expectedTurn}×</div>
          <div className="nsp-s4-db-label">Expected Annual Turn</div>
        </div>
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <div className="nsp-s4-action-bar">
        <button type="button" className="nsp-s4-back-btn" onClick={onBack}>
          ← Back to Cluster Assignment
        </button>
        <button
          type="button"
          className={`nsp-s4-next-btn${saving ? " saving" : ""}`}
          onClick={handleProceed}
          disabled={saving || optionCount === 0}
        >
          {saving ? <><span className="nsp-s2-saving-dot" /> Processing…</> : <>Proceed to Merchant Review <ArrowRight size={14} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Merchant Review & Lock ──────────────────────────────────────────

function computeInstallAttach(addedSKUs) {
  const totalSqft = addedSKUs.reduce((s, k) => s + Math.ceil(400 / k.cartonSqft) * k.cartonSqft, 0);
  const cfg = INSTALL_ATTACH_CONFIG;
  return [
    { ...cfg.underlayment, qty: Math.ceil(totalSqft / cfg.underlayment.sqftPerUnit),  total: Math.ceil(totalSqft / cfg.underlayment.sqftPerUnit) * cfg.underlayment.cost },
    { ...cfg.transStrips,  qty: Math.ceil(addedSKUs.length * cfg.transStrips.perSkuRatio), total: Math.ceil(addedSKUs.length * cfg.transStrips.perSkuRatio) * cfg.transStrips.cost },
    { ...cfg.nailer,       qty: Math.ceil(totalSqft / cfg.nailer.sqftPerUnit),         total: Math.ceil(totalSqft / cfg.nailer.sqftPerUnit) * cfg.nailer.cost },
    { ...cfg.adhesive,     qty: Math.ceil(totalSqft / cfg.adhesive.sqftPerUnit),        total: Math.ceil(totalSqft / cfg.adhesive.sqftPerUnit) * cfg.adhesive.cost },
    { ...cfg.cleaner,      qty: Math.ceil(addedSKUs.length * cfg.cleaner.perSkuRatio),  total: Math.ceil(addedSKUs.length * cfg.cleaner.perSkuRatio) * cfg.cleaner.cost },
  ];
}

const OVERRIDE_REASONS = [
  "Strategic Local Favorite",
  "Vendor Commitment",
  "Regional Demand Signal",
  "Margin Optimization",
  "Display / Planogram Requirement",
  "Competitive Response",
];

const SWAP_CATALOG = SOLID_PREFINISHED_CANDIDATES.map(s => ({
  id: s.id, sku: s.sku, description: s.description, retail: s.retail, margin: s.margin,
}));

function Step5Screen({ store, onBack, onNext }) {
  const [reviewState, setReviewState]   = useState({});    // { [id]: "approved"|"locked"|"dropped" }
  const [overrideLog, setOverrideLog]   = useState({});    // { [id]: { reason } }
  const [swapTarget, setSwapTarget]     = useState(null);  // skuId being swapped
  const [swapReason, setSwapReason]     = useState(OVERRIDE_REASONS[0]);
  const [swapSearch, setSwapSearch]     = useState("");
  const [poOpen, setPoOpen]             = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);

  // Score all SKUs to derive the agent-recommended add list
  const scoredSKUs = useMemo(() => {
    return SOLID_PREFINISHED_CANDIDATES.map(sku => {
      const score    = computeSKUScore(sku);
      const agentRec = computeAgentRec(sku, score);
      const reasons  = computeReasonCodes(sku, score);
      const conf     = computeConfidence(sku, score);
      return { ...sku, score, agentRec, reasonCodes: reasons, confidence: conf };
    }).sort((a, b) => b.score - a.score);
  }, []);

  const mandatory    = useMemo(() => scoredSKUs.filter(s => s.lifecycle === "Core" && s.score >= 70), [scoredSKUs]);
  const agentAdds    = useMemo(() => scoredSKUs.filter(s => s.agentRec === "add" && !mandatory.find(m => m.id === s.id)), [scoredSKUs, mandatory]);
  const available    = useMemo(() => scoredSKUs.filter(s => s.agentRec === "drop"), [scoredSKUs]);

  function getState(id) { return reviewState[id] ?? "pending"; }
  function setState(id, val) { setReviewState(prev => ({ ...prev, [id]: val })); }

  function approveAll() {
    const next = {};
    [...mandatory, ...agentAdds].forEach(s => { next[s.id] = "approved"; });
    setReviewState(prev => ({ ...prev, ...next }));
  }

  function openSwap(id) { setSwapTarget(id); setSwapSearch(""); setSwapReason(OVERRIDE_REASONS[0]); }
  function confirmSwap() {
    if (!swapTarget) return;
    setState(swapTarget, "swapped");
    setOverrideLog(prev => ({ ...prev, [swapTarget]: { reason: swapReason } }));
    setSwapTarget(null);
  }

  // PO data
  const addedSKUs  = [...mandatory, ...agentAdds].filter(s => getState(s.id) !== "dropped");
  const attachRows = useMemo(() => computeInstallAttach(addedSKUs), [addedSKUs.length]);
  const skuPOTotal = addedSKUs.reduce((s, k) => s + k.cost * Math.ceil(400 / k.cartonSqft) * 2, 0);
  const attachTotal= attachRows.reduce((s, r) => s + r.total, 0);

  function handleSubmit() {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 1800);
  }

  const rcColor = { "Peer Velocity Leader": "#059669", "Climate Match": "#0ea5e9", "High Margin Anchor": "#8b5cf6", "Core Carry": "#6366f1", "Conflict Risk": "#f59e0b", "End-of-Life": "#dc2626" };

  function ReviewRow({ sku, locked }) {
    const st = getState(sku.id);
    return (
      <div className={`nsp-s5-row${st === "approved" || st === "locked" ? " approved" : ""}${st === "dropped" ? " dropped" : ""}${st === "swapped" ? " swapped" : ""}`}>
        <div className={`nsp-s5-score ${sku.score >= 70 ? "high" : sku.score >= 45 ? "mid" : "low"}`}>{sku.score}</div>
        <div className="nsp-s5-info">
          <div className="nsp-s5-desc">{sku.description}</div>
          <div className="nsp-s5-meta">{sku.sku} · ${sku.retail}/sqft · {sku.width}</div>
          <div className="nsp-s5-codes">
            {sku.reasonCodes.map(rc => (
              <span key={rc} className="nsp-s5-rc" style={{ color: rcColor[rc] || "#94a3b8" }}>{rc}</span>
            ))}
          </div>
        </div>
        <div className="nsp-s5-conf">{sku.confidence}%</div>
        <div className="nsp-s5-margin">{(sku.margin*100).toFixed(0)}%</div>
        <div className="nsp-s5-vel">{sku.peerVelocity > 0 ? sku.peerVelocity.toFixed(0) : "—"}</div>
        {overrideLog[sku.id] && (
          <div className="nsp-s5-override-tag">↳ {overrideLog[sku.id].reason}</div>
        )}
        <div className="nsp-s5-actions">
          {locked ? (
            <span className="nsp-s5-mandatory-badge"><Lock size={10} /> Mandatory</span>
          ) : (
            <>
              <button type="button" className={`nsp-s5-btn approve${st === "approved" ? " on" : ""}`} onClick={() => setState(sku.id, st === "approved" ? "pending" : "approved")}><CheckCircle size={11}/> Approve</button>
              <button type="button" className={`nsp-s5-btn lock${st === "locked" ? " on" : ""}`}    onClick={() => setState(sku.id, st === "locked"   ? "pending" : "locked"  )}><Lock size={11}/> Lock</button>
              <button type="button" className="nsp-s5-btn swap"  onClick={() => openSwap(sku.id)}><RotateCcw size={11}/> Swap</button>
              <button type="button" className={`nsp-s5-btn drop${st === "dropped" ? " on" : ""}`}  onClick={() => setState(sku.id, st === "dropped"  ? "pending" : "dropped" )}>Drop</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="nsp-s5-success">
        <CheckCircle size={48} className="nsp-s5-success-icon" />
        <div className="nsp-s5-success-title">Assortment Locked & PO Generated</div>
        <div className="nsp-s5-success-sub">
          {addedSKUs.length} SKUs approved · ${((skuPOTotal + attachTotal)/1000).toFixed(1)}k total PO · Sent to OMS
        </div>
        <button type="button" className="nsp-s4-next-btn" onClick={onNext}>
          Proceed to Post-Opening Feedback <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="nsp-s5-root">

      {/* Header */}
      <div className="nsp-s5-header">
        <div className="nsp-s5-header-left">
          <div className="nsp-s5-header-title">Merchant Review &amp; Lock</div>
          <div className="nsp-s5-header-sub">{store.name} · Wood › Solid Prefinished · {[...mandatory,...agentAdds].length} SKUs pending review</div>
        </div>
        <div className="nsp-s5-header-actions">
          <button type="button" className="nsp-s5-approve-all-btn" onClick={approveAll}>
            <CheckCircle size={13}/> Approve All Agent Picks
          </button>
          <button type="button" className="nsp-s5-po-btn" onClick={() => setPoOpen(o => !o)}>
            <Save size={13}/> {poOpen ? "Hide PO" : "Export Draft PO"}
          </button>
        </div>
      </div>

      {/* PO panel */}
      {poOpen && (
        <div className="nsp-s5-po-panel">
          <div className="nsp-s5-po-title">Draft Purchase Order — Billings, MT</div>
          <div className="nsp-s5-po-section-head">Primary SKU Order</div>
          <div className="nsp-s5-po-table">
            <div className="nsp-s5-po-thead">
              <span>SKU</span><span>Description</span><span>Cartons</span><span>Unit Cost</span><span>Line Total</span>
            </div>
            {addedSKUs.map(s => {
              const cartons = Math.ceil(400 / s.cartonSqft) * 2;
              return (
                <div key={s.id} className="nsp-s5-po-row">
                  <span>{s.sku}</span>
                  <span>{s.description}</span>
                  <span>{cartons}</span>
                  <span>${s.cost.toFixed(2)}</span>
                  <span>${(s.cost * cartons).toFixed(2)}</span>
                </div>
              );
            })}
            <div className="nsp-s5-po-subtotal">SKU Subtotal: ${skuPOTotal.toFixed(2)}</div>
          </div>
          <div className="nsp-s5-po-section-head">Install Attach &amp; Accessories</div>
          <div className="nsp-s5-po-table">
            <div className="nsp-s5-po-thead">
              <span>Item</span><span>Qty</span><span>Unit</span><span>Unit Cost</span><span>Line Total</span>
            </div>
            {attachRows.map(r => (
              <div key={r.desc} className="nsp-s5-po-row">
                <span>{r.desc}</span>
                <span>{r.qty}</span>
                <span>{r.unit}</span>
                <span>${r.cost.toFixed(2)}</span>
                <span>${r.total.toFixed(2)}</span>
              </div>
            ))}
            <div className="nsp-s5-po-subtotal">Attach Subtotal: ${attachTotal.toFixed(2)}</div>
          </div>
          <div className="nsp-s5-po-grand">Grand Total: ${(skuPOTotal + attachTotal).toFixed(2)}</div>
        </div>
      )}

      {/* Swap modal */}
      {swapTarget && (
        <div className="nsp-s5-swap-overlay" onClick={e => e.target === e.currentTarget && setSwapTarget(null)}>
          <div className="nsp-s5-swap-modal">
            <div className="nsp-s5-swap-title"><RotateCcw size={14} /> Swap SKU</div>
            <div className="nsp-s5-swap-orig">Replacing: <strong>{scoredSKUs.find(s => s.id === swapTarget)?.description}</strong></div>
            <input className="nsp-s5-swap-search" placeholder="Search replacement SKU…" value={swapSearch} onChange={e => setSwapSearch(e.target.value)} />
            <div className="nsp-s5-swap-list">
              {SWAP_CATALOG.filter(s => s.id !== swapTarget && s.description.toLowerCase().includes(swapSearch.toLowerCase())).map(s => (
                <div key={s.id} className="nsp-s5-swap-item">{s.description} · ${s.retail}/sqft · {(s.margin*100).toFixed(0)}% margin</div>
              ))}
            </div>
            <div className="nsp-s5-swap-reason-label">Override Reason</div>
            <select className="nsp-s5-swap-select" value={swapReason} onChange={e => setSwapReason(e.target.value)}>
              {OVERRIDE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="nsp-s5-swap-actions">
              <button type="button" className="nsp-s5-swap-cancel" onClick={() => setSwapTarget(null)}>Cancel</button>
              <button type="button" className="nsp-s5-swap-confirm" onClick={confirmSwap}>Confirm Swap &amp; Log</button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory tier */}
      <div className="nsp-s5-tier">
        <div className="nsp-s5-tier-head">
          <Lock size={12}/> Core / Mandatory
          <span className="nsp-s5-tier-badge mandatory">{mandatory.length} SKUs · Cannot be dropped</span>
        </div>
        {mandatory.map(s => <ReviewRow key={s.id} sku={s} locked />)}
      </div>

      {/* Agent-recommended tier */}
      <div className="nsp-s5-tier">
        <div className="nsp-s5-tier-head">
          <Zap size={12}/> Agent Recommended — Add
          <span className="nsp-s5-tier-badge agent">{agentAdds.length} SKUs · Approve, Lock, Swap, or Drop</span>
        </div>
        {agentAdds.map(s => <ReviewRow key={s.id} sku={s} locked={false} />)}
      </div>

      {/* Available tier */}
      <div className="nsp-s5-tier">
        <div className="nsp-s5-tier-head">
          <TrendingUp size={12}/> Available for Review
          <span className="nsp-s5-tier-badge available">{available.length} SKUs · Force-add or ignore</span>
        </div>
        {available.map(s => <ReviewRow key={s.id} sku={s} locked={false} />)}
      </div>

      {/* Action bar */}
      <div className="nsp-s4-action-bar">
        <button type="button" className="nsp-s4-back-btn" onClick={onBack}>← Back to SKU Optimization</button>
        <button
          type="button"
          className={`nsp-s4-next-btn${submitting ? " saving" : ""}`}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <><span className="nsp-s2-saving-dot" /> Submitting to OMS…</> : <>Submit &amp; Lock Assortment <ArrowRight size={14} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 6: Post-Opening Feedback Loop ───────────────────────────────────────

const FEEDBACK_KPIS = [
  { label: "Sales / Sqft",    target: "4.50",  unit: "$/sqft/wk", icon: "📈", hint: "Peer avg: $4.20" },
  { label: "Sell-Through",    target: "72%",   unit: "at Wk 8",   icon: "🔄", hint: "Cluster avg: 68%" },
  { label: "GMROI",           target: "2.4×",  unit: "annual",    icon: "💰", hint: "Fleet avg: 2.2×" },
  { label: "Days of Supply",  target: "< 42",  unit: "days",      icon: "📦", hint: "Trigger replen at 28d" },
  { label: "Peer Gap",        target: "< 10%", unit: "vs top peer",icon: "🎯", hint: "Auto-flag if > 15%" },
];

const TRACKING_WEEKS = [
  { wk: 1, phase: "Cold-Start",    desc: "SKU sell-in and rack setup tracking" },
  { wk: 4, phase: "Early Signal",  desc: "First velocity reads vs peer baselines" },
  { wk: 8, phase: "Calibration",   desc: "GBB mix and sell-through review trigger" },
  { wk: 16, phase: "Graduation",   desc: "Store graduates from cold-start proxy to live" },
];

function Step6Screen({ store, onBack }) {
  const [graduated, setGraduated] = useState(false);

  return (
    <div className="nsp-s6-root">

      {/* Hero */}
      <div className="nsp-s6-hero">
        <div className="nsp-s6-hero-icon">
          {graduated ? <CheckCircle size={32} /> : <Activity size={32} />}
        </div>
        <div>
          <div className="nsp-s6-hero-title">{graduated ? "Store Graduated — Live Network" : "Post-Opening Feedback Loop"}</div>
          <div className="nsp-s6-hero-sub">
            {graduated
              ? `${store.name} has been promoted from Cold-Start Proxy to Live in the Global Cluster Registry.`
              : `Weeks 1–16: Cold-Start Tracking active for ${store.name}. KPIs will populate as POS data flows in.`}
          </div>
        </div>
        {!graduated && (
          <div className="nsp-s6-pulse-ring">
            <div className="nsp-s6-pulse-dot" />
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="nsp-s6-timeline">
        {TRACKING_WEEKS.map((tw, i) => (
          <div key={tw.wk} className={`nsp-s6-timeline-step${graduated && i < TRACKING_WEEKS.length - 1 ? " done" : ""}${graduated && i === TRACKING_WEEKS.length - 1 ? " active" : ""}`}>
            <div className="nsp-s6-tl-dot" />
            {i < TRACKING_WEEKS.length - 1 && <div className="nsp-s6-tl-line" />}
            <div className="nsp-s6-tl-body">
              <div className="nsp-s6-tl-wk">Week {tw.wk}</div>
              <div className="nsp-s6-tl-phase">{tw.phase}</div>
              <div className="nsp-s6-tl-desc">{tw.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="nsp-s6-kpi-section-head">Target KPIs — Populates at First Sales Upload</div>
      <div className="nsp-s6-kpi-grid">
        {FEEDBACK_KPIS.map(kpi => (
          <div key={kpi.label} className={`nsp-s6-kpi-card${graduated ? " graduated" : ""}`}>
            <div className="nsp-s6-kpi-icon">{kpi.icon}</div>
            <div className="nsp-s6-kpi-label">{kpi.label}</div>
            <div className="nsp-s6-kpi-target">{kpi.target} <span className="nsp-s6-kpi-unit">{kpi.unit}</span></div>
            <div className={`nsp-s6-kpi-actual${graduated ? "" : " placeholder"}`}>
              {graduated ? kpi.target : "— awaiting POS"}
            </div>
            <div className="nsp-s6-kpi-hint">{kpi.hint}</div>
          </div>
        ))}
      </div>

      {/* Agent insight */}
      <div className="nsp-s6-agent-insight">
        <div className="nsp-s6-ai-icon"><Cpu size={14} /></div>
        <div className="nsp-s6-ai-body">
          <div className="nsp-s6-ai-label">Agent Insight</div>
          <div className="nsp-s6-ai-text">
            Activate auto-replenishment trigger when Days of Supply drops below 28 days. At Week 8, run a GBB mix audit against peer cluster and flag any SKU below 15 R13 sqft for potential drop. {store.name} will auto-graduate to Live status once 12 consecutive weeks of POS data are received.
          </div>
        </div>
      </div>

      {/* Graduate button */}
      {!graduated && (
        <div className="nsp-s6-graduate-wrap">
          <button
            type="button"
            className="nsp-s6-graduate-btn"
            onClick={() => setGraduated(true)}
          >
            <CheckCircle size={16} /> Graduate Store — Move to Live Network
          </button>
          <div className="nsp-s6-graduate-hint">
            Removes Cold-Start Proxy status and activates full demand-signal participation in Cluster {"{B-M3-1-P2}"}.
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="nsp-s4-action-bar" style={{ marginTop: 32 }}>
        <button type="button" className="nsp-s4-back-btn" onClick={onBack}>← Back to Review &amp; Lock</button>
        {graduated && (
          <div className="nsp-s6-complete-badge"><CheckCircle size={14} /> New Store Planning Complete</div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewStorePlanning({ onNavigate }) {
  const newStores = useMemo(() => LOCATIONS.filter(l => l.storeType === "New Store"), []);
  const [selectedId, setSelectedId] = useState(newStores.length > 0 ? String(newStores[0].id) : "");
  const [flowStep, setFlowStep]   = useState(1);
  const [phase, setPhase]         = useState("idle"); // idle | running | results
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const logEndRef = useRef(null);
  const timers = useRef([]);

  const store = useMemo(
    () => LOCATIONS.find(l => String(l.id) === String(selectedId)) || null,
    [selectedId]
  );
  const inputRecord = store ? NEW_STORE_INPUTS[store.id] : null;
  const intel = store ? MARKET_INTEL[store.id] : null;
  const fdValue = label => inputRecord?.fdProvided?.find(r => r.label === label)?.value ?? "—";

  // Reset on store change
  useEffect(() => {
    setPhase("idle"); setLogs([]); setProgress(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, [selectedId]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  function activate() {
    setPhase("running"); setLogs([]); setProgress(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const total = INTEL_LOGS[INTEL_LOGS.length - 1].t;

    INTEL_LOGS.forEach(({ t, text, type }, idx) => {
      timers.current.push(setTimeout(() => {
        setLogs(prev => [...prev, { text, type }]);
        setProgress(Math.round(((idx + 1) / INTEL_LOGS.length) * 100));
      }, t));
    });
    timers.current.push(setTimeout(() => setPhase("results"), total + 800));
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

      {/* ── Stepper ──────────────────────────────────────────────────────── */}
      <Stepper current={flowStep} />

      {/* ── Step 2 screen ────────────────────────────────────────────────── */}
      {flowStep === 2 && store && (
        <Step2Screen
          store={store}
          onBack={() => setFlowStep(1)}
          onNext={() => setFlowStep(3)}
        />
      )}

      {/* ── Step 3 screen ────────────────────────────────────────────────── */}
      {flowStep === 3 && store && (
        <Step3Screen
          store={store}
          onBack={() => setFlowStep(2)}
          onNext={() => setFlowStep(4)}
          onNavigate={onNavigate}
        />
      )}

      {/* ── Step 4 screen ────────────────────────────────────────────────── */}
      {flowStep === 4 && store && (
        <Step4Screen
          store={store}
          onBack={() => setFlowStep(3)}
          onNext={() => setFlowStep(5)}
        />
      )}

      {/* ── Step 5 screen ────────────────────────────────────────────────── */}
      {flowStep === 5 && store && (
        <Step5Screen
          store={store}
          onBack={() => setFlowStep(4)}
          onNext={() => setFlowStep(6)}
        />
      )}

      {/* ── Step 6 screen ────────────────────────────────────────────────── */}
      {flowStep === 6 && store && (
        <Step6Screen
          store={store}
          onBack={() => setFlowStep(5)}
        />
      )}

      {/* ── Step 1 screen ─────────────────────────────────────────────────── */}
      {flowStep < 2 && (
        <>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      <div className="nsp-selector-card">
        <div className="nsp-selector-label">
          <Building2 size={13} /> Select New Store
        </div>
        <p className="nsp-selector-hint">
          Showing stores flagged as <strong>New Store</strong> in Location Attributes
        </p>
        <PremiumDropdown
          stores={newStores}
          selectedId={selectedId}
          onChange={id => setSelectedId(id)}
        />
      </div>

      {/* ── Store profile ─────────────────────────────────────────────────── */}
      {store ? (
        <>
          {/* Dark hero banner */}
          <div className="nsp-store-hero">
            <div className="nsp-store-hero-grid" />
            <div className="nsp-store-hero-content">
              <div className="nsp-store-hero-left">
                <div className="nsp-hero-badges">
                  <span className="nsp-hero-badge amber">⭐ New Store</span>
                  <span className="nsp-hero-badge slate">#{store.id}</span>
                  <span className="nsp-hero-badge violet">Cold-Start</span>
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

          {phase === "idle" && (
            <div className="nsp-agent-panel">
              <div className="nsp-agent-dots-bg" />
              <div className="nsp-agent-content">
                <div className="nsp-agent-orb">
                  <Globe size={28} />
                </div>
                <div className="nsp-agent-title">Market Intelligence Agent</div>
                <div className="nsp-agent-subtitle">
                  Ready to analyze <strong style={{ color: "#fde68a" }}>{store.market}, {store.state}</strong>
                </div>
                <div className="nsp-agent-caps">
                  <div className="nsp-agent-cap"><span>📡</span> 30-Mile Catchment</div>
                  <div className="nsp-agent-cap"><span>❄️</span> Climate Context</div>
                  <div className="nsp-agent-cap"><span>🏪</span> Competitor Scan</div>
                  <div className="nsp-agent-cap"><span>🗺</span> USA Network Map</div>
                </div>
                <button className="nsp-agent-btn" onClick={activate}>
                  <Zap size={16} />
                  Activate Agent
                  <span className="nsp-agent-btn-shimmer" />
                </button>
                <button className="nsp-agent-skip-btn" onClick={() => setFlowStep(2)} type="button">
                  Skip agent · Go to Set Constraints <ArrowRight size={13} />
                </button>
                <div className="nsp-agent-footnote">
                  Pulls from Census ACS · NOAA · Zillow · IRS SOI · BuildZoom
                </div>
              </div>
            </div>
          )}

          {phase === "running" && (
            <div className="nsp-terminal-panel">
              {/* Header bar */}
              <div className="nsp-term-header">
                <div className="nsp-term-dots">
                  <span className="nsp-term-dot red" />
                  <span className="nsp-term-dot yellow" />
                  <span className="nsp-term-dot green" />
                </div>
                <div className="nsp-term-header-title">
                  <span className="nsp-term-pulse-dot" />
                  market-intel-agent — {store.market}, {store.state}
                </div>
                <div className="nsp-term-progress-wrap">
                  <div className="nsp-term-progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="nsp-term-pct">{progress}%</div>
              </div>
              {/* Log body */}
              <div className="nsp-term-body">
                <div className="nsp-term-scanline" />
                {logs.map((l, i) => (
                  <div key={i} className={`nsp-tlog nsp-tlog-${l.type}`}>
                    <span className="nsp-tlog-pfx">
                      {l.type === "success" ? "✓" : l.type === "warn" ? "⚠" : l.type === "done" ? "✅" : "›"}
                    </span>
                    <span className="nsp-tlog-text">{l.text}</span>
                  </div>
                ))}
                <span className="nsp-term-blink-cursor">▋</span>
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {phase === "results" && intel && (
            <div className="nsp-results-wrap">
              {/* Success bar */}
              <div className="nsp-results-done-bar">
                <div className="nsp-results-done-left">
                  <span className="nsp-done-dot" />
                  <span>Agent complete · all data sources populated</span>
                  <span className="nsp-done-tag">market-intel-agent</span>
                </div>
                <button className="nsp-rerun-btn" onClick={activate}>↺ Re-run</button>
              </div>

              {/* Row 1: catchment + climate */}
              <div className="nsp-results-row">
                {/* Market Catchment */}
                <div className="nsp-result-card nsp-fade-up" style={{ animationDelay: "0s" }}>
                  <div className="nsp-result-card-header blue">
                    <Globe size={14} />
                    <span>30-Mile Market Catchment</span>
                    <span className="nsp-result-badge blue">{intel.catchment.zctas} ZCTAs</span>
                  </div>
                  <div className="nsp-kpi-grid">
                    <KpiTile animate label="Households"     value={intel.catchment.households}      prefix="" suffix=""  accent="#0369a1" delay={0.05} />
                    <KpiTile animate label="Population"     value={intel.catchment.population}       prefix="" suffix=""  accent="#0369a1" delay={0.1}  />
                    <KpiTile animate label="Median Income"  value={58.1}                             prefix="$" suffix="k" accent="#0284c7" sub="Census ACS 2023" delay={0.15} />
                    <KpiTile animate label="Median Home"    value={287.5}                            prefix="$" suffix="k" accent="#0284c7" sub="Zillow ZHVI" delay={0.2}  />
                    <KpiTile animate label="Homeownership"  value={68.5}                             prefix="" suffix="%"  accent="#059669" delay={0.25} />
                    <KpiTile animate label="Pre-1990 Homes" value={41.2}                             prefix="" suffix="%"  accent="#d97706" sub="remodel signal" delay={0.3}  />
                    <KpiTile        label="Pro Contractor"  value={`${intel.catchment.proContractorDensity} National Avg`} accent="#7c3aed" delay={0.35} />
                    <KpiTile        label="Permit Growth"   value={intel.catchment.permitGrowth}    accent="#059669" sub="YoY" delay={0.4}  />
                    <KpiTile        label="Remodel Spend"   value={intel.catchment.annualRemodelingSpend} accent="#0369a1" sub="annual / trade area" delay={0.45} />
                  </div>
                  <div className="nsp-result-card-footer">Census ACS · IRS SOI · Zillow ZHVI · BuildZoom Permits</div>
                </div>

                {/* Climate */}
                <div className="nsp-result-card nsp-fade-up" style={{ animationDelay: "0.1s" }}>
                  <div className="nsp-result-card-header cyan">
                    <Wind size={14} />
                    <span>Climate Context</span>
                    <span className="nsp-result-badge cyan">{intel.climate.station}</span>
                  </div>
                  <div className="nsp-climate-list">
                    <div className="nsp-climate-item">
                      <span className="nsp-cl-lbl">Zone</span>
                      <span className="nsp-cl-val zone">{intel.climate.zone}</span>
                    </div>
                    <div className="nsp-climate-item">
                      <span className="nsp-cl-lbl">Winter Low</span>
                      <span className="nsp-cl-val cold">{intel.climate.avgWinterLow}</span>
                    </div>
                    <div className="nsp-climate-item">
                      <span className="nsp-cl-lbl">Summer High</span>
                      <span className="nsp-cl-val warm">{intel.climate.avgSummerHigh}</span>
                    </div>
                    <div className="nsp-climate-item">
                      <span className="nsp-cl-lbl">Annual Precip</span>
                      <span className="nsp-cl-val">{intel.climate.annualPrecip}</span>
                    </div>
                    <div className="nsp-climate-item">
                      <span className="nsp-cl-lbl">Snow Days</span>
                      <span className="nsp-cl-val">{intel.climate.snowDays}</span>
                    </div>
                    <div className="nsp-climate-item">
                      <span className="nsp-cl-lbl">Flood Risk</span>
                      <span className="nsp-cl-val low">{intel.climate.floodRisk}</span>
                    </div>
                    {/* Temp range bar */}
                    <div className="nsp-temp-range-wrap">
                      <div className="nsp-temp-range-track">
                        <div className="nsp-temp-range-fill" />
                        <div className="nsp-temp-range-cold">14°F</div>
                        <div className="nsp-temp-range-warm">88°F</div>
                      </div>
                    </div>
                  </div>
                  <div className="nsp-climate-insight">
                    <TrendingUp size={12} /> {intel.climate.floorNote}
                  </div>
                </div>
              </div>

              {/* Row 2: Competitors */}
              <div className="nsp-result-card nsp-fade-up" style={{ animationDelay: "0.2s" }}>
                <div className="nsp-result-card-header amber">
                  <Store size={14} />
                  <span>Competitor Scan — 50-Mile Radius</span>
                  <div className="nsp-trade-pills">
                    <span className="nsp-trade-pill">Primary {intel.trade.primary}</span>
                    <span className="nsp-trade-pill">Secondary {intel.trade.secondary}</span>
                    <span className="nsp-trade-pill green">{intel.trade.territory}</span>
                  </div>
                </div>
                <div className="nsp-comp-rows">
                  {intel.competitors.map((c, i) => (
                    <div key={c.name} className="nsp-comp-row nsp-fade-up" style={{ animationDelay: `${0.25 + i * 0.06}s` }}>
                      <div className="nsp-comp-name">{c.name}</div>
                      <div className="nsp-comp-dist">{c.dist}</div>
                      <div className="nsp-comp-bar-wrap">
                        <div
                          className={`nsp-comp-bar ${c.threat === "High" ? "high" : "none"}`}
                          style={{ width: `${c.threatPct}%` }}
                        />
                      </div>
                      <div className={`nsp-comp-threat nsp-threat-${c.threat.toLowerCase()}`}>
                        {c.threat}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: USA Map */}
              <div className="nsp-fade-up" style={{ animationDelay: "0.35s" }}>
                <USAStoreMap newStore={store} allStores={FD_STORES} />
              </div>

              {/* ── Next Step CTA ────────────────────────────────────────── */}
              <div className="nsp-next-step-cta nsp-fade-up" style={{ animationDelay: "0.5s" }}>
                <div className="nsp-next-step-left">
                  <div className="nsp-next-step-done-dot" />
                  <div>
                    <div className="nsp-next-step-done-label">Step 1 Complete</div>
                    <div className="nsp-next-step-done-sub">Market Intelligence loaded for {store.market}, {store.state}</div>
                  </div>
                </div>
                <button
                  className="nsp-next-step-btn"
                  onClick={() => setFlowStep(2)}
                  type="button"
                >
                  Step 2: Set Constraints
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="nsp-empty-state">
          <Building2 size={36} />
          <div>No new stores available</div>
          <p>Flag a location as "New Store" in the Location Attributes table.</p>
        </div>
      )}
        </> /* close step 1 wrapper */
      )}
    </div>
  );
}
