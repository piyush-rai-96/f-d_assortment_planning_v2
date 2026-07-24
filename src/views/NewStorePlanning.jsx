/**
 * NewStorePlanning.jsx — Revamped Landing Screen (Impact UI Edition)
 *
 * Single-screen flow:
 *  1. FdSelect dropdown  →  pick a New Store
 *  2. Store Attributes Card  →  auto-populates on selection
 *  3. "Run Agent" Button  →  launches Market Intelligence agent
 *  4. Stepper + ProgressBar + Loader  →  live 4-checkpoint progress
 *  5. Results: Market Catchment / Climate / Competitor Scan / USA Map cards
 *
 * Strictly uses Impact UI components:
 *  Card, Badge, Button, ProgressBar, Loader, Tag, Alert, EmptyState
 *  + local primitives: Text, Stack, FdSelect, panelSx
 */
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Card, Badge, Button, ProgressBar, Loader, Alert, EmptyState,
} from "impact-ui";
import {
  Globe, Wind, Store, Zap, MapPin, Building2, Cpu, TrendingUp, Activity,
  CheckCircle, AlertTriangle,
} from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import FdSelect from "../components/FdSelect.jsx";
import { panelSx, elevatedSx, softSx } from "../styles/panelSx.js";
import { LOCATIONS, NEW_STORE_INPUTS } from "../data/admin.js";
import { FD_STORES } from "../data/stores.js";
import "./NewStorePlanning.css";

// ─── Market Intelligence data (Billings MT) ────────────────────────────────
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
      { name: "Menards",     dist: "100+ mi", threat: "None", threatPct:  0 },
      { name: "Tile Shop",   dist: "100+ mi", threat: "None", threatPct:  0 },
      { name: "LL Flooring", dist: "100+ mi", threat: "None", threatPct:  0 },
    ],
    trade: {
      primary: "35 mi", secondary: "85 mi",
      nearestFD: "Denver, CO — 370 mi",
      territory: "Greenfield · No F&D within 300 mi",
    },
  },
};

// 4 checkpoints that drive the Stepper + ProgressBar
const AGENT_CHECKPOINTS = [
  { id: "catchment", label: "Market Catchment",  detail: "Census ACS · Zillow ZHVI · IRS SOI"    },
  { id: "climate",   label: "Climate & Risk",    detail: "NOAA Normals · FEMA NRI · BuildZoom"    },
  { id: "competitors",label:"Competitor Scan",   detail: "50-mile radius · tier-1 flooring chains" },
  { id: "map",       label: "Network Mapping",   detail: "Plotting 21 active + 1 new store"        },
];

// Timing: each checkpoint completes ms after "Run Agent" is clicked
const CHECKPOINT_TIMINGS = [2000, 4200, 6500, 8000];
const DONE_DELAY = 8800;

// ─── Lightweight SVG USA Map ───────────────────────────────────────────────
const MAP_W = 760, MAP_H = 420;
const toPx = (lat, lon) => ({
  x: ((lon + 125) / 57) * MAP_W,
  y: ((50 - lat) / 25) * MAP_H,
});

function USAStoreMap({ newStore, allStores }) {
  const dots = allStores.filter(s => s.lat && s.lon).map(s => ({
    ...toPx(s.lat, s.lon), name: s.name, isNew: false,
  }));
  if (newStore?.lat && newStore?.lon) {
    dots.push({ ...toPx(newStore.lat, newStore.lon), name: newStore.name, isNew: true });
  }

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="nsp2-map-svg"
      aria-label="F&D Store Network Map"
    >
      <rect width={MAP_W} height={MAP_H} rx={10} fill="var(--color-surface-alt)" />
      <text x={MAP_W / 2} y={MAP_H / 2 - 10} textAnchor="middle" fill="var(--color-border)" fontSize={11}>
        United States — F&D Network
      </text>
      {dots.map((d, i) =>
        d.isNew ? (
          <g key={`new-${i}`}>
            <circle cx={d.x} cy={d.y} r={8} fill="var(--color-warning-default, #f59e0b)" opacity={0.25} />
            <circle cx={d.x} cy={d.y} r={5} fill="var(--color-warning-default, #f59e0b)" />
            <text x={d.x + 8} y={d.y + 4} fontSize={8} fill="var(--color-warning-default, #f59e0b)" fontWeight={700}>
              {d.name}
            </text>
          </g>
        ) : (
          <circle key={i} cx={d.x} cy={d.y} r={3} fill="var(--color-primary-default, #4f46e5)" opacity={0.7} />
        )
      )}
    </svg>
  );
}

