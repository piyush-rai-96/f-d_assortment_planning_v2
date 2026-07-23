/**
 * AgenticClustering.jsx — Agentic Location Clustering Studio
 *
 * 5-screen state machine:
 *   "dashboard" → "detail" (cluster deep-dive)
 *   "dashboard" → "wizard" (step 0-4) → "terminal" → "review" → "dashboard"
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Highcharts from "highcharts";
import "highcharts/highcharts-more"; // Highcharts v12: self-registers polar/more as a side effect
import HighchartsReact from "highcharts-react-official";
import { Card, Badge, Button, Chips } from "impact-ui";
import { AlertTriangle, CheckCircle2, Cpu, ChevronRight, ArrowLeft, Zap, Lock, Star } from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import { panelSx, softSx, elevatedSx } from "../styles/panelSx.js";
import { color } from "../styles/tokens.js";
import {
  AGENT_MONITOR_ALERT,
  STUDIO_ACTIVE_CLUSTERS,
  CLUSTERS_BY_RUN,
  STUDIO_RUN_HISTORY,
  CLUSTER_DEEP_DIVE,
  CLUSTER_SIGNAL_BARS,
  CLUSTER_COMMERCIAL_TELEMETRY,
  CLUSTER_MEMBER_STORES,
  TIER1A_METRICS, TIER1A_FAMILIES, TIER1A_SQFT_DISPERSION, TIER1A_AGE_DISPERSION, TIER1A_MICRO_INSIGHT,
  TIER1B_METRICS, TIER1B_FAMILIES, TIER1B_SIGNAL_MATRIX, TIER1B_MICRO_INSIGHT,
  SCOPE_HIERARCHY, TIER2_METRICS, TIER2_COMMERCIAL_CLUSTERS, TIER2_COMPARISON_TABLE, TIER2_AI_ALERT,
  COLD_START_STORES, PROXY_MATCHES, COLD_START_AI_READ,
  TIER4_METRICS, TIER4_PROFILES, TIER4_TELEMETRY,
  TERMINAL_LOG_LINES,
  STUDIO_SCENARIOS, AGENT_SCENARIO_RECOMMENDATION, SCENARIO_FULL_CLUSTERS, SKU_SCORECARD,
  STUDIO_WIZARD_DEFAULTS,
  LABEL_COLORS,
  TIER_WORK_LOGS,
} from "../data/agenticClustering.js";
import "./AgenticClustering.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n) {
  return "$" + n.toLocaleString();
}

function fmtSqft(n) {
  return n.toLocaleString() + " sqft";
}

/**
 * Parse a 4-part label like "B-M3-1-P2" into its 4 segments.
 * Returns { structure, market, commercial, style } or null.
 */
function parseLabel(id) {
  const parts = id.split("-");
  if (parts.length < 4) return null;
  return { structure: parts[0], market: parts[1], commercial: parts[2], style: parts[3] };
}

/** Render a 4-part label as colored pill segments */
function LabelPill({ id, size = "md" }) {
  const p = parseLabel(id);
  if (!p) return <span className="acs-label-pill-fallback">{id}</span>;
  const sizeClass = size === "sm" ? " sm" : "";
  return (
    <span className={`acs-label-pill${sizeClass}`}>
      <span className="acs-lp-seg" style={{ background: LABEL_COLORS.structure[p.structure] || color.primary }}>{p.structure}</span>
      <span className="acs-lp-sep">-</span>
      <span className="acs-lp-seg" style={{ background: LABEL_COLORS.market[p.market] || color.teal }}>{p.market}</span>
      <span className="acs-lp-sep">-</span>
      <span className="acs-lp-seg" style={{ background: LABEL_COLORS.commercial[p.commercial] || color.info }}>{p.commercial}</span>
      <span className="acs-lp-sep">-</span>
      <span className="acs-lp-seg" style={{ background: LABEL_COLORS.style[p.style] || color.accent }}>{p.style}</span>
    </span>
  );
}

/** Cohesion bar with gradient fill */
function CohesionBar({ value }) {
  const c = value >= 0.85 ? color.success : value >= 0.75 ? color.warning : color.error;
  return (
    <div className="acs-cohesion-wrap">
      <div className="acs-cohesion-track">
        <div
          className="acs-cohesion-fill"
          style={{
            width: `${value * 100}%`,
            background: `linear-gradient(90deg, ${c}55 0%, ${c} 100%)`,
          }}
        />
      </div>
      <span className="acs-cohesion-val" style={{ color: c }}>{value.toFixed(2)}</span>
    </div>
  );
}

/** Status dot badge — inline dot + label, no Impact-UI Badge */
function StatusBadge({ status }) {
  const map = {
    healthy:   { dot: color.success,  bg: `${color.success}15`,  text: color.success, label: "Healthy"    },
    risk:      { dot: color.warning,  bg: `${color.warning}15`,  text: color.warning, label: "At Risk"    },
    critical:  { dot: color.error,    bg: `${color.error}15`,    text: color.error,   label: "Critical"   },
    coldstart: { dot: color.info,     bg: `${color.info}15`,     text: color.info,    label: "Cold-Start" },
  };
  const m = map[status] || map.healthy;
  return (
    <span className="acs-dot-badge" style={{ background: m.bg, color: m.text }}>
      <span className="acs-dot-badge-dot" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

/** Metric toggle card */
function MetricToggle({ metric, active, onToggle }) {
  return (
    <div className={`acs-metric-card${active ? " is-on" : ""}`} onClick={() => onToggle(metric.key)}>
      <div className="acs-metric-check">{active && <span>✓</span>}</div>
      <Text variant="caption" style={{ fontWeight: active ? 700 : 500, color: active ? color.primary : "var(--color-text)", marginBottom: 2, display: "block" }}>
        {metric.label}
      </Text>
      <Text variant="micro" tone="subtle" style={{ fontFamily: "monospace", fontSize: 9 }}>`{metric.key}`</Text>
      {metric.recommended && <span className="acs-rec-badge">Agent Rec</span>}
    </div>
  );
}

/** AI insight card */
function AgentInsight({ text, type = "info" }) {
  const colors = { info: color.primary, warning: color.warning, success: color.success, error: color.error };
  return (
    <div className="acs-agent-insight" style={{ borderLeftColor: colors[type] }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div className="acs-agent-insight-icon" style={{ background: `${colors[type]}22`, color: colors[type] }}>
          <Cpu size={14} />
        </div>
        <Text variant="micro" style={{ color: "var(--color-text)", lineHeight: 1.6, flex: 1 }}>{text}</Text>
      </div>
    </div>
  );
}

/** Wizard step: Save & Finalize / Proceed footer bar */
function WizardFooter({ tierLabel, onFinalize, onProceed, proceedLabel = "Proceed →" }) {
  return (
    <div className="acs-wizard-footer">
      <Button variant="secondary" size="medium" onClick={onFinalize}>
        🛑 Save &amp; Finalize at {tierLabel}
      </Button>
      <Button variant="primary" size="medium" onClick={onProceed}>
        {proceedLabel}
      </Button>
    </div>
  );
}

/** Highcharts 6-axis spider/radar chart */
function SpiderChart({ axes, values, networkValues, title, height = 280 }) {
  const options = useMemo(() => ({
    chart: {
      polar: true,
      type: "area",
      backgroundColor: "transparent",
      margin: [20, 20, 20, 20],
      height,
    },
    title: { text: null },
    pane: { size: "78%" },
    xAxis: {
      categories: axes,
      tickmarkPlacement: "on",
      lineWidth: 0,
      gridLineColor: "rgba(128,128,128,0.2)",
      labels: {
        style: { color: "var(--color-text-muted)", fontSize: "10px", fontFamily: "inherit" },
      },
    },
    yAxis: {
      gridLineInterpolation: "polygon",
      lineWidth: 0,
      min: 0,
      max: 100,
      tickInterval: 25,
      gridLineColor: "rgba(128,128,128,0.15)",
      labels: { style: { fontSize: "9px", color: "var(--color-text-subtle)" } },
    },
    tooltip: {
      shared: true,
      pointFormat: "<span style='color:{series.color}'><b>{series.name}</b>: {point.y}</span><br/>",
      style: { fontSize: "11px" },
    },
    legend: {
      align: "center",
      verticalAlign: "bottom",
      itemStyle: { color: "var(--color-text)", fontSize: "11px", fontWeight: "500" },
    },
    series: [
      {
        name: title || "Cluster Profile",
        data: values,
        color: color.primary,
        fillColor: `${color.primary}22`,
        lineWidth: 2,
        marker: { symbol: "circle", radius: 3 },
        pointPlacement: "on",
      },
      networkValues
        ? {
            name: "Network Average",
            data: networkValues,
            color: color.teal,
            fillColor: `${color.teal}10`,
            lineWidth: 1.5,
            dashStyle: "Dash",
            marker: { symbol: "circle", radius: 2 },
            pointPlacement: "on",
          }
        : null,
    ].filter(Boolean),
    credits: { enabled: false },
  }), [axes, values, networkValues, title, height]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

const SPIDER_AXES = ["Sales/SqFt", "Pro Index", "Product Style", "Demographics", "Climate Risk", "Category Turn"];
const NETWORK_AVG = [60, 50, 55, 60, 50, 58];

// ─── SCREEN 1: Command Center ─────────────────────────────────────────────────

/** Parse a hierarchy scope string "Wood > Solid Prefinished" into breadcrumb segments */
function ScopeCrumb({ scope }) {
  const parts = scope.split(">").map((s) => s.trim());
  return (
    <span className="acs-scope-crumb">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="acs-scope-sep"> › </span>}
          <span className={i === 0 ? "acs-scope-root" : "acs-scope-leaf"}>{p}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

const SCOPE_CHIPS = ["All Scopes", "Wood", "Tile", "LVP", "Vanities"];
const STATUS_TABS  = [
  { id: "all",      label: "All Runs"        },
  { id: "live",     label: "LIVE Production" },
  { id: "archived", label: "Archived"        },
];

/** Proxy count badge with native tooltip */
function ProxyBadge({ proxies }) {
  if (!proxies || proxies.length === 0) return null;
  const tip = proxies.map((p) => `${p.name} — ${p.note}`).join("; ");
  return (
    <span className="acs-proxy-badge" title={tip}>
      <Star size={9} style={{ flexShrink: 0 }} />
      +{proxies.length} Proxy
    </span>
  );
}

/** Silhouette quality bar */
function SilhouetteBar({ value }) {
  const c = value >= 0.8 ? color.success : value >= 0.7 ? color.warning : color.error;
  return (
    <div className="acs-sil-wrap">
      <div className="acs-sil-track">
        <div className="acs-sil-fill" style={{ width: `${value * 100}%`, background: `linear-gradient(90deg, ${c}66, ${c})` }} />
      </div>
      <span className="acs-sil-val" style={{ color: c }}>{value.toFixed(2)}</span>
      <span className="acs-sil-label" style={{ color: c }}>High</span>
    </div>
  );
}

function CommandCenter({ onViewCluster, onNewRun }) {
  const [selectedRunId, setSelectedRunId] = useState("CR-019");
  const [searchText,    setSearchText]    = useState("");
  const [scopeFilter,   setScopeFilter]   = useState("All Scopes");
  const [statusFilter,  setStatusFilter]  = useState("all");

  // Derived: filtered run history
  const filteredRuns = useMemo(() => STUDIO_RUN_HISTORY.filter((r) => {
    const matchScope  = scopeFilter === "All Scopes" || r.scopeTag === scopeFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchScope && matchStatus;
  }), [scopeFilter, statusFilter]);

  // Auto-select first run if current selection no longer visible
  useEffect(() => {
    if (filteredRuns.length > 0 && !filteredRuns.find((r) => r.id === selectedRunId)) {
      setSelectedRunId(filteredRuns[0].id);
    }
  }, [filteredRuns, selectedRunId]);

  const selectedRun    = STUDIO_RUN_HISTORY.find((r) => r.id === selectedRunId);
  const allClusters    = CLUSTERS_BY_RUN[selectedRunId] || [];

  // Derived: filtered cluster list
  const filteredClusters = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return allClusters;
    return allClusters.filter((cl) =>
      cl.label.toLowerCase().includes(q) || cl.id.toLowerCase().includes(q)
    );
  }, [allClusters, searchText]);

  return (
    <div className="acs-screen">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="acs-page-header">
        <div>
          <Text variant="title" tone="strong">Agentic Clustering Studio</Text>
          <Text variant="caption" tone="muted" style={{ marginTop: 2, display: "block" }}>
            Multi-tiered spatial &amp; commercial intelligence · SS26 Reset
          </Text>
        </div>
      </div>

      {/* ── Agentic Monitor Banner (with embedded CTA) ───────────────────── */}
      <div className="acs-monitor-banner">
        <div className="acs-monitor-pulse" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" align="center" gap={2} style={{ marginBottom: 4 }}>
            <Cpu size={14} color="var(--color-primary-soft)" />
            <Text variant="caption" style={{ color: "var(--color-primary-soft)", fontWeight: 800, letterSpacing: ".05em" }}>
              AGENTIC NETWORK MONITOR
            </Text>
          </Stack>
          <Text variant="caption" style={{ color: "#93C5FD", lineHeight: 1.65 }}>
            <strong style={{ color: "#fff" }}>{AGENT_MONITOR_ALERT.heading}</strong>
            {" "}{AGENT_MONITOR_ALERT.body}
          </Text>
        </div>
        {/* Embedded CTA — requirement 4 */}
        <button className="acs-banner-cta" onClick={onNewRun}>
          <Zap size={13} />
          ⚡ Create New Cluster Run
        </button>
      </div>

      {/* ── 1. Run History & Audit Trail ─────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        {/* Header: title left, scope chips right */}
        <div className="acs-section-header">
          <div>
            <Text variant="body-strong" tone="strong">Run History &amp; Audit Trail</Text>
            <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>
              Select a run → inspect clusters below
            </Text>
          </div>
          {/* Scope filter chips live here — they filter this table */}
          <div className="acs-filter-chips">
            {SCOPE_CHIPS.map((chip) => (
              <button
                key={chip}
                className={`acs-filter-chip${scopeFilter === chip ? " active" : ""}`}
                onClick={() => setScopeFilter(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="acs-run-status-tabs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              className={`acs-run-tab${statusFilter === t.id ? " active" : ""}`}
              onClick={() => setStatusFilter(t.id)}
            >
              {t.id === "live" && <span className="acs-tab-live-dot" />}
              {t.label}
              <span className="acs-tab-count">
                {t.id === "all" ? STUDIO_RUN_HISTORY.length
                  : STUDIO_RUN_HISTORY.filter((r) => r.status === t.id).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="acs-table acs-table-selectable">
            <thead>
              <tr>
                <th style={{ width: 28 }} />
                <th>Scenario</th>
                <th>Merchandise Hierarchy</th>
                <th>Tiers</th>
                <th>Silhouette</th>
                <th>Clusters</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "24px" }}>
                    <Text variant="micro" tone="muted">No runs match the current filter.</Text>
                  </td>
                </tr>
              ) : filteredRuns.map((run) => {
                const isSelected   = run.id === selectedRunId;
                const clusterCount = (CLUSTERS_BY_RUN[run.id] || []).length;
                return (
                  <tr
                    key={run.id}
                    className={`acs-run-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    {/* Selection indicator */}
                    <td style={{ paddingRight: 0 }}>
                      {isSelected && <span className="acs-row-indicator" />}
                    </td>

                    {/* Scenario + metadata */}
                    <td>
                      <div className="acs-scenario-cell">
                        <Text variant="caption" style={{ fontWeight: 700, display: "block", lineHeight: 1.35 }}>
                          {run.scenarioName}
                        </Text>
                        <div className="acs-scenario-meta">
                          <span className="acs-run-id">{run.id}</span>
                          <span className="acs-meta-sep">·</span>
                          <Text variant="micro" tone="muted">{run.author}</Text>
                        </div>
                      </div>
                    </td>

                    {/* Scope breadcrumb */}
                    <td><ScopeCrumb scope={run.scope} /></td>

                    {/* Tiers */}
                    <td><span className="acs-tiers-pill">{run.tiers}</span></td>

                    {/* Silhouette */}
                    <td style={{ minWidth: 140 }}>
                      <SilhouetteBar value={run.silhouette} />
                    </td>

                    {/* Cluster count */}
                    <td><span className="acs-cluster-count-pill">{clusterCount}</span></td>

                    {/* Status */}
                    <td>
                      {run.status === "live"
                        ? <span className="acs-status-live">● Live</span>
                        : <span className="acs-status-archived">Archived</span>}
                    </td>

                    {/* Date */}
                    <td><Text variant="micro" tone="muted">{run.date}</Text></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 2. Active Production Roster ──────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: 0 }}>

        {/* ── Panel header: scenario name + metadata ─────────────────────── */}
        <div className="acs-roster-header">
          <div className="acs-roster-title-block">
            <div className="acs-roster-eyebrow">Active Production Roster</div>
            <Text variant="heading" tone="strong" style={{ lineHeight: 1.2 }}>
              {selectedRun?.scenarioName || "—"}
            </Text>
            <div className="acs-roster-meta-row">
              <span className="acs-run-id">{selectedRunId}</span>
              {selectedRun && (
                <>
                  <span className="acs-meta-sep">·</span>
                  <span className="acs-hierarchy-badge">
                    <span className="acs-hierarchy-icon">⊞</span>
                    <ScopeCrumb scope={selectedRun.scope} />
                  </span>
                  <span className="acs-meta-sep">·</span>
                  <span className="acs-tiers-pill">{selectedRun.tiers}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexShrink: 0 }}>
            {selectedRun?.status === "live"
              ? <Badge variant="subtle" size="small" color="success" label="LIVE" />
              : <Badge variant="subtle" size="small" color="neutral" label="ARCHIVED" />}
            <Text variant="micro" tone="muted" style={{ marginTop: 3 }}>
              {filteredClusters.length}/{allClusters.length} cluster{allClusters.length !== 1 ? "s" : ""}
            </Text>
          </div>
        </div>

        {/* ── Filter bar: cluster search only ───────────────────────────── */}
        <div className="acs-filter-bar">
          <div className="acs-search-wrap">
            <svg className="acs-search-icon" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="acs-search-input"
              placeholder="Filter by Cluster Name, Label, or Store…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button className="acs-search-clear" onClick={() => setSearchText("")}>✕</button>
            )}
          </div>
          <Text variant="micro" tone="muted" style={{ flexShrink: 0 }}>
            {filteredClusters.length} of {allClusters.length} clusters
          </Text>
        </div>

        {/* ── Clusters table ─────────────────────────────────────────────── */}
        {filteredClusters.length === 0 ? (
          <div className="acs-empty-state">
            <Text variant="caption" tone="muted">
              {searchText ? `No clusters match "${searchText}".` : "No cluster data for this run."}
            </Text>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="acs-table acs-roster-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Cluster Name</th>
                  <th>Stores</th>
                  <th>Avg SqFt</th>
                  <th>Pro Index</th>
                  <th>Cohesion</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredClusters.map((cl) => {
                  const hasProxy = cl.proxies && cl.proxies.length > 0;
                  return (
                    <tr key={cl.id} className={hasProxy ? "acs-proxy-row" : ""}>
                      {/* 4-part label pill */}
                      <td><LabelPill id={cl.id} size="sm" /></td>

                      {/* Cluster name */}
                      <td>
                        <Text variant="caption" style={{ fontWeight: 600 }}>{cl.label}</Text>
                      </td>

                      {/* Store count + optional proxy badge */}
                      <td>
                        <div className="acs-store-count-cell">
                          <Text variant="caption" style={{ fontWeight: 700, fontFamily: "monospace" }}>
                            {cl.stores}
                          </Text>
                          {hasProxy && <ProxyBadge proxies={cl.proxies} />}
                        </div>
                      </td>

                      {/* Avg sqft */}
                      <td><Text variant="micro" tone="muted">{fmtSqft(cl.avgSqft)}</Text></td>

                      {/* Pro Index */}
                      <td>
                        <span className={`acs-pro-index${cl.proIndex >= 2 ? " high" : ""}`}>
                          {cl.proIndex}x
                        </span>
                      </td>

                      {/* Cohesion gradient bar */}
                      <td style={{ minWidth: 170 }}><CohesionBar value={cl.cohesion} /></td>

                      {/* Status dot badge */}
                      <td><StatusBadge status={cl.status} /></td>

                      {/* Action */}
                      <td>
                        {CLUSTER_DEEP_DIVE[cl.id]
                          ? <Button variant="secondary" size="small" onClick={() => onViewCluster(cl.id)}>View →</Button>
                          : <Text variant="micro" tone="muted" style={{ fontStyle: "italic" }}>Archived</Text>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── SCREEN 2: Cluster Deep-Dive ──────────────────────────────────────────────

/** Signal bar with +/++/+++ strength indicator */
function SignalBar({ label, signal, display, value }) {
  const pips  = Math.min(signal, 5);
  const c     = signal >= 4 ? color.success : signal >= 3 ? color.teal : signal >= 2 ? color.warning : color.error;
  const isHigh = signal >= 4;
  return (
    <div className="acs-signal-bar-row">
      <div className="acs-signal-bar-label">{label}</div>
      <div className="acs-signal-bar-pips">
        {[1,2,3,4,5].map((n) => (
          <span key={n} className="acs-signal-pip" style={{ background: n <= pips ? c : "var(--color-surface-sunken)" }} />
        ))}
      </div>
      <span className="acs-signal-bar-display" style={{ color: c }}>{display}</span>
      <span className="acs-signal-bar-value">{value}</span>
    </div>
  );
}

/** Finish share donut-like horizontal bar */
function FinishShareBar({ shares }) {
  const entries = Object.entries(shares);
  const FINISH_COLORS = ["#0B7A6C", "#2563EB", "#D97706", "#7C3AED", "#DC2626"];
  return (
    <div style={{ marginTop: 8 }}>
      <div className="acs-finish-bar">
        {entries.map(([name, pct], i) => (
          <div
            key={name}
            className="acs-finish-seg"
            style={{ width: `${pct}%`, background: FINISH_COLORS[i % FINISH_COLORS.length] }}
            title={`${name}: ${pct}%`}
          />
        ))}
      </div>
      <div className="acs-finish-legend">
        {entries.map(([name, pct], i) => (
          <div key={name} className="acs-finish-leg-item">
            <span className="acs-finish-leg-dot" style={{ background: FINISH_COLORS[i % FINISH_COLORS.length] }} />
            <span>{name}</span>
            <strong>{pct}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/** GBB ratio segmented bar */
function GBBBar({ ratio }) {
  const GCOLS = { Good: "#94A3B8", Better: "#2563EB", Best: "#7C3AED" };
  return (
    <div style={{ marginTop: 8 }}>
      <div className="acs-gbb-bar">
        {Object.entries(ratio).map(([tier, pct]) => (
          <div key={tier} className="acs-gbb-seg" style={{ width: `${pct}%`, background: GCOLS[tier] }} title={`${tier}: ${pct}%`}>
            {pct >= 12 && <span>{pct}%</span>}
          </div>
        ))}
      </div>
      <div className="acs-finish-legend" style={{ marginTop: 4 }}>
        {Object.entries(ratio).map(([tier, pct]) => (
          <div key={tier} className="acs-finish-leg-item">
            <span className="acs-finish-leg-dot" style={{ background: GCOLS[tier] }} />
            <span>{tier}</span>
            <strong>{pct}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClusterDeepDive({ clusterId, onBack, onSwitchCluster }) {
  const data      = CLUSTER_DEEP_DIVE[clusterId];
  const telemetry = CLUSTER_COMMERCIAL_TELEMETRY[clusterId];
  const signals   = CLUSTER_SIGNAL_BARS[clusterId] || [];
  const members   = CLUSTER_MEMBER_STORES[clusterId] || [];
  const [rosterSearch, setRosterSearch] = useState("");

  if (!data) return null;

  const spiderValues = Object.values(data.spiderAxes);
  const parsed       = parseLabel(clusterId);
  const allClusterIds = Object.keys(CLUSTER_DEEP_DIVE);

  const filteredMembers = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q));
  }, [members, rosterSearch]);

  return (
    <div className="acs-screen">

      {/* ── Navigation Bridge ─────────────────────────────────────────────── */}
      <div className="acs-dd-nav-bridge">
        <button className="acs-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Command Center
        </button>
        <div className="acs-cluster-switcher-wrap">
          <select
            className="acs-cluster-switcher"
            value={clusterId}
            onChange={(e) => onSwitchCluster && onSwitchCluster(e.target.value)}
          >
            {allClusterIds.map((id) => (
              <option key={id} value={id}>{id}: {CLUSTER_DEEP_DIVE[id].label}</option>
            ))}
          </select>
        </div>
        <button className="acs-scenario-dash-btn" onClick={onBack}>
          📊 View Full Scenario Dashboard
        </button>
      </div>

      {/* ── Hero Identity Banner ──────────────────────────────────────────── */}
      <div className="acs-hero-banner">
        <div className="acs-hero-left">
          <LabelPill id={clusterId} />
          <div className="acs-hero-title">{data.label}</div>
          <div className="acs-hero-meta-row">
            <span className="acs-hero-meta-chip">
              <span className="acs-hero-meta-icon">◉</span>
              {data.stores} Stores
            </span>
            <span className="acs-hero-meta-chip">
              <span className="acs-hero-meta-icon">⊞</span>
              {data.avgSqft.toLocaleString()} avg sqft
            </span>
            <span className="acs-hero-meta-chip">
              <span className="acs-hero-meta-icon">◈</span>
              Cohesion {data.cohesion.toFixed(2)}
            </span>
            <span className="acs-hero-meta-chip">
              <span className="acs-hero-meta-icon">💰</span>
              GMROI {data.gmroi.toFixed(1)}×
            </span>
            {data.coldStart && (
              <span className="acs-hero-meta-chip acs-hero-cold">
                <Star size={10} />
                +1 Cold-Start Proxy
              </span>
            )}
          </div>
        </div>
        <div className="acs-hero-right">
          <div className="acs-hero-ai-header">
            <Cpu size={12} style={{ marginRight: 4, opacity: 0.8 }} />
            Agent Read
          </div>
          <div className="acs-hero-ai-body">{data.aiRead}</div>
        </div>
      </div>

      {/* ── Top split: Spider + Spatial/Proxy ────────────────────────────── */}
      <div className="acs-deep-split">

        {/* Left: Spider chart */}
        <Card sx={{ ...panelSx, padding: 0, flex: "1 1 320px" }}>
          <div className="acs-section-header" style={{ paddingBottom: 0 }}>
            <Text variant="body-strong" tone="strong">Cluster DNA — 6-Axis Radar</Text>
            <Badge variant="subtle" size="small" color="neutral" label="vs Network Avg" />
          </div>
          <SpiderChart
            axes={SPIDER_AXES}
            values={spiderValues}
            networkValues={NETWORK_AVG}
            title={data.label}
            height={300}
          />
        </Card>

        {/* Right: Spatial proxy network */}
        <Card sx={{ ...panelSx, flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Text variant="body-strong" tone="strong">Spatial Distribution &amp; Proxy Anchors</Text>
          {data.proxyStores.length > 0 ? (
            <>
              <div className="acs-proxy-graph">
                {data.proxyStores.map((ps) => (
                  <div key={ps.id} className="acs-proxy-node-row">
                    <div className="acs-proxy-node peer">
                      <Text variant="micro" style={{ fontWeight: 700 }}>{ps.name}</Text>
                      <Text variant="micro" tone="muted">{ps.weight}% weight</Text>
                      <Text variant="micro" tone="subtle">dist: {ps.distance}σ</Text>
                    </div>
                    <div className="acs-proxy-line">
                      <span className="acs-proxy-weight-chip">{ps.weight}%</span>
                    </div>
                    <div className="acs-proxy-node cold">
                      <Star size={12} style={{ marginBottom: 2, color: "#FBBF24" }} />
                      <Text variant="micro" style={{ fontWeight: 700 }}>{data.coldStart?.name}</Text>
                      <Text variant="micro" tone="muted">Cold-Start</Text>
                    </div>
                  </div>
                ))}
              </div>
              <div className="acs-proxy-legend">
                <div className="acs-proxy-legend-item">
                  <span className="acs-proxy-dot active" /> Active Stores ({data.stores})
                </div>
                <div className="acs-proxy-legend-item">
                  <span className="acs-proxy-dot cold" /> Cold-Start Proxy (1)
                </div>
                <div className="acs-proxy-legend-item">
                  <span className="acs-proxy-line-seg" /> Demand Borrow Vector
                </div>
              </div>
              <div className="acs-proxy-lock-banner">
                <Lock size={11} />
                <span>Tier 2 &amp; 4 signals locked for cold-start. Demand borrowed from peer cohort via z-score distance weights.</span>
              </div>
            </>
          ) : (
            <div className="acs-proxy-empty">
              <Text variant="micro" tone="muted">No cold-start proxies assigned to this cluster.</Text>
            </div>
          )}
        </Card>
      </div>

      {/* ── Baseline Anatomy: 4 Boxplots ─────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Baseline Anatomy — Structure Dispersion</Text>
          <Text variant="micro" tone="muted">IQR boxplots · min / Q1 / median / Q3 / max</Text>
        </div>
        <div className="acs-anatomy-grid">
          {[
            { label: "Store SqFt",          min: 48000, q1: 62000, median: data.avgSqft, q3: 85000, max: 98000, max_: 110000, fmt: (v) => `${(v/1000).toFixed(0)}k`, color_: color.primary },
            { label: "Store Age (Weeks)",   min: 60,    q1: 180,   median: 380,          q3: 520,   max: 720,   max_: 780,   fmt: (v) => `${v}w`, color_: color.teal },
            { label: "Comp Age (Weeks)",    min: 52,    q1: 140,   median: 310,          q3: 440,   max: 620,   max_: 700,   fmt: (v) => `${v}w`, color_: color.info },
            { label: "First Receipt Age",   min: 40,    q1: 120,   median: 240,          q3: 380,   max: 560,   max_: 640,   fmt: (v) => `${v}w`, color_: color.accent },
          ].map((box) => (
            <div key={box.label} className="acs-anatomy-card">
              <div className="acs-anatomy-card-label">{box.label}</div>
              <div className="acs-anatomy-median" style={{ color: box.color_ }}>
                {box.fmt(box.median)}
              </div>
              <DispersionBar
                min={box.min} q1={box.q1} median={box.median} q3={box.q3} max={box.max}
                maxVal={box.max_} barColor={box.color_}
              />
              <div className="acs-anatomy-range-row">
                <span>{box.fmt(box.min)}</span>
                <span style={{ color: "var(--color-text-subtle)", fontSize: 9 }}>range</span>
                <span>{box.fmt(box.max)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Market Signal Heatmap Bar ─────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Text variant="body-strong" tone="strong" style={{ marginBottom: 16, display: "block" }}>
          Relative Signal Heatmap — Trade Area Intelligence
        </Text>
        <div className="acs-signal-bar-list">
          {signals.map((s) => <SignalBar key={s.label} {...s} />)}
        </div>
      </Card>

      {/* ── Commercial & Taste Telemetry ─────────────────────────────────── */}
      {telemetry && (
        <div className="acs-telemetry-section">
          {/* KPI Cards */}
          <div className="acs-telemetry-kpi-grid">
            {[
              { label: "Category Sales / SqFt",  value: `$${telemetry.salesSqft.toFixed(2)}`,    accent: color.primary },
              { label: "Sell-Through %",          value: `${telemetry.sellThrough.toFixed(1)}%`,  accent: telemetry.sellThrough >= 60 ? color.success : color.warning },
              { label: "GMROI",                   value: `${telemetry.gmroi.toFixed(2)}×`,        accent: telemetry.gmroi >= 2.5 ? color.success : color.teal },
              { label: "Days of Supply",          value: `${telemetry.dos} days`,                 accent: telemetry.dos > 300 ? color.error : color.success },
              { label: "ASP / SqFt",              value: `$${telemetry.aspSqft.toFixed(2)}`,      accent: color.info },
            ].map((kpi) => (
              <div key={kpi.label} className="acs-telemetry-kpi-card">
                <div className="acs-telemetry-kpi-label">{kpi.label}</div>
                <div className="acs-telemetry-kpi-value" style={{ color: kpi.accent }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Finish Share + GBB */}
          <div className="acs-taste-split">
            <Card sx={softSx}>
              <Text variant="caption" style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Finish Share</Text>
              <Text variant="micro" tone="muted">% of category units sold by finish type</Text>
              <FinishShareBar shares={telemetry.finishShare} />
            </Card>
            <Card sx={softSx}>
              <Text variant="caption" style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>GBB Price Tier Mix</Text>
              <Text variant="micro" tone="muted">Good / Better / Best unit share</Text>
              <GBBBar ratio={telemetry.gbbRatio} />
            </Card>
          </div>
        </div>
      )}

      {/* ── Member Store Roster ───────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <div>
            <Text variant="body-strong" tone="strong">Member Store Roster</Text>
            <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>
              {members.length} stores · click a row to inspect
            </Text>
          </div>
          <div className="acs-search-wrap" style={{ width: 240 }}>
            <svg className="acs-search-icon" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              className="acs-search-input"
              placeholder="Search stores…"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
          <table className="acs-table acs-roster-member-table">
            <thead>
              <tr>
                <th>Store #</th>
                <th>Store Name</th>
                <th>SqFt</th>
                <th>Pro %</th>
                <th>Cat Sales/SqFt</th>
                <th>DOS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((s) => {
                const isCold = s.status === "coldstart";
                return (
                  <tr key={s.id} className={isCold ? "acs-roster-cold-row" : ""}>
                    <td><span style={{ fontFamily: "monospace", fontWeight: 700, color: color.teal }}>{s.id}</span></td>
                    <td>
                      <span style={{ fontWeight: isCold ? 700 : 500 }}>{s.name}</span>
                      {isCold && <span className="acs-cold-badge">🌟 Cold-Start Proxy</span>}
                    </td>
                    <td><span style={{ fontFamily: "monospace" }}>{s.sqft.toLocaleString()}</span></td>
                    <td>
                      {s.proPct !== null
                        ? <span style={{ fontWeight: 700, color: s.proPct >= 35 ? color.success : color.text }}>{s.proPct}%</span>
                        : <span className="acs-blank-cell">—</span>}
                    </td>
                    <td>
                      {s.catSales !== null
                        ? <span style={{ fontFamily: "monospace" }}>${s.catSales.toFixed(1)}</span>
                        : <span className="acs-blank-cell">Zero-Sales</span>}
                    </td>
                    <td>
                      {s.dos !== null
                        ? <span style={{ fontFamily: "monospace", color: s.dos > 300 ? color.error : color.text }}>{s.dos}</span>
                        : <span className="acs-blank-cell">—</span>}
                    </td>
                    <td>
                      {isCold
                        ? <span className="acs-dot-badge" style={{ background: `${color.info}18`, color: color.info }}>
                            <span className="acs-dot-badge-dot" style={{ background: color.info }} />Cold-Start
                          </span>
                        : <span className="acs-dot-badge" style={{ background: `${color.success}18`, color: color.success }}>
                            <span className="acs-dot-badge-dot" style={{ background: color.success }} />Active
                          </span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Label Breakdown ───────────────────────────────────────────────── */}
      {parsed && (
        <Card sx={softSx}>
          <Text variant="body-strong" tone="strong" style={{ marginBottom: 12, display: "block" }}>4-Part Label Breakdown</Text>
          <div className="acs-label-breakdown">
            {[
              { segment: "Structure Family", key: parsed.structure, desc: "Physical footprint & DC routing" },
              { segment: "Market Context",   key: parsed.market,    desc: "Trade area demographics" },
              { segment: "Commercial Tier",  key: parsed.commercial, desc: "Category velocity rank" },
              { segment: "Style Profile",    key: parsed.style,     desc: "Aesthetic & product mix" },
            ].map((seg) => (
              <div key={seg.segment} className="acs-label-segment-card">
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, display: "block" }}>{seg.segment}</Text>
                <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 2 }}>{seg.key}</div>
                <Text variant="micro" tone="muted">{seg.desc}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── SCREEN 3a: Launcher Modal (Step 0) ──────────────────────────────────────

const NEXT_RUN_ID = "CR-020";

function LauncherModal({ onBack, onNext }) {
  const [scenarioName, setScenarioName] = useState("");
  const [animIn, setAnimIn]             = useState(false);

  // Scenario name is all that's required — hierarchy belongs in Tier 2 (scope-dependent)
  const canStart = scenarioName.trim().length > 0;

  useEffect(() => { requestAnimationFrame(() => setAnimIn(true)); }, []);

  const handleStart = () => {
    if (!canStart) return;
    onNext({ scenarioName: scenarioName.trim(), runId: NEXT_RUN_ID });
  };

  return (
    <div className="acs-screen">
      <div className={`acs-launcher-wrap${animIn ? " is-in" : ""}`}>

        {/* Header */}
        <div className="acs-launcher-header">
          <button className="acs-back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div className="acs-launcher-eyebrow">
              <Zap size={12} style={{ marginRight: 4 }} />
              NEW CLUSTER RUN
            </div>
            <Text variant="title" tone="strong">Initialize Clustering Scenario</Text>
            <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 4 }}>
              Name your scenario then configure channel, store network and merchandise scope in the next steps.
            </Text>
          </div>
          <div style={{ width: 80 }} />
        </div>

        {/* Run ID chip */}
        <div className="acs-launcher-run-id-row">
          <span className="acs-launcher-run-id-chip">
            <span className="acs-launcher-run-id-label">System Run ID</span>
            <span className="acs-launcher-run-id-value">{NEXT_RUN_ID}</span>
            <span className="acs-launcher-run-id-note">auto-generated · read-only</span>
          </span>
        </div>

        {/* Scenario name — only input required */}
        <div className="acs-launcher-section">
          <div className="acs-launcher-section-num">01</div>
          <div className="acs-launcher-section-body">
            <div className="acs-launcher-section-title">Custom Scenario Name</div>
            <div className="acs-launcher-section-desc">
              Give this run a descriptive name to identify it in the Command Center roster.
            </div>
            <input
              className="acs-launcher-name-input"
              placeholder="e.g. SS26 Solid Wood Line Review & Reset"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              maxLength={80}
              autoFocus
            />
            <div className="acs-launcher-char-count">{scenarioName.length}/80</div>
            <div className="acs-launcher-suggestions">
              {["SS26 Solid Wood — Full Network Reset", "FW26 Tile Line Review", "SS26 LVP Proxy Inject"].map((s) => (
                <button key={s} className="acs-launcher-suggestion-chip" onClick={() => setScenarioName(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tier pipeline info card */}
        <div className="acs-launcher-tier-info">
          <div className="acs-launcher-tier-info-title">
            <Cpu size={13} style={{ marginRight: 6, opacity: 0.7 }} />
            What happens next
          </div>
          <div className="acs-launcher-tier-steps">
            {[
              { label: "Channel & Store Scope",       note: "Select demand channel and store network",                            tag: "Step 1" },
              { label: "Tier 1A — Store Structure",   note: "Hierarchy-independent · SqFt, Age, DC, Lat/Lon",                    tag: "Tier 1A" },
              { label: "Tier 1B — Market Context",    note: "Hierarchy-independent · Census, Income, ZHVI, FEMA",               tag: "Tier 1B" },
              { label: "Tier 2 — Commercial Scope",   note: "Scope-dependent · Select hierarchy here · Sales/SqFt, DOS, GMROI", tag: "Tier 2" },
              { label: "Cold-Start Proxy Inject",     note: "Auto-detect new stores · assign proxy anchors",                    tag: "CS" },
              { label: "Tier 4 — Taste Profile",      note: "Scope-dependent · Finish, Species, GBB mix",                      tag: "Tier 4" },
            ].map((step) => (
              <div key={step.tag} className="acs-launcher-tier-step">
                <span className="acs-launcher-tier-tag">{step.tag}</span>
                <div>
                  <div className="acs-launcher-tier-step-label">{step.label}</div>
                  <div className="acs-launcher-tier-step-note">{step.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="acs-launcher-cta-row">
          <Button variant="secondary" size="large" onClick={onBack}>Cancel</Button>
          <Button variant="primary" size="large" onClick={handleStart} disabled={!canStart}>
            <Zap size={16} style={{ marginRight: 6 }} />
            Start Interactive Creation Flow →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 3b: Scope Selection (channel + store network) ────────────────────

const CHANNELS = [
  { id: "all",       label: "All Channels",    icon: "⊙", desc: "Blend in-store, pro & online demand signals"   },
  { id: "pro",       label: "Pro / Contractor", icon: "🔧", desc: "Contractor & trade account velocity only"      },
  { id: "retail",    label: "In-Store Retail",  icon: "🏪", desc: "Consumer walk-in demand, excludes pro SKUs"    },
  { id: "ecomm",     label: "E-Commerce",       icon: "🌐", desc: "Online-only order demand & ship-from-store"    },
];

const STORE_SCOPE_OPTIONS = [
  { id: "all",     label: "All Stores",        icon: "◉", desc: "Run clustering across the full 260-store network" },
  { id: "region",  label: "By Region",         icon: "⊡", desc: "Scope to one or more geographic regions"          },
  { id: "stores",  label: "Specific Stores",   icon: "⊞", desc: "Manually select individual store IDs"             },
];

const STORE_REGIONS = ["Northeast", "Southeast", "Midwest", "Texas / South Central", "Pacific West / Mountain", "Florida Peninsula"];

const SCOPE_STEPS = [
  { id: 0, label: "Channel",    desc: "Select demand channel" },
  { id: 1, label: "Scope",      desc: "Merchandise hierarchy" },
  { id: 2, label: "Stores",     desc: "Store network scope"   },
  { id: 3, label: "Review",     desc: "Review & launch"       },
];

function ScopeSelectionScreen({ onBack, onLaunch }) {
  const [subStep, setSubStep]         = useState(0);
  const [animKey, setAnimKey]         = useState(0);
  const [channel, setChannel]         = useState(null);
  const [scopeL1, setScopeL1]         = useState("");
  const [scopeL2, setScopeL2]         = useState("");
  const [scopeL3, setScopeL3]         = useState("");
  const [scopeL4, setScopeL4]         = useState("");
  const [storeScope, setStoreScope]   = useState(null);
  const [selRegions, setSelRegions]   = useState([]);
  const [storeInput, setStoreInput]   = useState("");
  const [launching, setLaunching]     = useState(false);

  const advance = (n = 1) => { setSubStep((s) => s + n); setAnimKey((k) => k + 1); };
  const back    = (n = 1) => { setSubStep((s) => s - n); setAnimKey((k) => k + 1); };

  const l2Options = SCOPE_HIERARCHY.l2[scopeL1] || [];
  const l3Options = SCOPE_HIERARCHY.l3[`${scopeL1} / ${scopeL2}`] || [];
  const l4Options = SCOPE_HIERARCHY.l4[`${scopeL1} / ${scopeL2} / ${scopeL3}`] || [];

  const scopeString = [scopeL1, scopeL2, scopeL3, scopeL4].filter(Boolean).join(" › ");
  const storeString = storeScope === "all" ? "Full Network (260 stores)"
    : storeScope === "region" ? (selRegions.length ? selRegions.join(", ") : "—")
    : storeScope === "stores" ? (storeInput || "—")
    : "—";

  const canProceed0 = !!channel;
  const canProceed1 = !!scopeL2;          // at least 2 levels selected
  const canProceed2 = !!storeScope;
  const canLaunch   = canProceed0 && canProceed1 && canProceed2;

  // Brief animated "launching" state before handing off to wizard
  const handleLaunch = () => {
    setLaunching(true);
    // CSS animation plays; after it ends the onLaunch prop fires via onAnimationEnd
  };

  const toggleRegion = (r) => setSelRegions((rs) => rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]);

  const summaryCells = [
    { label: "Channel",    value: CHANNELS.find((c) => c.id === channel)?.label || "—",  icon: CHANNELS.find((c) => c.id === channel)?.icon || "○" },
    { label: "Hierarchy",  value: scopeString || "—",  icon: "⊞" },
    { label: "Store Scope",value: storeString, icon: "◉" },
    { label: "Tiers",      value: "1A → 1B → 2 → Cold-Start → 4 (All)",  icon: "⚡" },
  ];

  return (
    <div className="acs-scope-overlay">
      {/* Header */}
      <div className="acs-scope-header">
        <button className="acs-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Studio
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <Text variant="title" tone="strong">New Cluster Run</Text>
          <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 2 }}>
            Configure scope, channel and store network before the agent launches
          </Text>
        </div>
        <div style={{ width: 120 }} />
      </div>

      {/* Progress stepper */}
      <div className="acs-scope-stepper">
        {SCOPE_STEPS.map((st, i) => {
          const done    = subStep > st.id;
          const current = subStep === st.id;
          return (
            <React.Fragment key={st.id}>
              <div className={`acs-ss-step ${done ? "done" : current ? "active" : "pending"}`}>
                <div className="acs-ss-dot">
                  {done ? <CheckCircle2 size={14} /> : <span>{st.id + 1}</span>}
                </div>
                <div className="acs-ss-label">
                  <Text variant="micro" style={{ fontWeight: 700, color: current ? "var(--color-primary)" : done ? "var(--color-success)" : "var(--color-text-subtle)" }}>
                    {st.label}
                  </Text>
                  <Text variant="micro" tone="subtle" style={{ fontSize: 9 }}>{st.desc}</Text>
                </div>
              </div>
              {i < SCOPE_STEPS.length - 1 && (
                <div className={`acs-ss-connector${done ? " done" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="acs-scope-progress-track">
        <div className="acs-scope-progress-fill" style={{ width: `${(subStep / 3) * 100}%` }} />
      </div>

      {/* Step content — key triggers CSS re-animation */}
      <div className="acs-scope-body" key={animKey}>

        {/* ── Step 0: Channel ──────────────────────────────────────────────── */}
        {subStep === 0 && (
          <div className="acs-scope-step acs-step-enter">
            <div className="acs-scope-step-title">
              <Text variant="heading" tone="strong">Which demand channel should drive clustering?</Text>
              <Text variant="caption" tone="muted">Channels determine which sales signals feed into the algorithm.</Text>
            </div>
            <div className="acs-channel-grid">
              {CHANNELS.map((ch) => (
                <div
                  key={ch.id}
                  className={`acs-channel-card${channel === ch.id ? " is-selected" : ""}`}
                  onClick={() => setChannel(ch.id)}
                >
                  <div className="acs-channel-icon">{ch.icon}</div>
                  <Text variant="body-strong" style={{ marginBottom: 4, display: "block" }}>{ch.label}</Text>
                  <Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{ch.desc}</Text>
                  {channel === ch.id && <div className="acs-channel-check"><CheckCircle2 size={16} color="var(--color-primary)" /></div>}
                </div>
              ))}
            </div>
            <div className="acs-scope-footer">
              <div />
              <Button variant="primary" size="large" onClick={() => advance()} disabled={!canProceed0}>
                Next: Merchandise Scope →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 1: Merchandise Scope ─────────────────────────────────────── */}
        {subStep === 1 && (
          <div className="acs-scope-step acs-step-enter">
            <div className="acs-scope-step-title">
              <Text variant="heading" tone="strong">Select Merchandise Hierarchy</Text>
              <Text variant="caption" tone="muted">Narrow down to the exact sub-class to cluster against. Each level unlocks the next.</Text>
            </div>

            {/* Live breadcrumb */}
            {scopeL1 && (
              <div className="acs-scope-live-crumb">
                <span className="acs-scope-live-label">Selected:</span>
                <ScopeCrumb scope={[scopeL1, scopeL2, scopeL3, scopeL4].filter(Boolean).join(" > ")} />
              </div>
            )}

            <div className="acs-scope-hierarchy-grid">
              {[
                { level: "L1 — Department",   options: SCOPE_HIERARCHY.l1, val: scopeL1, setter: (v) => { setScopeL1(v); setScopeL2(""); setScopeL3(""); setScopeL4(""); } },
                { level: "L2 — Sub-Dept",     options: l2Options,           val: scopeL2, setter: (v) => { setScopeL2(v); setScopeL3(""); setScopeL4(""); }, locked: !scopeL1 },
                { level: "L3 — Class",        options: l3Options,           val: scopeL3, setter: (v) => { setScopeL3(v); setScopeL4(""); }, locked: !scopeL2 },
                { level: "L4 — Sub-Class",    options: l4Options,           val: scopeL4, setter: setScopeL4, locked: !scopeL3 },
              ].map((col) => (
                <div key={col.level} className={`acs-hier-col${col.locked ? " locked" : col.val ? " selected" : ""}`}>
                  <div className="acs-hier-col-header">
                    <Text variant="micro" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: col.locked ? "var(--color-text-subtle)" : "var(--color-text)" }}>
                      {col.level}
                    </Text>
                    {col.locked && <Lock size={10} color="var(--color-text-subtle)" />}
                    {col.val && !col.locked && <CheckCircle2 size={10} color="var(--color-success)" />}
                  </div>
                  <div className="acs-hier-options">
                    {col.locked ? (
                      <div className="acs-hier-placeholder">Select previous level</div>
                    ) : col.options.length === 0 ? (
                      <div className="acs-hier-placeholder acs-hier-none">No sub-classes defined yet</div>
                    ) : (
                      col.options.map((opt) => (
                        <div
                          key={opt}
                          className={`acs-hier-option${col.val === opt ? " is-active" : ""}`}
                          onClick={() => col.setter(opt)}
                        >
                          {opt}
                          {col.val === opt && <ChevronRight size={12} style={{ marginLeft: "auto", flexShrink: 0 }} />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="acs-scope-footer">
              <Button variant="secondary" size="large" onClick={() => back()}>← Back</Button>
              <Button variant="primary" size="large" onClick={() => advance()} disabled={!canProceed1}>
                Next: Store Network →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Store Scope ───────────────────────────────────────────── */}
        {subStep === 2 && (
          <div className="acs-scope-step acs-step-enter">
            <div className="acs-scope-step-title">
              <Text variant="heading" tone="strong">Which stores should be clustered?</Text>
              <Text variant="caption" tone="muted">Define the store universe for this run. Defaults to full network.</Text>
            </div>
            <div className="acs-store-scope-cards">
              {STORE_SCOPE_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className={`acs-store-scope-card${storeScope === opt.id ? " is-selected" : ""}`}
                  onClick={() => setStoreScope(opt.id)}
                >
                  <div className="acs-store-scope-icon">{opt.icon}</div>
                  <div>
                    <Text variant="body-strong" style={{ marginBottom: 4, display: "block" }}>{opt.label}</Text>
                    <Text variant="micro" tone="muted">{opt.desc}</Text>
                  </div>
                  {storeScope === opt.id && <div className="acs-channel-check"><CheckCircle2 size={16} color="var(--color-primary)" /></div>}
                </div>
              ))}
            </div>

            {storeScope === "region" && (
              <Card sx={{ ...softSx, marginTop: 0 }}>
                <Text variant="caption" style={{ fontWeight: 700, marginBottom: 10, display: "block" }}>Select Regions</Text>
                <div className="acs-region-chips">
                  {STORE_REGIONS.map((r) => (
                    <span
                      key={r}
                      className={`acs-region-chip${selRegions.includes(r) ? " is-on" : ""}`}
                      onClick={() => toggleRegion(r)}
                    >
                      {selRegions.includes(r) && <CheckCircle2 size={11} />} {r}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {storeScope === "stores" && (
              <Card sx={{ ...softSx, marginTop: 0 }}>
                <Text variant="caption" style={{ fontWeight: 700, marginBottom: 8, display: "block" }}>
                  Enter Store IDs <Text variant="micro" tone="muted">(comma-separated, e.g. 104, 212, 318)</Text>
                </Text>
                <input
                  className="acs-store-input"
                  placeholder="e.g. 104, 212, 318, 401…"
                  value={storeInput}
                  onChange={(e) => setStoreInput(e.target.value)}
                />
              </Card>
            )}

            <div className="acs-scope-footer">
              <Button variant="secondary" size="large" onClick={() => back()}>← Back</Button>
              <Button variant="primary" size="large" onClick={() => advance()} disabled={!canProceed2}>
                Review & Launch →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & Launch ───────────────────────────────────────── */}
        {subStep === 3 && !launching && (
          <div className="acs-scope-step acs-step-enter">
            <div className="acs-scope-step-title">
              <Text variant="heading" tone="strong">Review Configuration</Text>
              <Text variant="caption" tone="muted">The agent will run all 5 tiers sequentially. You can finalize early at any tier.</Text>
            </div>

            <div className="acs-review-grid">
              {summaryCells.map((cell) => (
                <div key={cell.label} className="acs-review-cell">
                  <div className="acs-review-icon">{cell.icon}</div>
                  <div>
                    <Text variant="micro" tone="muted" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, display: "block", fontSize: 9 }}>{cell.label}</Text>
                    <Text variant="caption" style={{ fontWeight: 700 }}>{cell.value}</Text>
                  </div>
                </div>
              ))}
            </div>

            {/* Tier pipeline preview */}
            <Card sx={softSx}>
              <Text variant="caption" style={{ fontWeight: 700, marginBottom: 14, display: "block" }}>Agent Tier Pipeline</Text>
              <div className="acs-tier-pipeline">
                {[
                  { tier: "Tier 1A", label: "Store Structure",    color: color.primary,  icon: "📐" },
                  { tier: "Tier 1B", label: "Market Context",     color: color.teal,     icon: "📊" },
                  { tier: "Tier 2",  label: "Commercial Scope",   color: color.info,     icon: "💰" },
                  { tier: "CS",      label: "Cold-Start Inject",  color: color.warning,  icon: "⭐" },
                  { tier: "Tier 4",  label: "Product Profile",    color: color.accent,   icon: "🎨" },
                ].map((t, i, arr) => (
                  <React.Fragment key={t.tier}>
                    <div className="acs-tier-node">
                      <div className="acs-tier-node-dot" style={{ background: t.color }}>
                        <span style={{ fontSize: 12 }}>{t.icon}</span>
                      </div>
                      <Text variant="micro" style={{ fontWeight: 800, color: t.color, marginBottom: 2, display: "block" }}>{t.tier}</Text>
                      <Text variant="micro" tone="muted" style={{ fontSize: 9, textAlign: "center" }}>{t.label}</Text>
                    </div>
                    {i < arr.length - 1 && <div className="acs-tier-connector" style={{ background: `linear-gradient(90deg, ${t.color}44, ${arr[i+1].color}44)` }} />}
                  </React.Fragment>
                ))}
              </div>
            </Card>

            <div className="acs-scope-footer">
              <Button variant="secondary" size="large" onClick={() => back()}>← Back</Button>
              <Button variant="primary" size="large" onClick={handleLaunch} disabled={!canLaunch}>
                <Zap size={16} style={{ marginRight: 6 }} />
                ⚡ Launch Clustering Agent
              </Button>
            </div>
          </div>
        )}

        {/* ── Launching overlay ─────────────────────────────────────────────── */}
        {launching && (
          <div className="acs-launching-overlay acs-launch-enter" onAnimationEnd={onLaunch}>
            <div className="acs-launch-inner">
              <div className="acs-launch-ring">
                <div className="acs-launch-ring-inner">
                  <Cpu size={32} color="var(--color-primary-soft)" />
                </div>
              </div>
              <Text variant="title" style={{ color: "#fff", marginTop: 24, display: "block" }}>Initializing Agent</Text>
              <Text variant="caption" style={{ color: "#93C5FD", marginTop: 8, display: "block", lineHeight: 1.6 }}>
                Spinning up Tier 1A · Store Structure analysis&nbsp;…
              </Text>
              <div className="acs-launch-bars">
                {["Store Structure", "Market Context", "Commercial Scope", "Cold-Start", "Style Profile"].map((t, i) => (
                  <div key={t} className="acs-launch-bar-row" style={{ animationDelay: `${i * 0.18}s` }}>
                    <Text variant="micro" style={{ color: "#93C5FD", width: 130, flexShrink: 0 }}>{t}</Text>
                    <div className="acs-launch-bar-track">
                      <div className="acs-launch-bar-fill" style={{ animationDelay: `${i * 0.18}s` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 4: Setup Wizard ───────────────────────────────────────────────────

/* ── Work Happening State Machine ─────────────────────────────────────────────
 * Props: tierKey (e.g. "1A"), tierLabel, runCta (button label), children (results JSX)
 * States: "idle" → "running" → "results"
 * ─────────────────────────────────────────────────────────────────────────── */
function TierRunWrapper({ tierKey, tierLabel, runCta, children, autoRun = false }) {
  const [runState, setRunState]     = useState(autoRun ? "results" : "idle");
  const [logLines, setLogLines]     = useState([]);
  const [revealed, setRevealed]     = useState(false);
  const logs = TIER_WORK_LOGS[tierKey] || [];

  const startRun = useCallback(() => {
    setRunState("running");
    setLogLines([]);
    setRevealed(false);
    // Stream log lines one by one based on their t value
    logs.forEach((line) => {
      setTimeout(() => {
        setLogLines((prev) => [...prev, line]);
      }, Math.round(line.t * 1000));
    });
    // After all logs, transition to results
    const totalTime = logs.length > 0 ? Math.round(logs[logs.length - 1].t * 1000) + 600 : 2000;
    setTimeout(() => {
      setRunState("results");
      setTimeout(() => setRevealed(true), 50);
    }, totalTime);
  }, [logs]);

  // AUTO-RUN: show results directly
  if (runState === "results") {
    return (
      <div className={`acs-tier-results${revealed ? " revealed" : ""}`}>
        <div className="acs-tier-results-header">
          <div className="acs-tier-done-badge">
            <CheckCircle2 size={13} style={{ marginRight: 4 }} />
            {tierLabel} Complete
          </div>
          <button className="acs-tier-rerun-btn" onClick={() => { setRunState("idle"); setLogLines([]); setRevealed(false); }}>
            ↺ Re-run
          </button>
        </div>
        {children}
      </div>
    );
  }

  if (runState === "running") {
    return (
      <div className="acs-tier-running">
        {/* Skeleton shimmer placeholders */}
        <div className="acs-skeleton-grid">
          <div className="acs-skeleton-card"><div className="acs-skeleton-shimmer" style={{ height: 140 }} /></div>
          <div className="acs-skeleton-card"><div className="acs-skeleton-shimmer" style={{ height: 140 }} /></div>
        </div>
        <div className="acs-skeleton-card" style={{ marginTop: 0 }}>
          <div className="acs-skeleton-shimmer" style={{ height: 180 }} />
        </div>

        {/* Streaming terminal */}
        <div className="acs-work-terminal">
          <div className="acs-work-terminal-header">
            <span className="acs-work-terminal-dot red" />
            <span className="acs-work-terminal-dot yellow" />
            <span className="acs-work-terminal-dot green" />
            <span className="acs-work-terminal-title">
              <Cpu size={11} style={{ marginRight: 4 }} />
              AGENT · {tierLabel} COMPUTATION ENGINE
            </span>
          </div>
          <div className="acs-work-terminal-body">
            {logLines.map((line, i) => (
              <div key={i} className={`acs-work-log-line acs-work-log-${line.type} acs-log-fade-in`}>
                <span className="acs-work-log-time">[{line.t.toFixed(1)}s]</span>
                <span className="acs-work-log-text">{line.text}</span>
              </div>
            ))}
            <span className="acs-terminal-cursor" />
          </div>
        </div>
      </div>
    );
  }

  // IDLE state: show configuration placeholder + CTA
  return (
    <div className="acs-tier-idle">
      <div className="acs-tier-idle-canvas">
        <div className="acs-tier-idle-icon">
          <Cpu size={36} style={{ opacity: 0.25 }} />
        </div>
        <div className="acs-tier-idle-msg">
          <Text variant="heading" tone="muted" style={{ marginBottom: 8, display: "block" }}>
            {tierLabel} — Ready to Compute
          </Text>
          <Text variant="caption" tone="subtle">
            Select metric drivers above, then click the button below to run the clustering calculation.
          </Text>
        </div>
        <div className="acs-tier-idle-store-pins">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="acs-idle-pin" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
      <div className="acs-tier-idle-cta">
        <Button variant="primary" size="large" onClick={startRun}>
          <Zap size={16} style={{ marginRight: 6 }} />
          {runCta}
        </Button>
      </div>
    </div>
  );
}

/* Boxplot-style dispersion bar (simplified: shows IQR range) */
function DispersionBar({ min, q1, median, q3, max, maxVal, barColor }) {
  const scale = (v) => `${((v / maxVal) * 100).toFixed(1)}%`;
  return (
    <div className="acs-disp-bar">
      <div className="acs-disp-range" style={{ left: scale(q1), width: `${((q3 - q1) / maxVal) * 100}%`, background: `${barColor}33`, border: `1.5px solid ${barColor}` }} />
      <div className="acs-disp-median" style={{ left: scale(median), background: barColor }} />
      <div className="acs-disp-whisker left" style={{ left: scale(min) }} />
      <div className="acs-disp-whisker right" style={{ left: scale(max) }} />
      <div className="acs-disp-line" style={{ left: scale(min), width: `${((max - min) / maxVal) * 100}%` }} />
    </div>
  );
}

/* Signal heatmap cell */
function SignalCell({ value }) {
  const colors = ["#FEF2F2", "#FEE2E2", "#FDE68A", "#D1FAE5", "#6EE7B7"];
  const bg = colors[Math.min(value - 1, 4)] || colors[0];
  const textColors = ["#DC2626", "#DC2626", "#92400E", "#065F46", "#047857"];
  return (
    <div className="acs-signal-cell" style={{ background: bg, color: textColors[Math.min(value - 1, 4)] || textColors[0] }}>
      {"+" .repeat(value)}
    </div>
  );
}

function Step0_Tier1A({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier1aMetrics.includes(key) ? d.tier1aMetrics.filter((k) => k !== key) : [...d.tier1aMetrics, key];
    return { ...d, tier1aMetrics: metrics, useAgentTier1a: false };
  });

  const sqftMax = 110000;
  const ageMax  = 800;

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge">Tier 1A</div>
        <Text variant="title" tone="strong">Store Structure</Text>
        <Text variant="caption" tone="muted">Group stores purely by physical footprint, store maturity, and DC supply chain routing.</Text>
      </div>

      {/* Metric selection */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Clustering Metrics</Text>
          <Stack direction="row" gap={2}>
            <Button variant={draft.useAgentTier1a ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier1a: true, tier1aMetrics: TIER1A_METRICS.filter((m) => m.recommended).map((m) => m.key) }))}>
              🤖 Agent Recommended
            </Button>
            <Button variant={!draft.useAgentTier1a ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier1a: false }))}>
              ⚙️ Customize
            </Button>
          </Stack>
        </div>
        <div className="acs-metric-grid" style={{ padding: 16 }}>
          {TIER1A_METRICS.map((m) => (
            <MetricToggle key={m.key} metric={m} active={draft.tier1aMetrics.includes(m.key)} onToggle={toggleMetric} />
          ))}
        </div>
      </Card>

      {/* ── Work Happening Wrapper ── */}
      <TierRunWrapper tierKey="1A" tierLabel="Tier 1A: Store Structure" runCta="⚡ Run Tier 1A Calculation">
        {/* Dispersion charts */}
        <div className="acs-disp-charts">
          {[
            { title: "SqFt Dispersion",   data: TIER1A_SQFT_DISPERSION, maxVal: sqftMax, barColor: color.primary, fmt: (v) => `${(v/1000).toFixed(0)}k` },
            { title: "Store Age (Weeks)", data: TIER1A_AGE_DISPERSION,   maxVal: ageMax,  barColor: color.teal,    fmt: (v) => `${v}w`                    },
          ].map((chart) => (
            <Card key={chart.title} sx={{ ...panelSx, flex: 1 }}>
              <Text variant="body-strong" tone="strong" style={{ marginBottom: 16, display: "block" }}>{chart.title}</Text>
              {chart.data.map((row) => (
                <div key={row.id} className="acs-disp-row">
                  <Text variant="micro" style={{ fontWeight: 700, width: 16, flexShrink: 0 }}>{row.id}</Text>
                  <DispersionBar {...row} maxVal={chart.maxVal} barColor={chart.barColor} />
                  <Text variant="micro" tone="muted" style={{ width: 36, textAlign: "right", flexShrink: 0 }}>{chart.fmt(row.median)}</Text>
                </div>
              ))}
            </Card>
          ))}
        </div>

        {/* Structure family table */}
        <Card sx={{ ...panelSx, padding: 0 }}>
          <div className="acs-section-header">
            <Text variant="body-strong" tone="strong">Structure Family Overview</Text>
            <Badge variant="subtle" size="small" color="neutral" label="6 Families" />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="acs-table">
              <thead>
                <tr>
                  <th>Family</th><th>Name</th><th>Stores</th><th>Modal State</th>
                  <th>Modal DC</th><th>Avg SqFt</th><th>Avg Age (wk)</th><th>Business Read</th>
                </tr>
              </thead>
              <tbody>
                {TIER1A_FAMILIES.map((f) => (
                  <tr key={f.id}>
                    <td><span className="acs-family-badge" style={{ background: LABEL_COLORS.structure[f.id] }}>{f.id}</span></td>
                    <td><Text variant="caption" style={{ fontWeight: 600 }}>{f.label}</Text></td>
                    <td><Text variant="micro" mono style={{ fontWeight: 700 }}>{f.stores}</Text></td>
                    <td><Text variant="micro" tone="muted">{f.modalState}</Text></td>
                    <td><Text variant="micro" tone="muted">{f.dc}</Text></td>
                    <td><Text variant="micro" mono>{f.avgSqft.toLocaleString()}</Text></td>
                    <td><Text variant="micro" mono>{f.avgAgeWeeks}</Text></td>
                    <td><Text variant="micro" tone="muted">{f.businessRead}</Text></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <AgentInsight text={TIER1A_MICRO_INSIGHT} type="info" />
      </TierRunWrapper>

      <WizardFooter tierLabel="Tier 1A (Supply Chain Run)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Tier 1B: Market Context →" />
    </div>
  );
}

function Step1_Tier1B({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier1bMetrics.includes(key) ? d.tier1bMetrics.filter((k) => k !== key) : [...d.tier1bMetrics, key];
    return { ...d, tier1bMetrics: metrics, useAgentTier1b: false };
  });

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: LABEL_COLORS.market.M3 }}>Tier 1B</div>
        <Text variant="title" tone="strong">External Market Context</Text>
        <Text variant="caption" tone="muted">Map 30-mile ZCTA catchment trade areas using Census ACS, IRS SOI, Zillow ZHVI, and FEMA NRI climate data.</Text>
      </div>

      {/* Catchment radius + metrics */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <div>
            <Text variant="body-strong" tone="strong">Trade Area &amp; Metrics</Text>
            <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>
              Catchment Radius: <strong>30-Mile ZCTA Centroid Radius</strong>
            </Text>
          </div>
          <Stack direction="row" gap={2}>
            <Button variant={draft.useAgentTier1b ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier1b: true, tier1bMetrics: TIER1B_METRICS.filter((m) => m.recommended).map((m) => m.key) }))}>
              🤖 Agent Recommended
            </Button>
            <Button variant={!draft.useAgentTier1b ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier1b: false }))}>
              ⚙️ Customize
            </Button>
          </Stack>
        </div>
        <div className="acs-metric-grid" style={{ padding: 16 }}>
          {TIER1B_METRICS.map((m) => (
            <MetricToggle key={m.key} metric={m} active={draft.tier1bMetrics.includes(m.key)} onToggle={toggleMetric} />
          ))}
        </div>
      </Card>

      {/* ── Work Happening Wrapper ── */}
      <TierRunWrapper tierKey="1B" tierLabel="Tier 1B: Market Context" runCta="⚡ Run Tier 1B Market Analysis">
        {/* Signal heatmap */}
        <Card sx={{ ...panelSx, padding: 0 }}>
          <div className="acs-section-header">
            <Text variant="body-strong" tone="strong">Relative Signal Heatmap</Text>
            <Text variant="micro" tone="muted">+++++ = +2.5σ signal strength</Text>
          </div>
          <div style={{ overflowX: "auto", padding: "0 0 8px" }}>
            <table className="acs-heatmap-table">
              <thead>
                <tr>
                  <th>Family</th>
                  {TIER1B_SIGNAL_MATRIX.headers.map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIER1B_SIGNAL_MATRIX.rows.map((row) => (
                  <tr key={row.family} className={TIER1B_FAMILIES.find((f) => f.id === row.family)?.highlight ? "acs-heatmap-highlight" : ""}>
                    <td><span className="acs-family-badge" style={{ background: LABEL_COLORS.market[row.family] }}>{row.family}</span></td>
                    {row.values.map((v, i) => <td key={i}><SignalCell value={v} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Market family table */}
        <Card sx={{ ...panelSx, padding: 0 }}>
          <div className="acs-section-header">
            <Text variant="body-strong" tone="strong">Market Family Read</Text>
            <Badge variant="subtle" size="small" color="neutral" label="4 Market Families" />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="acs-table">
              <thead>
                <tr>
                  <th>Family</th><th>Merchant Name</th><th>Stores</th>
                  <th>Median Income</th><th>Home Value</th><th>Owner Share</th><th>Older Home %</th><th>AI Business Read</th>
                </tr>
              </thead>
              <tbody>
                {TIER1B_FAMILIES.map((f) => (
                  <tr key={f.id} className={f.highlight ? "acs-row-highlight" : ""}>
                    <td><span className="acs-family-badge" style={{ background: LABEL_COLORS.market[f.id] }}>{f.id}</span></td>
                    <td>
                      <Text variant="caption" style={{ fontWeight: 600 }}>{f.merchantName}</Text>
                      {f.highlight && <span className="acs-rec-badge" style={{ marginLeft: 6 }}>★ Contractor-Rich</span>}
                    </td>
                    <td><Text variant="micro" mono style={{ fontWeight: 700 }}>{f.stores}</Text></td>
                    <td><Text variant="micro" mono>{fmtCurrency(f.income)}</Text></td>
                    <td><Text variant="micro" mono>{fmtCurrency(f.homeValue)}</Text></td>
                    <td><Text variant="micro" mono>{f.ownerShare}%</Text></td>
                    <td><Text variant="micro" mono>{f.olderHomeShare}%</Text></td>
                    <td><Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{f.businessRead}</Text></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <AgentInsight text={TIER1B_MICRO_INSIGHT} type="info" />
      </TierRunWrapper>

      <WizardFooter tierLabel="Tier 1B (Macro Real Estate)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Step 3: Scope & Tier 2 →" />
    </div>
  );
}

function Step2_ScopeAndTier2({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier2Metrics.includes(key) ? d.tier2Metrics.filter((k) => k !== key) : [...d.tier2Metrics, key];
    return { ...d, tier2Metrics: metrics, useAgentTier2: false };
  });

  const l2Options = SCOPE_HIERARCHY.l2[draft.scopeL1] || [];
  const l3Key = `${draft.scopeL1} / ${draft.scopeL2}`;
  const l3Options = SCOPE_HIERARCHY.l3[l3Key] || [];
  const l4Key = `${draft.scopeL1} / ${draft.scopeL2} / ${draft.scopeL3}`;
  const l4Options = SCOPE_HIERARCHY.l4[l4Key] || [];

  const dosMax = 1800;

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: color.info }}>Tier 2</div>
        <Text variant="title" tone="strong">Merchandise Scope &amp; Commercial Performance</Text>
        <Text variant="caption" tone="muted">Lock the target merchandise hierarchy and fetch category-scoped sales velocity, sell-through %, and Days of Supply.</Text>
      </div>

      {/* Scope selectors */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Select Merchandise Scope (Levels 1–4)</Text>
          {draft.scopeL4 && <Badge variant="subtle" size="small" color="success" label={`🔒 ${draft.scopeL4}`} />}
        </div>
        <div className="acs-scope-grid" style={{ padding: "16px 20px 20px" }}>
          {[
            { label: "Level 1 — Department",  options: SCOPE_HIERARCHY.l1, val: draft.scopeL1, key: "scopeL1" },
            { label: "Level 2 — Sub-Dept",    options: l2Options,           val: draft.scopeL2, key: "scopeL2" },
            { label: "Level 3 — Class",       options: l3Options,           val: draft.scopeL3, key: "scopeL3" },
            { label: "Level 4 — Sub-Class",   options: l4Options,           val: draft.scopeL4, key: "scopeL4" },
          ].map((col) => (
            <div key={col.key}>
              <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8, display: "block" }}>{col.label}</Text>
              <select
                className="acs-scope-select"
                value={col.val}
                onChange={(e) => setDraft((d) => ({ ...d, [col.key]: e.target.value }))}
              >
                <option value="">Select…</option>
                {col.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Tier 2 metrics */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <div>
            <Text variant="body-strong" tone="strong">Tier 2: Category Commercial Metrics</Text>
            <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>Scoped to: {draft.scopeL4 || "—"}</Text>
          </div>
          <Stack direction="row" gap={2}>
            <Button variant={draft.useAgentTier2 ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier2: true, tier2Metrics: TIER2_METRICS.filter((m) => m.recommended).map((m) => m.key) }))}>
              🤖 Agent Recommended
            </Button>
            <Button variant={!draft.useAgentTier2 ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier2: false }))}>
              ⚙️ Customize
            </Button>
          </Stack>
        </div>
        <div className="acs-metric-grid" style={{ padding: 16 }}>
          {TIER2_METRICS.map((m) => (
            <MetricToggle key={m.key} metric={m} active={draft.tier2Metrics.includes(m.key)} onToggle={toggleMetric} />
          ))}
        </div>
      </Card>

      {/* DOS dispersion */}
      <Card sx={panelSx}>
        <Text variant="body-strong" tone="strong" style={{ marginBottom: 16, display: "block" }}>
          Days of Supply Dispersion — {draft.scopeL4 || "Selected Sub-Class"}
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TIER2_COMMERCIAL_CLUSTERS.map((cl) => {
            const pct = Math.min((cl.dos / dosMax) * 100, 100);
            const barColor = cl.risk === "critical" ? color.error : cl.risk === "moderate" ? color.warning : color.success;
            return (
              <div key={cl.id} className="acs-dos-row">
                <Text variant="micro" style={{ fontWeight: 600, width: 120, flexShrink: 0 }}>{cl.label}</Text>
                <div className="acs-dos-bar-wrap">
                  <div className="acs-dos-bar" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <Text variant="micro" mono style={{ width: 60, textAlign: "right", flexShrink: 0, color: barColor, fontWeight: 700 }}>
                  {cl.dos.toLocaleString()} d
                </Text>
                {cl.risk === "critical" && <AlertTriangle size={12} color={color.error} style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Comparison table */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Total-Store vs Category Rank Comparison</Text>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="acs-table">
            <thead>
              <tr><th>Store Location</th><th>Total Store Velocity Rank</th><th>Category Rank</th><th>Variance</th><th>Action Taken</th></tr>
            </thead>
            <tbody>
              {TIER2_COMPARISON_TABLE.map((row) => {
                const isPos = row.variance.startsWith("+");
                const isNeg = row.variance.startsWith("-");
                return (
                  <tr key={row.store}>
                    <td><Text variant="caption" style={{ fontWeight: 600 }}>{row.store}</Text></td>
                    <td><Text variant="micro" mono>#{row.totalRank}</Text></td>
                    <td><Text variant="micro" mono style={{ fontWeight: 700 }}>#{row.categoryRank}</Text></td>
                    <td>
                      <Text variant="micro" mono style={{ fontWeight: 700, color: isPos ? color.success : isNeg ? color.error : color.text }}>
                        {row.variance}
                      </Text>
                    </td>
                    <td><Text variant="micro" tone="muted">{row.action}</Text></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AgentInsight text={TIER2_AI_ALERT} type="warning" />
      <WizardFooter tierLabel="Tier 2 (Commercial OTB Run)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Step 4: Cold-Start →" />
    </div>
  );
}

function Step3_ColdStart({ draft, onFinalize, onProceed }) {
  const activeColdStart = COLD_START_STORES[0]; // Billings, MT as primary example

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: color.warning }}>Cold-Start</div>
        <Text variant="title" tone="strong">Cold-Start Store Injection</Text>
        <Text variant="caption" tone="muted">Safely onboard brand-new locations without sales history using the Dual-Anchor Proxy Model.</Text>
      </div>

      {/* Detected cold-start stores */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Stack direction="row" align="center" gap={2}>
            <Star size={14} color={color.warning} />
            <Text variant="body-strong" tone="strong">Detected Cold-Start Locations ({COLD_START_STORES.length})</Text>
          </Stack>
          <Badge variant="subtle" size="small" color="warning" label="Auto-Detected" />
        </div>
        <div style={{ padding: "12px 20px", display: "flex", flexWrap: "wrap", gap: 10 }}>
          {COLD_START_STORES.map((s) => (
            <div key={s.id} className={`acs-coldstart-chip${s.id === activeColdStart.id ? " is-active" : ""}`}>
              <Star size={10} />
              <Text variant="micro" style={{ fontWeight: 600 }}>#{s.id} {s.name}</Text>
              <Text variant="micro" tone="muted">{(s.sqft/1000).toFixed(0)}k sqft · {s.launch}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Tier governance */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Automated Tier Governance — {activeColdStart.name}</Text>
        </div>
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { tier: "Tier 1A — Store Structure",        status: "active",  label: `Matched to Structural Family ${activeColdStart.assignedFamily.split("-")[0]}` },
            { tier: "Tier 1B — Market Context",         status: "active",  label: `Matched to Market Family ${activeColdStart.assignedFamily.split("-")[1]}` },
            { tier: "Tier 2 — Commercial Performance",  status: "locked",  label: "0 Sales History — Borrowing Peer Velocity" },
            { tier: "Tier 4 — Product Profile & Style", status: "locked",  label: "Borrowing Peer Aesthetic Demand" },
          ].map((item) => (
            <div key={item.tier} className={`acs-tier-row ${item.status}`}>
              {item.status === "active"
                ? <CheckCircle2 size={14} color={color.success} />
                : <Lock size={14} color={color.warning} />}
              <div style={{ flex: 1 }}>
                <Text variant="caption" style={{ fontWeight: 700 }}>{item.tier}</Text>
                <Text variant="micro" tone="muted" style={{ marginLeft: 4 }}>→ {item.label}</Text>
              </div>
              <Badge variant="subtle" size="small" color={item.status === "active" ? "success" : "warning"} label={item.status === "active" ? "ACTIVE" : "LOCKED"} />
            </div>
          ))}
        </div>
      </Card>

      {/* Proxy matching */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Dual-Anchor Proxy Match Scorecard</Text>
          <Badge variant="subtle" size="small" color="neutral" label={activeColdStart.name} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="acs-table">
            <thead>
              <tr>
                <th>Twin Store</th><th>Store ID</th>
                <th>Structural Match (Tier 1A)</th><th>Demographic Match (Tier 1B)</th>
                <th>Distance (z-score)</th><th>Borrow Weight</th>
              </tr>
            </thead>
            <tbody>
              {PROXY_MATCHES.map((pm) => (
                <tr key={pm.store}>
                  <td><Text variant="caption" style={{ fontWeight: 700 }}>{pm.store}</Text></td>
                  <td><Text variant="micro" mono tone="muted">#{pm.storeId}</Text></td>
                  <td>
                    <Stack direction="row" align="center" gap={2}>
                      <Text variant="micro" mono style={{ fontWeight: 700 }}>{pm.structuralMatch}%</Text>
                      <div className="acs-match-bar-wrap">
                        <div className="acs-match-bar" style={{ width: `${pm.structuralMatch}%`, background: color.primary }} />
                      </div>
                    </Stack>
                  </td>
                  <td>
                    <Stack direction="row" align="center" gap={2}>
                      <Text variant="micro" mono style={{ fontWeight: 700 }}>{pm.demographicMatch}%</Text>
                      <div className="acs-match-bar-wrap">
                        <div className="acs-match-bar" style={{ width: `${pm.demographicMatch}%`, background: color.teal }} />
                      </div>
                    </Stack>
                  </td>
                  <td><Text variant="micro" mono>{pm.distance}σ</Text></td>
                  <td>
                    <Text variant="caption" style={{ fontWeight: 800, color: color.success }}>{pm.weight}%</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AgentInsight text={COLD_START_AI_READ} type="info" />
      <WizardFooter tierLabel="Cold-Start (Proxy-Only)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Step 5: Product Profile →" />
    </div>
  );
}

function Step4_Tier4({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier4Metrics.includes(key) ? d.tier4Metrics.filter((k) => k !== key) : [...d.tier4Metrics, key];
    return { ...d, tier4Metrics: metrics, useAgentTier4: false };
  });

  const telemetry = TIER4_TELEMETRY["B-M3-1-P2"];

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: color.accent }}>Tier 4</div>
        <Text variant="title" tone="strong">Product Profile &amp; Aesthetic Style Mix</Text>
        <Text variant="caption" tone="muted">Layer localized customer style preferences, finish types, species mix, and Good/Better/Best price positioning.</Text>
      </div>

      {/* Metric selection */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Catalog Attributes</Text>
          <Stack direction="row" gap={2}>
            <Button variant={draft.useAgentTier4 ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier4: true, tier4Metrics: TIER4_METRICS.filter((m) => m.recommended).map((m) => m.key) }))}>
              🤖 Agent Recommended
            </Button>
            <Button variant={!draft.useAgentTier4 ? "primary" : "secondary"} size="small"
              onClick={() => setDraft((d) => ({ ...d, useAgentTier4: false }))}>
              ⚙️ Customize
            </Button>
          </Stack>
        </div>
        <div className="acs-metric-grid" style={{ padding: 16 }}>
          {TIER4_METRICS.map((m) => (
            <MetricToggle key={m.key} metric={m} active={draft.tier4Metrics.includes(m.key)} onToggle={toggleMetric} />
          ))}
        </div>
      </Card>

      {/* Agent Telemetry strip */}
      {telemetry && (
        <div className="acs-t4-telemetry">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Cpu size={14} color="var(--color-primary-soft)" />
            <Text variant="caption" style={{ color: "var(--color-primary-soft)", fontWeight: 800 }}>TIER 4 AGENT TELEMETRY — Cluster B-M3</Text>
          </div>
          <div className="acs-t4-kpis">
            {[
              { label: "Top Style",       value: telemetry.topStyle },
              { label: "GBB Mix",         value: telemetry.gbbSummary },
              { label: "ASP / SqFt",      value: telemetry.aspSqft },
              { label: "Mismatch Risk",   value: telemetry.mismatchRisk },
            ].map((kpi) => (
              <div key={kpi.label} className="acs-t4-kpi">
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2, display: "block", fontSize: 9 }}>{kpi.label}</Text>
                <Text variant="caption" style={{ fontWeight: 700, color: "#fff" }}>{kpi.value}</Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Style profiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {TIER4_PROFILES.map((p) => (
          <Card key={p.id} sx={{ ...panelSx, padding: 0 }}>
            <div style={{ height: 3, background: LABEL_COLORS.style[p.id] || color.primary, borderRadius: "var(--r) var(--r) 0 0" }} />
            <div style={{ padding: 14 }}>
              <Stack direction="row" align="center" gap={2} style={{ marginBottom: 12 }}>
                <span className="acs-family-badge" style={{ background: LABEL_COLORS.style[p.id] || color.primary }}>{p.id}</span>
                <Text variant="caption" style={{ fontWeight: 700 }}>{p.label}</Text>
              </Stack>

              <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6, display: "block" }}>Finish Share</Text>
              {Object.entries(p.finishShare).map(([finish, pct]) => (
                <div key={finish} style={{ marginBottom: 5 }}>
                  <Stack direction="row" justify="space-between" style={{ marginBottom: 2 }}>
                    <Text variant="micro">{finish}</Text>
                    <Text variant="micro" mono style={{ fontWeight: 700 }}>{pct}%</Text>
                  </Stack>
                  <div style={{ height: 4, background: "var(--color-surface-sunken)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: LABEL_COLORS.style[p.id] || color.primary, borderRadius: 2 }} />
                  </div>
                </div>
              ))}

              <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", margin: "12px 0 6px", display: "block" }}>GBB Mix</Text>
              <div style={{ display: "flex", height: 10, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                {Object.entries(p.gbbMix).map(([tier, pct]) => {
                  const gbbColors = { Good: color.info, Better: color.teal, Best: color.success };
                  return <div key={tier} style={{ flex: pct, background: gbbColors[tier] || color.primary }} title={`${tier}: ${pct}%`} />;
                })}
              </div>
              <Stack direction="row" justify="space-between" style={{ marginTop: 4 }}>
                {Object.entries(p.gbbMix).map(([tier, pct]) => (
                  <Text key={tier} variant="micro" tone="muted">{tier} {pct}%</Text>
                ))}
              </Stack>

              <div style={{ marginTop: 12, padding: "6px 8px", background: p.mismatchRisk > 50 ? color.errorSoft : color.successSoft, borderRadius: 4 }}>
                <Text variant="micro" style={{ color: p.mismatchRisk > 50 ? color.error : color.success, fontWeight: 700 }}>
                  Style Mismatch Risk: {p.mismatchRisk}/100
                </Text>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <WizardFooter tierLabel="Tier 4 (Style Profile)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="⚡ Initialize Final Agentic Terminal Run" />
    </div>
  );
}

function SetupWizard({ onFinalize, onTerminal }) {
  const [step, setStep]   = useState(0);
  const [draft, setDraft] = useState({ ...STUDIO_WIZARD_DEFAULTS });

  const STEP_LABELS = ["Store Structure", "Market Context", "Scope & Tier 2", "Cold-Start", "Product Profile"];

  const goFinalize = () => onFinalize();
  const goNext     = () => {
    if (step < 4) setStep((s) => s + 1);
    else onTerminal();
  };

  return (
    <div className="acs-wizard-overlay">
      {/* Sticky wizard header */}
      <div className="acs-wizard-header">
        <div style={{ minWidth: 0 }}>
          <Text variant="heading" tone="strong">New Cluster Run — AI Setup Studio</Text>
          <Text variant="micro" tone="muted">Configure tiered clustering parameters step by step</Text>
        </div>
        <StepIndicator step={step} labels={STEP_LABELS} className="acs-step-indicator" />
        <Button variant="secondary" size="small" onClick={goFinalize}>Cancel</Button>
      </div>

      <div className="acs-wizard-body">
        {step === 0 && <Step0_Tier1A draft={draft} setDraft={setDraft} onFinalize={goFinalize} onProceed={goNext} />}
        {step === 1 && <Step1_Tier1B draft={draft} setDraft={setDraft} onFinalize={goFinalize} onProceed={goNext} />}
        {step === 2 && <Step2_ScopeAndTier2 draft={draft} setDraft={setDraft} onFinalize={goFinalize} onProceed={goNext} />}
        {step === 3 && <Step3_ColdStart draft={draft} onFinalize={goFinalize} onProceed={goNext} />}
        {step === 4 && <Step4_Tier4 draft={draft} setDraft={setDraft} onFinalize={goFinalize} onProceed={goNext} />}
      </div>
    </div>
  );
}

// ─── SCREEN 4: Execution Terminal ─────────────────────────────────────────────

function ExecutionTerminal({ onComplete }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [done, setDone]           = useState(false);
  const intervalRef               = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLineIndex((prev) => {
        const next = prev + 1;
        if (next >= TERMINAL_LOG_LINES.length) {
          clearInterval(intervalRef.current);
          setDone(true);
          setTimeout(onComplete, 1200);
        }
        return next;
      });
    }, 600);
    return () => clearInterval(intervalRef.current);
  }, [onComplete]);

  const pct = Math.round((lineIndex / TERMINAL_LOG_LINES.length) * 100);

  const typeColor = { info: "#93C5FD", success: "#6EE7B7", warning: "#FCD34D", error: "#FCA5A5" };

  return (
    <div className="acs-terminal-screen">
      <div className="acs-terminal-header">
        <div>
          <Text variant="heading" style={{ color: "#fff", fontWeight: 800 }}>Clustering Agent Execution Terminal</Text>
          <Text variant="micro" style={{ color: "#93C5FD", marginTop: 4, display: "block" }}>
            Run ID: CR-019 · Multi-Tiered K-Medoids Distance Processing · Level 4: Solid Prefinished Wood
          </Text>
        </div>
        {done && (
          <Stack direction="row" align="center" gap={2}>
            <CheckCircle2 size={18} color="#6EE7B7" />
            <Text variant="caption" style={{ color: "#6EE7B7", fontWeight: 700 }}>Complete</Text>
          </Stack>
        )}
      </div>

      {/* Progress bar */}
      <div className="acs-terminal-progress">
        <div className="acs-terminal-pbar">
          <div className="acs-terminal-pfill" style={{ width: `${pct}%` }} />
        </div>
        <Text variant="micro" style={{ color: "#93C5FD", minWidth: 40 }}>{pct}%</Text>
      </div>

      {/* Log output */}
      <div className="acs-terminal-log">
        {TERMINAL_LOG_LINES.slice(0, lineIndex + 1).map((line, i) => {
          const isActive = i === lineIndex && !done;
          return (
            <div key={i} className={`acs-log-line${isActive ? " is-active" : ""}`}>
              <span className="acs-log-time">[{line.time}]</span>
              <span className="acs-log-icon">{line.icon}</span>
              <span className="acs-log-text" style={{ color: typeColor[line.type] || typeColor.info }}>
                {line.text}{isActive && <span className="acs-cursor" />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCREEN 5: Scenario Review ────────────────────────────────────────────────

function ScenarioReview({ onPromote }) {
  const [selected, setSelected] = useState("B");
  const [promoted, setPromoted] = useState(false);

  const riskBorder = { healthy: color.success, risk: color.warning, critical: color.error, coldstart: color.info };
  const riskLabel  = { healthy: "🟢 Healthy / Growth", risk: "🟡 At Risk", critical: "🔴 CRITICAL OVERBUY RISK", coldstart: "🟡 Cold-Start Protected" };

  const handlePromote = () => {
    setPromoted(true);
    setTimeout(onPromote, 2200);
  };

  if (promoted) {
    return (
      <div className="acs-screen acs-promote-success">
        <Card sx={{ ...elevatedSx, maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", gap: 20, padding: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: color.successSoft, border: `1px solid ${color.success}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckCircle2 size={28} color={color.success} />
          </div>
          <div>
            <Text variant="title" style={{ color: color.success, marginBottom: 6 }}>CR-019 Accepted &amp; Live</Text>
            <Text variant="caption" tone="muted">Previous set CR-018 has been archived. Returning to Command Center…</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="acs-screen">
      {/* Page header */}
      <div className="acs-page-header">
        <Text variant="title" tone="strong">Scenario Review &amp; Promotion Dashboard</Text>
        <Badge variant="subtle" size="small" color="info" label="CR-019 · Ready for Promotion" />
      </div>

      {/* Agent recommendation banner */}
      <div className="acs-rec-banner">
        <div className="acs-rec-banner-icon">🤖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body-strong" style={{ color: color.primary, fontWeight: 800, marginBottom: 4, display: "block" }}>
            Agent Recommendation
          </Text>
          <Text variant="caption" tone="muted" style={{ lineHeight: 1.6 }}>{AGENT_SCENARIO_RECOMMENDATION}</Text>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="acs-scenario-selector">
        {STUDIO_SCENARIOS.map((sc) => (
          <div key={sc.id} className={`acs-scenario-card${selected === sc.id ? " is-selected" : ""}${sc.recommended ? " is-recommended" : ""}`}
            onClick={() => setSelected(sc.id)}>
            <div className="acs-scenario-radio">
              <div className={`acs-radio-dot${selected === sc.id ? " on" : ""}`} />
            </div>
            <div style={{ flex: 1 }}>
              <Stack direction="row" align="center" gap={2} style={{ marginBottom: 4 }}>
                <Text variant="caption" style={{ fontWeight: 800 }}>{sc.label}</Text>
                {sc.recommended && <Badge variant="subtle" size="small" color="success" label="Recommended" />}
              </Stack>
              <Text variant="micro" style={{ fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4, display: "block" }}>{sc.subtitle}</Text>
              <Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{sc.description}</Text>
            </div>
          </div>
        ))}
      </div>

      {/* Spider comparison */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Combined Cluster DNA — Spider Profile View</Text>
          <Text variant="micro" tone="muted">Cluster profile vs Enterprise Average</Text>
        </div>
        <div className="acs-spider-grid">
          {SCENARIO_FULL_CLUSTERS.map((cl) => (
            <div key={cl.id} style={{ padding: "0 8px 8px" }}>
              <Stack direction="row" align="center" gap={2} style={{ padding: "8px 0 0 8px", marginBottom: -8 }}>
                <LabelPill id={cl.id} size="sm" />
                <Text variant="micro" tone="muted" style={{ fontSize: 10 }}>{cl.label}</Text>
                {cl.isProxy && <Badge variant="subtle" size="small" color="info" label="Proxy" />}
              </Stack>
              <SpiderChart
                axes={SPIDER_AXES}
                values={cl.spiderAxes}
                networkValues={NETWORK_AVG}
                title={cl.id}
                height={220}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Label distribution */}
      <Card sx={panelSx}>
        <Text variant="body-strong" tone="strong" style={{ marginBottom: 14, display: "block" }}>Integrated Label Distribution</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SCENARIO_FULL_CLUSTERS.map((cl) => (
            <div key={cl.id} className="acs-dist-row">
              <LabelPill id={cl.id} size="sm" />
              <Text variant="micro" tone="muted" style={{ flex: 1, minWidth: 0 }}>{cl.label}</Text>
              <Text variant="micro" mono style={{ fontWeight: 700 }}>{cl.stores} {cl.stores === 1 ? "Store" : "Stores"}</Text>
              {cl.isProxy && <Badge variant="subtle" size="small" color="info" label="Cold-Start" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Risk heatmap */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Combined Commercial Risk Heatmap</Text>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="acs-table">
            <thead>
              <tr>
                <th>Cluster Label</th><th>Stores</th>
                <th>Sales/SqFt</th><th>Sell-Through %</th>
                <th>Days of Supply</th><th>GMROI</th>
                <th>Aesthetic</th><th>Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIO_FULL_CLUSTERS.map((cl) => (
                <tr key={cl.id} style={{ borderLeft: `3px solid ${riskBorder[cl.riskStatus] || color.border}` }}>
                  <td><LabelPill id={cl.id} size="sm" /></td>
                  <td><Text variant="micro" mono style={{ fontWeight: 700 }}>{cl.stores}</Text></td>
                  <td>
                    <Text variant="micro" mono style={{ fontWeight: 700, color: cl.salesSqft < 50 ? color.error : color.text }}>
                      ${cl.salesSqft}
                    </Text>
                  </td>
                  <td>
                    <Text variant="micro" mono style={{ color: cl.sellThrough < 20 ? color.error : color.text }}>
                      {cl.sellThrough}%{cl.isProxy ? " (proj)" : ""}
                    </Text>
                  </td>
                  <td>
                    <Text variant="micro" mono style={{ fontWeight: cl.dos > 500 ? 800 : 400, color: cl.dos > 500 ? color.error : color.text }}>
                      {cl.dos.toLocaleString()} d{cl.isProxy ? " (proj)" : ""}
                    </Text>
                  </td>
                  <td>
                    <Text variant="micro" mono style={{ color: cl.gmroi === 0 ? color.error : cl.gmroi < 1.5 ? color.warning : color.text }}>
                      {cl.gmroi.toFixed(1)}{cl.isProxy ? " (proj)" : ""}
                    </Text>
                  </td>
                  <td><Text variant="micro" tone="muted">{cl.aesthetic}</Text></td>
                  <td><Text variant="micro" style={{ fontWeight: 600 }}>{riskLabel[cl.riskStatus]}</Text></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SKU scorecard */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <Text variant="body-strong" tone="strong">Line Review — SKU Add / Drop Scorecard</Text>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="acs-table">
            <thead>
              <tr>
                <th>Target Cluster</th><th>Action</th><th>SKU #</th>
                <th>Description</th><th>Category Attribute</th><th>Financial Rationale</th>
              </tr>
            </thead>
            <tbody>
              {SKU_SCORECARD.map((row, i) => {
                const actionColor = { ADD: color.success, DROP: color.error, FREEZE: color.warning };
                return (
                  <tr key={i}>
                    <td><LabelPill id={row.cluster} size="sm" /></td>
                    <td>
                      <span className="acs-action-badge" style={{ background: actionColor[row.action] || color.primary }}>
                        {row.action}
                      </span>
                    </td>
                    <td><Text variant="micro" mono style={{ fontWeight: 700 }}>#{row.sku}</Text></td>
                    <td><Text variant="micro" style={{ fontWeight: 500 }}>{row.description}</Text></td>
                    <td><Text variant="micro" tone="muted">{row.attr}</Text></td>
                    <td><Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{row.rationale}</Text></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Final CTA */}
      <div className="acs-promote-bar">
        <Button variant="secondary" size="large">
          📥 Export Scorecard to OTB System
        </Button>
        <Button variant="primary" size="large" onClick={handlePromote}>
          🚀 Accept &amp; Promote Clusters to LIVE Production
        </Button>
      </div>
    </div>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────

export default function AgenticClustering({ onNavigate }) {
  // If New Store Planning sent us here to open the launcher directly, honour it.
  const [screen, setScreen] = useState(() => {
    const signal = sessionStorage.getItem("acs_open_at");
    if (signal) { sessionStorage.removeItem("acs_open_at"); return signal; }
    return "dashboard";
  });
  const [clusterId, setClusterId] = useState(null);

  const [launcherData, setLauncherData] = useState(null);

  const handleViewCluster   = useCallback((id) => { setClusterId(id); setScreen("detail"); }, []);
  const handleSwitchCluster = useCallback((id) => { setClusterId(id); }, []);
  const handleBackToCmd     = useCallback(() => { setClusterId(null); setScreen("dashboard"); }, []);
  const handleNewRun        = useCallback(() => setScreen("launcher"), []);   // → launcher modal first
  const handleLauncherBack  = useCallback(() => setScreen("dashboard"), []);
  const handleLauncherNext  = useCallback((ld) => { setLauncherData(ld); setScreen("scope"); }, []);
  const handleScopeBack     = useCallback(() => setScreen("launcher"), []);
  const handleScopeLaunch   = useCallback(() => setScreen("wizard"), []);    // scope → wizard
  const handleFinalize      = useCallback(() => setScreen("dashboard"), []);
  const handleTerminal      = useCallback(() => setScreen("terminal"), []);
  const handleReview        = useCallback(() => setScreen("review"), []);
  const handlePromote       = useCallback(() => setScreen("dashboard"), []);

  if (screen === "detail") {
    return <ClusterDeepDive clusterId={clusterId} onBack={handleBackToCmd} onSwitchCluster={handleSwitchCluster} />;
  }

  if (screen === "launcher") {
    return <LauncherModal onBack={handleLauncherBack} onNext={handleLauncherNext} />;
  }

  if (screen === "scope") {
    return <ScopeSelectionScreen onBack={handleScopeBack} onLaunch={handleScopeLaunch} launcherData={launcherData} />;
  }

  if (screen === "wizard") {
    return <SetupWizard onFinalize={handleFinalize} onTerminal={handleTerminal} />;
  }

  if (screen === "terminal") {
    return <ExecutionTerminal onComplete={handleReview} />;
  }

  if (screen === "review") {
    return <ScenarioReview onPromote={handlePromote} />;
  }

  return <CommandCenter onViewCluster={handleViewCluster} onNewRun={handleNewRun} />;
}