// ─── Animated KPI tile ────────────────────────────────────────────────────
function KpiTile({ label, rawValue, prefix = "", suffix = "", sub, animate = false }) {
  const [display, setDisplay] = useState(animate ? 0 : rawValue);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!animate || typeof rawValue !== "number") { setDisplay(rawValue); return; }
    const start = performance.now();
    const dur = 900;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(rawValue < 1000 ? +(rawValue * eased).toFixed(1) : Math.round(rawValue * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rawValue, animate]);

  const fmt = (v) => {
    if (typeof v === "string") return v;
    return v >= 1000 ? v.toLocaleString() : v;
  };

  return (
    <div className="nsp2-kpi-tile">
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="kpi" tone="strong">
        {prefix}{fmt(display)}{suffix}
      </Text>
      {sub && <Text variant="micro" tone="muted">{sub}</Text>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function NewStorePlanning({ onNavigate }) {
  const newStores = useMemo(
    () => LOCATIONS.filter(l => l.storeType === "New Store"),
    []
  );

  const storeOptions = useMemo(
    () => newStores.map(s => ({ value: String(s.id), label: `#${s.id}  ${s.name}  (${s.state})` })),
    [newStores]
  );

  const [selectedId, setSelectedId]     = useState(newStores.length > 0 ? String(newStores[0].id) : "");
  const [phase, setPhase]               = useState("idle");    // idle | running | done
  const [completedSteps, setCompleted]  = useState([]);        // ids of finished checkpoints
  const [activeStep, setActiveStep]     = useState(null);      // id of currently-running checkpoint
  const [progress, setProgress]         = useState(0);
  const [progressLabel, setProgLabel]   = useState("");
  const timers = useRef([]);

  const store       = useMemo(() => LOCATIONS.find(l => String(l.id) === String(selectedId)) ?? null, [selectedId]);
  const inputRecord = store ? NEW_STORE_INPUTS[store.id] : null;
  const intel       = store ? MARKET_INTEL[store.id] : null;
  const fdValue     = (label) => inputRecord?.fdProvided?.find(r => r.label === label)?.value ?? "—";

  // Reset when store changes
  useEffect(() => {
    setPhase("idle");
    setCompleted([]);
    setActiveStep(null);
    setProgress(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, [selectedId]);

  function runAgent() {
    if (!store) return;
    setPhase("running");
    setCompleted([]);
    setActiveStep(AGENT_CHECKPOINTS[0].id);
    setProgress(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    AGENT_CHECKPOINTS.forEach((cp, i) => {
      // Mark step as active slightly before completion
      if (i > 0) {
        timers.current.push(setTimeout(() => {
          setActiveStep(cp.id);
          setProgLabel(cp.detail);
        }, CHECKPOINT_TIMINGS[i - 1] + 200));
      } else {
        setProgLabel(AGENT_CHECKPOINTS[0].detail);
      }
      // Complete each checkpoint
      timers.current.push(setTimeout(() => {
        setCompleted(prev => [...prev, cp.id]);
        setProgress(Math.round(((i + 1) / AGENT_CHECKPOINTS.length) * 100));
        if (i === AGENT_CHECKPOINTS.length - 1) setActiveStep(null);
      }, CHECKPOINT_TIMINGS[i]));
    });

    timers.current.push(setTimeout(() => setPhase("done"), DONE_DELAY));
  }

  const isRunning = phase === "running";
  const isDone    = phase === "done";

  return (
    <div className="nsp2-root">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="nsp2-page-header">
        <Stack direction="column" gap={1}>
          <Stack direction="row" align="center" gap={2}>
            <Cpu size={14} className="nsp2-eyebrow-icon" />
            <Text variant="overline" tone="primary">Store Planning Studio</Text>
          </Stack>
          <Text variant="title" tone="strong">New Store Planning</Text>
          <Text variant="body" tone="muted">
            Select a new store site · auto-populate profile · run agentic market intelligence
          </Text>
        </Stack>
        <div className="nsp2-header-badge">
          <Badge
            label={`${newStores.length} New Store${newStores.length !== 1 ? "s" : ""} · Cold-Start`}
            color="warning"
            variant="subtle"
            size="medium"
            isIcon
            icon={<Activity size={12} />}
          />
        </div>
      </div>

      {/* ── Store selector ────────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: "var(--sp-4)" }}>
        <Stack direction="column" gap={3}>
          <Stack direction="column" gap={1}>
            <Text variant="subheading" tone="strong">Select New Store</Text>
            <Text variant="caption" tone="muted">
              Showing stores flagged as <strong>New Store</strong> in Location Attributes
            </Text>
          </Stack>

          {newStores.length === 0 ? (
            <EmptyState
              heading="No new stores available"
              description='Flag a location as "New Store" in the Location Attributes table to begin planning.'
              emptyStateIcon={<Building2 size={32} />}
            />
          ) : (
            <FdSelect
              label="New Store"
              value={selectedId}
              options={storeOptions}
              onChange={setSelectedId}
              width={360}
              isWithSearch
            />
          )}
        </Stack>
      </Card>

      {/* ── Store profile — renders as soon as a store is selected ────── */}
      {store && (
        <Card sx={{ ...elevatedSx, padding: 0, overflow: "hidden" }}>
          {/* Gradient hero band */}
          <div className="nsp2-store-hero">
            <Stack direction="column" gap={2}>
              <Stack direction="row" align="center" gap={2} wrap>
                <Badge label="New Store"   color="warning" variant="subtle" size="small" />
                <Badge label={`#${store.id}`} color="default" variant="stroke" size="small" />
                <Badge label="Cold-Start"  color="info"    variant="subtle" size="small" />
              </Stack>
              <Text variant="display" tone="strong" as="h2" className="nsp2-store-name">
                {store.name.replace(/^\d+\s/, "")}
                <span className="nsp2-store-state">, {store.state}</span>
              </Text>
              <Stack direction="row" align="center" gap={3} wrap>
                <Stack direction="row" align="center" gap={1}>
                  <MapPin size={12} className="nsp2-meta-icon" />
                  <Text variant="caption" tone="muted">{store.market} · {store.region}</Text>
                </Stack>
                <Text variant="caption" tone="muted">
                  {store.sqft?.toLocaleString() ?? "55,000"} sq ft
                </Text>
                <Text variant="caption" tone="muted">
                  Opening: {store.openingDate ?? "SS26 · Aug 2026"}
                </Text>
              </Stack>
            </Stack>
            <Stack direction="column" align="flex-end" gap={1} className="nsp2-coords">
              <Text variant="micro" tone="muted">Coordinates</Text>
              <Text variant="body-strong" tone="strong" mono>{store.lat?.toFixed(4)}°N</Text>
              <Text variant="body-strong" tone="strong" mono>{Math.abs(store.lon)?.toFixed(4)}°W</Text>
            </Stack>
          </div>

          {/* Store attributes grid */}
          <Stack direction="column" gap={0} padding={4}>
            <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-3)" }}>
              <Building2 size={14} className="nsp2-section-icon" />
              <Text variant="subheading" tone="strong">Store Information</Text>
              <div style={{ marginLeft: "auto" }}>
                <Badge label="F&D Provided · Read-only" color="default" variant="subtle" size="small" />
              </div>
            </Stack>

            <div className="nsp2-attr-grid">
              {[
                { label: "Store Name",           value: store.name.replace(/^\d+\s/, "") },
                { label: "Store Number",         value: `#${store.id}`,           mono: true },
                { label: "City",                 value: store.market },
                { label: "State",                value: store.state },
                { label: "Store Type",           value: store.storeType,          badge: "warning" },
                { label: "Store Format",         value: fdValue("Store Format") },
                { label: "Store Size (Sq. Ft.)", value: (store.sqft?.toLocaleString() ?? "55,000"), mono: true },
                { label: "Planned Opening",      value: store.openingDate ?? "SS26 – Aug 2026" },
                { label: "Store Status",         value: fdValue("Store Status"),  badge: "warning" },
                { label: "Sales History",        value: "None",                   tone: "muted" },
                { label: "Latitude",             value: store.lat?.toFixed(4),    mono: true },
                { label: "Longitude",            value: store.lon?.toFixed(4),    mono: true },
              ].map(f => (
                <div key={f.label} className="nsp2-attr-field">
                  <Text variant="micro" tone="muted">{f.label}</Text>
                  {f.badge ? (
                    <Badge label={f.value ?? "—"} color={f.badge} variant="subtle" size="small" />
                  ) : (
                    <Text variant="body-strong" tone={f.tone ?? "strong"} mono={!!f.mono}>
                      {f.value ?? "—"}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          </Stack>
        </Card>
      )}

      {/* ── Agent panel ──────────────────────────────────────────────── */}
      {store && phase === "idle" && (
        <Card sx={{ ...panelSx, padding: "var(--sp-5)" }}>
          <div className="nsp2-agent-idle">
            <div className="nsp2-agent-orb">
              <Globe size={26} />
            </div>
            <Stack direction="column" gap={1} style={{ flex: 1 }}>
              <Text variant="subheading" tone="strong">Market Intelligence Agent</Text>
              <Text variant="body" tone="muted">
                Ready to analyse <strong>{store.market}, {store.state}</strong> — 30-mile catchment,
                climate context, competitor scan and network map.
              </Text>
              <Stack direction="row" gap={2} wrap style={{ marginTop: "var(--sp-1)" }}>
                {["Census ACS", "NOAA Climate", "Competitor Scan", "FEMA NRI"].map(src => (
                  <Badge key={src} label={src} color="info" variant="subtle" size="small" />
                ))}
              </Stack>
            </Stack>
            <Button
              variant="primary"
              size="large"
              icon={<Zap size={16} />}
              iconPlacement="left"
              onClick={runAgent}
            >
              Run Agent
            </Button>
          </div>
        </Card>
      )}

      {/* ── Running state: Stepper + ProgressBar ─────────────────────── */}
      {store && isRunning && (
        <Card sx={{ ...panelSx, padding: "var(--sp-5)" }}>
          <Stack direction="column" gap={4}>
            <Stack direction="row" align="center" gap={2}>
              <Loader size="small" />
              <Text variant="subheading" tone="strong">Agent Running…</Text>
              <div style={{ marginLeft: "auto" }}>
                <Badge label={`${progress}%`} color="info" variant="subtle" size="small" />
              </div>
            </Stack>

            {/* Checkpoint list */}
            <div className="nsp2-checkpoint-list">
              {AGENT_CHECKPOINTS.map((cp) => {
                const done   = completedSteps.includes(cp.id);
                const active = activeStep === cp.id && !done;
                return (
                  <div key={cp.id} className={`nsp2-checkpoint${done ? " done" : ""}${active ? " active" : ""}`}>
                    <div className="nsp2-cp-status">
                      {done ? (
                        <CheckCircle size={16} className="nsp2-cp-check" />
                      ) : active ? (
                        <Loader size="small" />
                      ) : (
                        <div className="nsp2-cp-dot" />
                      )}
                    </div>
                    <Stack direction="column" gap={0} style={{ flex: 1 }}>
                      <Text variant="body-strong" tone={done ? "success" : active ? "primary" : "muted"}>
                        {cp.label}
                      </Text>
                      <Text variant="micro" tone="muted">{cp.detail}</Text>
                    </Stack>
                    {done && (
                      <Badge label="Complete" color="success" variant="subtle" size="small" />
                    )}
                    {active && (
                      <Badge label="Fetching…" color="info" variant="subtle" size="small" />
                    )}
                  </div>
                );
              })}
            </div>

            <ProgressBar
              value={progress}
              type="default"
              customLabel={progressLabel || "Initialising…"}
              showTime={false}
            />
          </Stack>
        </Card>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}
      {store && isDone && intel && (
        <>
          {/* Success banner */}
          <Alert
            severity="success"
            title="Market Intelligence Complete"
            description={`All data sources populated for ${store.market}, ${store.state}. Profile is ready for assortment planning.`}
            subtleBackground
          />

          {/* Row 1: Catchment + Climate */}
          <div className="nsp2-results-row">
            {/* Market Catchment */}
            <Card sx={{ ...panelSx, flex: 1 }}>
              <Stack direction="column" gap={3}>
                <Stack direction="row" align="center" gap={2}>
                  <Globe size={15} className="nsp2-section-icon" />
                  <Text variant="subheading" tone="strong">30-Mile Market Catchment</Text>
                  <div style={{ marginLeft: "auto" }}>
                    <Badge label={`${intel.catchment.zctas} ZCTAs`} color="info" variant="subtle" size="small" />
                  </div>
                </Stack>

                <div className="nsp2-kpi-grid">
                  <KpiTile animate label="Households"      rawValue={intel.catchment.households}    suffix=""  />
                  <KpiTile animate label="Population"      rawValue={intel.catchment.population}     suffix=""  />
                  <KpiTile animate label="Median Income"   rawValue={58.1}  prefix="$" suffix="k" sub="Census ACS 2023" />
                  <KpiTile animate label="Median Home"     rawValue={287.5} prefix="$" suffix="k" sub="Zillow ZHVI" />
                  <KpiTile animate label="Homeownership"   rawValue={68.5}  suffix="%"  />
                  <KpiTile animate label="Pre-1990 Homes"  rawValue={41.2}  suffix="%" sub="remodel signal" />
                  <KpiTile label="Pro Contractor Density"  rawValue={intel.catchment.proContractorDensity} />
                  <KpiTile label="Permit Growth (YoY)"     rawValue={intel.catchment.permitGrowth} />
                  <KpiTile label="Annual Remodel Spend"    rawValue={intel.catchment.annualRemodelingSpend} />
                </div>

                <Text variant="micro" tone="muted">
                  Sources: Census ACS · IRS SOI · Zillow ZHVI · BuildZoom Permits
                </Text>
              </Stack>
            </Card>

            {/* Climate */}
            <Card sx={{ ...panelSx, flex: "0 0 320px" }}>
              <Stack direction="column" gap={3}>
                <Stack direction="row" align="center" gap={2}>
                  <Wind size={15} className="nsp2-section-icon" />
                  <Text variant="subheading" tone="strong">Climate Context</Text>
                  <div style={{ marginLeft: "auto" }}>
                    <Badge label={intel.climate.station} color="info" variant="subtle" size="small" />
                  </div>
                </Stack>

                <div className="nsp2-climate-list">
                  {[
                    { label: "Zone",          value: intel.climate.zone,         accent: "info"    },
                    { label: "Winter Low",    value: intel.climate.avgWinterLow,  accent: "info"    },
                    { label: "Summer High",   value: intel.climate.avgSummerHigh, accent: "warning" },
                    { label: "Annual Precip", value: intel.climate.annualPrecip                     },
                    { label: "Snow Days",     value: intel.climate.snowDays                         },
                    { label: "Flood Risk",    value: intel.climate.floodRisk,    accent: "success"  },
                  ].map(row => (
                    <div key={row.label} className="nsp2-climate-row">
                      <Text variant="micro" tone="muted">{row.label}</Text>
                      {row.accent ? (
                        <Badge label={row.value} color={row.accent} variant="subtle" size="small" />
                      ) : (
                        <Text variant="caption" tone="strong">{row.value}</Text>
                      )}
                    </div>
                  ))}
                </div>

                {/* Temp range bar */}
                <div className="nsp2-temp-range">
                  <Text variant="micro" tone="muted">Annual Temperature Range</Text>
                  <div className="nsp2-temp-bar-wrap">
                    <Text variant="micro" tone="muted">14°F</Text>
                    <div className="nsp2-temp-bar-track">
                      <div className="nsp2-temp-bar-fill" />
                    </div>
                    <Text variant="micro" tone="muted">88°F</Text>
                  </div>
                </div>

                <Stack direction="row" align="flex-start" gap={1} className="nsp2-climate-insight">
                  <TrendingUp size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text variant="micro" tone="muted">{intel.climate.floorNote}</Text>
                </Stack>
              </Stack>
            </Card>
          </div>

          {/* Row 2: Competitors */}
          <Card sx={panelSx}>
            <Stack direction="column" gap={3}>
              <Stack direction="row" align="center" gap={2} wrap>
                <Store size={15} className="nsp2-section-icon" />
                <Text variant="subheading" tone="strong">Competitor Scan — 50-Mile Radius</Text>
                <Stack direction="row" gap={2} style={{ marginLeft: "auto" }} wrap>
                  <Badge label={`Primary ${intel.trade.primary}`}    color="default" variant="stroke" size="small" />
                  <Badge label={`Secondary ${intel.trade.secondary}`} color="default" variant="stroke" size="small" />
                  <Badge label={intel.trade.territory}               color="success" variant="subtle" size="small" />
                </Stack>
              </Stack>

              <div className="nsp2-comp-list">
                {intel.competitors.map(c => (
                  <div key={c.name} className="nsp2-comp-row">
                    <Text variant="body-strong" tone="strong" style={{ minWidth: 110 }}>{c.name}</Text>
                    <Text variant="caption" tone="muted" style={{ minWidth: 80 }}>{c.dist}</Text>
                    <div className="nsp2-comp-bar-track" style={{ flex: 1 }}>
                      <div
                        className="nsp2-comp-bar-fill"
                        style={{
                          width: `${c.threatPct}%`,
                          background: c.threat === "High"
                            ? "var(--color-error-default, #dc2626)"
                            : "var(--color-border)",
                        }}
                      />
                    </div>
                    <Badge
                      label={c.threat}
                      color={c.threat === "High" ? "error" : "default"}
                      variant="subtle"
                      size="small"
                    />
                  </div>
                ))}
              </div>
            </Stack>
          </Card>

          {/* Row 3: USA Store Network Map */}
          <Card sx={{ ...panelSx, padding: "var(--sp-3)" }}>
            <Stack direction="column" gap={2}>
              <Stack direction="row" align="center" gap={2}>
                <MapPin size={15} className="nsp2-section-icon" />
                <Text variant="subheading" tone="strong">F&D Store Network</Text>
                <div style={{ marginLeft: "auto" }}>
                  <Badge label="New store highlighted" color="warning" variant="subtle" size="small" />
                </div>
              </Stack>
              <USAStoreMap newStore={store} allStores={FD_STORES} />
            </Stack>
          </Card>

          {/* Completion note */}
          <Alert
            severity="info"
            title="Ready for Planning"
            description='Market Intelligence profile is complete. Use "New Store Planning New" in the sidebar to continue to Constraint Setup, Cluster Assignment, SKU Optimization, and Merchant Review.'
            subtleBackground
          />
        </>
      )}
    </div>
  );
}
