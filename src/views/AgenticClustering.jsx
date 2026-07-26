/**
 * AgenticClustering.jsx — Agentic Location Clustering Studio
 *
 * 5-screen state machine:
 *   "dashboard" → "detail" (cluster deep-dive)
 *   "dashboard" → "wizard" (step 0-4) → "terminal" → "review" → "dashboard"
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Highcharts from "highcharts";
import "highcharts/highcharts-more"; // Highcharts v12: self-registers polar/more as a side effect
import HighchartsReact from "highcharts-react-official";
import { geoAlbers, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import usStatesTopology from "us-atlas/states-10m.json";
import { Card, Badge, Button, Chips } from "impact-ui";
import { AlertTriangle, CheckCircle2, Cpu, ChevronRight, ArrowLeft, Zap, Lock, Star, LayoutDashboard, BarChart3, DollarSign, Palette, Pencil, Store, Layers, Radio, X, Users, ArrowLeftRight, Maximize2, Sparkles, SlidersHorizontal } from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import FdSelect from "../components/FdSelect.jsx";
import { FD_STORES } from "../data/stores.js";
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
  TIER4_METRICS, TIER4_PROFILES, TIER4_TELEMETRY,
  TERMINAL_LOG_LINES,
  STUDIO_SCENARIOS, AGENT_SCENARIO_RECOMMENDATION, SCENARIO_FULL_CLUSTERS, SKU_SCORECARD,
  STUDIO_WIZARD_DEFAULTS,
  LABEL_COLORS,
  TIER_WORK_LOGS,
  CLUSTER_EXPLORER_CONFIG,
  CLX_METRIC_REGISTRY,
  getClxMetric,
  buildClusterRosters,
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
        <Lock size={14} style={{ marginRight: 6 }} /> Save &amp; Finalize at {tierLabel}
      </Button>
      <Button variant="primary" size="medium" onClick={onProceed}>
        {proceedLabel}
      </Button>
    </div>
  );
}

/** Highcharts 6-axis spider/radar chart */
function SpiderChart({ axes, values, networkValues, title, height = 280, showLegend = true }) {
  const options = useMemo(() => ({
    chart: {
      polar: true,
      type: "area",
      backgroundColor: "transparent",
      margin: showLegend ? [22, 26, 44, 26] : [26, 30, 26, 30],
      height,
    },
    title: { text: null },
    pane: { size: "70%" },
    xAxis: {
      categories: axes,
      tickmarkPlacement: "on",
      lineWidth: 0,
      gridLineColor: "rgba(128,128,128,0.2)",
      labels: {
        distance: 12,
        style: { color: "var(--color-text-muted)", fontSize: "10px", fontFamily: "inherit", fontWeight: "600" },
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
      enabled: showLegend,
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
  }), [axes, values, networkValues, title, height, showLegend]);

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
  // Run-level "View" opens the deep-dive at the first cluster that has detail data.
  const firstViewable  = allClusters.find((cl) => CLUSTER_DEEP_DIVE[cl.id]);

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
          <span className="acs-banner-cta-ico"><Zap size={14} /></span>
          Create New Cluster Run
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
                <th>Steps</th>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              {selectedRun?.status === "live"
                ? <Badge variant="subtle" size="small" color="success" label="LIVE" />
                : <Badge variant="subtle" size="small" color="neutral" label="ARCHIVED" />}
              <Text variant="micro" tone="muted">
                {filteredClusters.length}/{allClusters.length} cluster{allClusters.length !== 1 ? "s" : ""}
              </Text>
            </div>
            {firstViewable
              ? <Button variant="primary" size="small" onClick={() => onViewCluster(firstViewable.id)}>View Run →</Button>
              : <Button variant="secondary" size="small" disabled>No detail data</Button>}
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
                  <th>Sales / SqFt</th>
                  <th>GMROI</th>
                  <th>DOS</th>
                  <th>Cohesion</th>
                  <th>Status</th>
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

                      {/* Category Sales / SqFt */}
                      <td>
                        {cl.salesSqft != null
                          ? <Text variant="micro" mono style={{ fontWeight: 700 }}>${cl.salesSqft.toFixed(0)}</Text>
                          : <span className="acs-blank-cell">—</span>}
                      </td>

                      {/* GMROI */}
                      <td>
                        {cl.gmroi != null
                          ? <span className={`acs-pro-index${cl.gmroi >= 2.5 ? " high" : ""}`}>{cl.gmroi.toFixed(1)}×</span>
                          : <span className="acs-blank-cell">—</span>}
                      </td>

                      {/* Days of Supply */}
                      <td>
                        {cl.dos != null
                          ? <Text variant="micro" mono style={{ fontWeight: cl.dos > 250 ? 800 : 400, color: cl.dos > 250 ? color.error : color.text }}>{cl.dos}d</Text>
                          : <span className="acs-blank-cell">—</span>}
                      </td>

                      {/* Cohesion gradient bar */}
                      <td style={{ minWidth: 170 }}><CohesionBar value={cl.cohesion} /></td>

                      {/* Status dot badge */}
                      <td><StatusBadge status={cl.status} /></td>
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

const DD_TABS = [
  { id: "overall",    label: "Overall" },
  { id: "structure",  label: "Step 1 · Store Structure" },
  { id: "market",     label: "Step 2 · Market Context" },
  { id: "commercial", label: "Step 3 · Commercial" },
  { id: "product",    label: "Step 4 · Product Profile" },
];

function ClusterDeepDive({ clusterId, onBack, onSwitchCluster }) {
  const data      = CLUSTER_DEEP_DIVE[clusterId];
  const telemetry = CLUSTER_COMMERCIAL_TELEMETRY[clusterId];
  const signals   = CLUSTER_SIGNAL_BARS[clusterId] || [];
  const members   = CLUSTER_MEMBER_STORES[clusterId] || [];
  const [rosterSearch, setRosterSearch] = useState("");
  const [tab, setTab] = useState("overall");

  const filteredMembers = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q));
  }, [members, rosterSearch]);

  if (!data) return null;

  const spiderValues = Object.values(data.spiderAxes);
  const parsed       = parseLabel(clusterId);
  const allClusterIds = Object.keys(CLUSTER_DEEP_DIVE);

  return (
    <div className="acs-screen">

      {/* ── Navigation Bridge ─────────────────────────────────────────────── */}
      <div className="acs-dd-nav-bridge">
        <button className="acs-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Command Center
        </button>
        <div className="acs-cluster-switcher-wrap">
          <FdSelect
            value={clusterId}
            width={340}
            options={allClusterIds.map((id) => ({ value: id, label: `${id} · ${CLUSTER_DEEP_DIVE[id].label}` }))}
            onChange={(v) => onSwitchCluster && onSwitchCluster(v)}
          />
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

      {/* ── Step / Overall tab strip ──────────────────────────────────────── */}
      <div className="acs-dd-tabs" role="tablist">
        {DD_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`acs-dd-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERALL ═══════════════════════════════════════════════════════ */}
      {tab === "overall" && (
      <>
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
                <span>Step 3 &amp; 5 signals locked for cold-start. Demand borrowed from peer cohort via z-score distance weights.</span>
              </div>
            </>
          ) : (
            <div className="acs-proxy-empty">
              <Text variant="micro" tone="muted">No cold-start proxies assigned to this cluster.</Text>
            </div>
          )}
        </Card>
      </div>
      </>
      )}

      {/* ══ STORE STRUCTURE ═══════════════════════════════════════════════ */}
      {/* ── Baseline Anatomy: 4 Boxplots ─────────────────────────────────── */}
      {(tab === "structure") && (
      <>
      <div className="acs-dd-summary-grid">
        {[
          { label: "Stores in Cluster", value: data.stores, sub: "network members" },
          { label: "Avg Store SqFt",    value: data.avgSqft.toLocaleString(), sub: "footprint" },
          { label: "Cohesion",          value: data.cohesion.toFixed(2), sub: "intra-cluster fit" },
          { label: "Pro Index",         value: `${data.proIndex}×`, sub: "vs national avg" },
        ].map((k) => (
          <div key={k.label} className="acs-dd-summary-card">
            <div className="acs-dd-summary-label">{k.label}</div>
            <div className="acs-dd-summary-value">{k.value}</div>
            <div className="acs-dd-summary-sub">{k.sub}</div>
          </div>
        ))}
      </div>
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

      </>
      )}

      {/* ══ MARKET CONTEXT ════════════════════════════════════════════════ */}
      {tab === "market" && (
      <>
      {/* Market DNA radar */}
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header" style={{ paddingBottom: 0 }}>
          <Text variant="body-strong" tone="strong">Cluster DNA — 6-Axis Radar</Text>
          <Badge variant="subtle" size="small" color="neutral" label="vs Network Avg" />
        </div>
        <SpiderChart axes={SPIDER_AXES} values={spiderValues} networkValues={NETWORK_AVG} title={data.label} height={300} />
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
      </>
      )}

      {/* ══ COMMERCIAL ════════════════════════════════════════════════════ */}
      {tab === "commercial" && telemetry && (
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
        </div>
      )}

      {/* ══ PRODUCT PROFILE ═══════════════════════════════════════════════ */}
      {tab === "product" && (
      <>
      {telemetry && (
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
      )}
      </>
      )}

      {/* ══ OVERALL · Member Store Roster ─────────────────────────────────── */}
      {tab === "overall" && (
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
      )}

      {/* ══ OVERALL · Label Breakdown ─────────────────────────────────────── */}
      {tab === "overall" && parsed && (
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

// Guided path shown on the launcher — plain sequential Steps, no tier jargon.
const LAUNCH_STEPS = [
  { label: "Channel & Store Scope", note: "Choose the demand channel and the store network to cluster" },
  { label: "Store Structure",       note: "Footprint, store age, DC proximity and geo coordinates" },
  { label: "Market Context",        note: "Census, household income, home values and FEMA risk signals" },
  { label: "Commercial Scope",      note: "Pick the merchandise hierarchy · Sales/SqFt, DOS, GMROI" },
  { label: "Taste Profile",         note: "Finish, species and Good / Better / Best price mix" },
];

const NAME_SUGGESTIONS = [
  "SS26 Solid Wood — Full Network Reset",
  "FW26 Tile Line Review",
  "SS26 LVP Proxy Inject",
];

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

        {/* Scenario name — Impact UI card */}
        <Card sx={{ ...elevatedSx, padding: 0, overflow: "hidden" }}>
          <div className="acs-launcher-namecard">
            <div className="acs-launcher-namecard-head">
              <span className="acs-launcher-step-index">1</span>
              <div>
                <div className="acs-launcher-section-title">Name this clustering scenario</div>
                <div className="acs-launcher-section-desc">
                  A clear name makes this run easy to find in the Command Center roster.
                </div>
              </div>
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
              {NAME_SUGGESTIONS.map((s) => (
                <button key={s} className="acs-launcher-suggestion-chip" onClick={() => setScenarioName(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Guided path — Impact UI card with numbered stepper */}
        <Card sx={{ ...softSx, padding: 0, overflow: "hidden" }}>
          <div className="acs-launcher-steps">
            <div className="acs-launcher-steps-head">
              <span className="acs-launcher-steps-head-title">
                <Cpu size={14} style={{ marginRight: 7, opacity: 0.7 }} />
                Your guided path
              </span>
              <Badge variant="subtle" size="small" color="info" label={`${LAUNCH_STEPS.length} Steps`} />
            </div>
            <ol className="acs-launcher-steps-list">
              {LAUNCH_STEPS.map((s, i) => (
                <li key={s.label} className="acs-launcher-step-row">
                  <span className="acs-launcher-step-dot">{i + 1}</span>
                  <div className="acs-launcher-step-text">
                    <div className="acs-launcher-step-label">{s.label}</div>
                    <div className="acs-launcher-step-note">{s.note}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>

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
  { id: "all",       label: "All Channels",     desc: "Blend in-store & online demand signals"    },
  { id: "retail",    label: "In-Store Retail",  desc: "Consumer walk-in demand"                   },
  { id: "ecomm",     label: "E-Commerce",       desc: "Online-only order demand & ship-from-store" },
];

// Store network coverage per channel. In-store retail spans the full physical
// network; e-commerce is fulfilled from a smaller set of ship-from-store nodes.
// The store universe re-scopes to the union of the selected channels.
const CHANNEL_NETWORK = { all: 260, retail: 260, ecomm: 188 };
function channelNetworkSize(channels) {
  if (!channels || !channels.length) return 260;
  return Math.max(...channels.map((c) => CHANNEL_NETWORK[c] ?? 260));
}

const STORE_SCOPE_OPTIONS = [
  { id: "all",     label: "All Stores — Full Network (260)", desc: "Run clustering across the full 260-store network"     },
  { id: "region",  label: "By Region Group",                 desc: "Scope to one or more geographic region groups"        },
  { id: "custom",  label: "Custom Stores",                   desc: "Hand-pick individual stores and/or add whole groups"  },
];

// Region groups derived from the live store network, sorted alphabetically.
const STORE_REGIONS = [...new Set(FD_STORES.map((s) => s.region))].sort();

const SCOPE_STEPS = [
  { id: 0, label: "Scope & Context", desc: "Channel, hierarchy & store universe" },
  { id: 1, label: "Review & Launch", desc: "Confirm & run"                       },
];

function ScopeSelectionScreen({ onBack, onLaunch }) {
  const [subStep, setSubStep]         = useState(0);
  const [animKey, setAnimKey]         = useState(0);
  const [channels, setChannels]       = useState([]);   // multi-select
  const [scopeL1, setScopeL1]         = useState([]);   // multi-select
  const [scopeL2, setScopeL2]         = useState([]);
  const [scopeL3, setScopeL3]         = useState([]);
  const [scopeL4, setScopeL4]         = useState([]);
  const [storeScope, setStoreScope]   = useState("all");   // default: all stores per channel
  const [selRegions, setSelRegions]   = useState([]);   // region-group scope
  const [selGroups, setSelGroups]     = useState([]);   // quick-add groups (custom)
  const [selStores, setSelStores]     = useState([]);   // individual store ids (custom)
  const [launching, setLaunching]     = useState(false);

  const advance  = (n = 1) => { setSubStep((s) => s + n); setAnimKey((k) => k + 1); };
  const back     = (n = 1) => { setSubStep((s) => s - n); setAnimKey((k) => k + 1); };
  const goToStep = (n)     => { setSubStep(n); setAnimKey((k) => k + 1); };

  // Cascading options are the UNION of children across every selected parent.
  const l2Options = useMemo(() => {
    const set = new Set();
    scopeL1.forEach((d) => (SCOPE_HIERARCHY.l2[d] || []).forEach((x) => set.add(x)));
    return [...set];
  }, [scopeL1]);
  const l3Options = useMemo(() => {
    const set = new Set();
    scopeL1.forEach((d) => scopeL2.forEach((sd) => (SCOPE_HIERARCHY.l3[`${d} / ${sd}`] || []).forEach((x) => set.add(x))));
    return [...set];
  }, [scopeL1, scopeL2]);
  const l4Options = useMemo(() => {
    const set = new Set();
    scopeL1.forEach((d) => scopeL2.forEach((sd) => scopeL3.forEach((c) => (SCOPE_HIERARCHY.l4[`${d} / ${sd} / ${c}`] || []).forEach((x) => set.add(x)))));
    return [...set];
  }, [scopeL1, scopeL2, scopeL3]);

  // Prune deeper selections when a parent change makes them invalid.
  useEffect(() => { setScopeL2((p) => p.filter((v) => l2Options.includes(v))); }, [l2Options]);
  useEffect(() => { setScopeL3((p) => p.filter((v) => l3Options.includes(v))); }, [l3Options]);
  useEffect(() => { setScopeL4((p) => p.filter((v) => l4Options.includes(v))); }, [l4Options]);

  // Custom-store resolution: union of individually picked stores + group members.
  const customStoreIds = useMemo(() => {
    const set = new Set(selStores.map(Number));
    FD_STORES.forEach((s) => { if (selGroups.includes(s.region)) set.add(s.id); });
    return [...set];
  }, [selStores, selGroups]);

  // Store universe re-scopes to the network size covered by the selected channels.
  const networkSize = channelNetworkSize(channels);

  const scopeLevels = [scopeL1, scopeL2, scopeL3, scopeL4].filter((lvl) => lvl.length);
  const scopeString = scopeLevels.map((lvl) => lvl.join(", ")).join(" › ");
  const storeString = storeScope === "all" ? `Full Network (${networkSize} stores)`
    : storeScope === "region" ? (selRegions.length ? `${selRegions.length} region group${selRegions.length > 1 ? "s" : ""}` : "—")
    : storeScope === "custom" ? (customStoreIds.length ? `${customStoreIds.length} store${customStoreIds.length > 1 ? "s" : ""} selected` : "—")
    : "—";
  const channelString = channels.length
    ? channels.map((id) => CHANNELS.find((c) => c.id === id)?.label).filter(Boolean).join(", ")
    : "—";

  // Store universe validity (now part of the scope screen)
  const storeValid = storeScope === "all"
    || (storeScope === "region" && selRegions.length > 0)
    || (storeScope === "custom" && customStoreIds.length > 0);
  // Merged scope screen: channel + Dept & Sub-Dept + a valid store universe
  const canProceed0 = channels.length > 0 && scopeL2.length > 0 && storeValid;
  const canLaunch   = canProceed0;

  // Brief animated "launching" state before handing off to wizard
  const handleLaunch = () => {
    setLaunching(true);
    // CSS animation plays; after it ends the onLaunch prop fires via onAnimationEnd
  };

  const summaryCells = [
    { label: "Channels",    value: channelString,       Icon: Radio,  step: 0 },
    { label: "Hierarchy",   value: scopeString || "—",  Icon: Layers, step: 0 },
    { label: "Store Scope", value: storeString,         Icon: Store,  step: 0 },
    { label: "Pipeline",    value: "Structure → Market → Commercial → Taste", Icon: Zap, step: null },
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
            Set the merchandising scope and execution context before the agent launches
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
        <div className="acs-scope-progress-fill" style={{ width: `${(subStep / (SCOPE_STEPS.length - 1)) * 100}%` }} />
      </div>

      {/* Step content — key triggers CSS re-animation */}
      <div className="acs-scope-body" key={animKey}>

        {/* ── Step 0: Scope & Execution Context (merged) ───────────────────── */}
        {subStep === 0 && (
          <div className="acs-scope-step acs-step-enter">
            <div className="acs-scope-step-title">
              <Text variant="heading" tone="strong">Merchandising Scope &amp; Execution Context</Text>
              <Text variant="caption" tone="muted">Pick the demand channel, drill the hierarchy to the sub-class, and set the store universe to cluster against.</Text>
            </div>

            {/* Demand channel & store universe */}
            <Card sx={{ ...softSx, marginBottom: 0 }}>
              <div className="acs-cfg-block-head">
                <span className="acs-cfg-block-badge">1</span>
                <div>
                  <Text variant="body-strong" tone="strong">Demand Channel &amp; Store Universe</Text>
                  <Text variant="micro" tone="muted" style={{ display: "block" }}>
                    Pick the sales signals to feed the algorithm. All stores in the selected channel run by default — or narrow down to specific regions or stores.
                  </Text>
                </div>
              </div>

              <div className="acs-cfg-grid">
                <div className="acs-cfg-field">
                  <FdSelect
                    label="Channels"
                    width="100%"
                    isMulti
                    isWithSelectAll
                    value={channels}
                    options={CHANNELS.map((c) => ({ value: c.id, label: c.label }))}
                    onChange={setChannels}
                  />
                  <Text variant="micro" tone="muted" className="acs-cfg-hint">
                    {channels.length
                      ? `${channels.length} channel${channels.length > 1 ? "s" : ""} blended into the demand signal.`
                      : "Select one or more channels to blend into the demand signal."}
                  </Text>
                </div>
                <div className="acs-cfg-field">
                  <FdSelect
                    label="Store Universe"
                    width="100%"
                    disabled={channels.length === 0}
                    placeholder={channels.length === 0 ? "Select a channel first" : "Select store universe…"}
                    value={channels.length === 0 ? "" : (storeScope || "")}
                    options={STORE_SCOPE_OPTIONS.map((o) => ({
                      value: o.id,
                      label: o.id === "all" ? `All Stores — Full Network (${networkSize})` : o.label,
                    }))}
                    onChange={setStoreScope}
                  />
                  <Text variant="micro" tone="muted" className="acs-cfg-hint">
                    {channels.length === 0
                      ? "Pick one or more channels to unlock the store universe."
                      : storeScope === "all"
                        ? (networkSize < 260
                            ? `Scoped to ${networkSize} ship-from-store nodes for the selected channel${channels.length > 1 ? "s" : ""}.`
                            : `Run clustering across the full ${networkSize}-store network.`)
                        : STORE_SCOPE_OPTIONS.find((o) => o.id === storeScope)?.desc}
                  </Text>
                </div>
              </div>

              {storeScope === "region" && (
                <div className="acs-cfg-field" style={{ marginTop: 16 }}>
                  <FdSelect
                    label="Region Groups"
                    width="100%"
                    isMulti
                    isWithSearch
                    isWithSelectAll
                    value={selRegions}
                    options={STORE_REGIONS.map((r) => ({ value: r, label: `${r} (${FD_STORES.filter((s) => s.region === r).length})` }))}
                    onChange={setSelRegions}
                  />
                  {selRegions.length > 0 && (
                    <Text variant="micro" tone="muted" className="acs-cfg-hint">
                      {FD_STORES.filter((s) => selRegions.includes(s.region)).length} stores across {selRegions.length} group{selRegions.length > 1 ? "s" : ""}.
                    </Text>
                  )}
                </div>
              )}

              {storeScope === "custom" && (
                <div className="acs-cfg-custom" style={{ marginTop: 16 }}>
                  <div className="acs-cfg-grid">
                    <div className="acs-cfg-field">
                      <FdSelect
                        label="Quick-add by Group"
                        width="100%"
                        isMulti
                        isWithSearch
                        isWithSelectAll
                        value={selGroups}
                        options={STORE_REGIONS.map((r) => ({ value: r, label: `${r} (${FD_STORES.filter((s) => s.region === r).length})` }))}
                        onChange={setSelGroups}
                      />
                    </div>
                    <div className="acs-cfg-field">
                      <FdSelect
                        label="Individual Stores"
                        width="100%"
                        isMulti
                        isWithSearch
                        value={selStores}
                        options={FD_STORES.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.state}` }))}
                        onChange={setSelStores}
                      />
                    </div>
                  </div>

                  {customStoreIds.length > 0 && (
                    <div className="acs-cfg-store-summary">
                      <span className="acs-cfg-store-count">
                        <CheckCircle2 size={13} style={{ marginRight: 5 }} />
                        {customStoreIds.length} store{customStoreIds.length > 1 ? "s" : ""} selected
                      </span>
                      <div className="acs-cfg-store-chips">
                        {customStoreIds.slice(0, 10).map((id) => {
                          const st = FD_STORES.find((s) => s.id === id);
                          return <span key={id} className="acs-cfg-store-chip">{st ? st.name : id}</span>;
                        })}
                        {customStoreIds.length > 10 && (
                          <span className="acs-cfg-store-chip acs-cfg-store-chip-more">+{customStoreIds.length - 10} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Merchandise hierarchy */}
            <Card sx={{ ...softSx, marginBottom: 0 }}>
              <div className="acs-cfg-block-head">
                <span className="acs-cfg-block-badge">2</span>
                <div>
                  <Text variant="body-strong" tone="strong">Merchandise Hierarchy</Text>
                  <Text variant="micro" tone="muted" style={{ display: "block" }}>
                    Each level unlocks the next. A minimum of Department &amp; Sub-Department is required.
                  </Text>
                </div>
              </div>

              <div className="acs-cfg-grid">
                <div className="acs-cfg-field">
                  <FdSelect
                    label="Department"
                    width="100%"
                    isMulti
                    isWithSearch
                    isWithSelectAll                    value={scopeL1}
                    options={SCOPE_HIERARCHY.l1.map((o) => ({ value: o, label: o }))}
                    onChange={setScopeL1}
                  />
                </div>
                <div className="acs-cfg-field">
                  <FdSelect
                    label="Sub-Department"
                    width="100%"
                    isMulti
                    isWithSearch
                    isWithSelectAll                    disabled={l2Options.length === 0}
                    value={scopeL2}
                    options={l2Options.map((o) => ({ value: o, label: o }))}
                    onChange={setScopeL2}
                  />
                </div>
                <div className="acs-cfg-field">
                  <FdSelect
                    label="Class (optional)"
                    width="100%"
                    isMulti
                    isWithSearch
                    isWithSelectAll                    disabled={l3Options.length === 0}
                    value={scopeL3}
                    options={l3Options.map((o) => ({ value: o, label: o }))}
                    onChange={setScopeL3}
                  />
                </div>
                <div className="acs-cfg-field">
                  <FdSelect
                    label="Sub-Class (optional)"
                    width="100%"
                    isMulti
                    isWithSearch
                    isWithSelectAll                    disabled={l4Options.length === 0}
                    value={scopeL4}
                    options={l4Options.map((o) => ({ value: o, label: o }))}
                    onChange={setScopeL4}
                  />
                </div>
              </div>

              {scopeString && (
                <div className="acs-cfg-crumb">
                  <span className="acs-scope-live-label">Scope:</span>
                  <ScopeCrumb scope={scopeString.replaceAll(" › ", " > ")} />
                </div>
              )}
            </Card>

            <div className="acs-scope-footer">
              <div />
              <Button variant="primary" size="large" onClick={() => advance()} disabled={!canProceed0}>
                Next: Review &amp; Launch →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Review & Launch ───────────────────────────────────────── */}
        {subStep === 1 && !launching && (
          <div className="acs-scope-step acs-step-enter">
            <div className="acs-scope-step-title">
              <Text variant="heading" tone="strong">Review Configuration</Text>
              <Text variant="caption" tone="muted">Confirm your setup, or jump back to any step to edit. The agent runs 4 sequential steps and you can finalize early at any step.</Text>
            </div>

            {/* Configuration summary — clean definition list, no boxes */}
            <Card sx={softSx}>
              <div className="acs-summary-head">
                <Text variant="body-strong" tone="strong">Configuration Summary</Text>
                <button className="acs-review-edit" onClick={() => goToStep(0)} title="Edit configuration">
                  <Pencil size={12} /> Edit
                </button>
              </div>
              <div className="acs-summary-list">
                {summaryCells.map((cell) => (
                  <div key={cell.label} className="acs-summary-row">
                    <div className="acs-summary-icon"><cell.Icon size={16} /></div>
                    <div className="acs-summary-label">{cell.label}</div>
                    <div className="acs-summary-value">{cell.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Agent pipeline — step cards with description + KPIs */}
            <Card sx={softSx}>
              <div className="acs-pipeline-head">
                <div>
                  <Text variant="body-strong" tone="strong">Agent Pipeline</Text>
                  <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 2 }}>
                    Four sequential lenses the agent scores stores against.
                  </Text>
                </div>
                <Badge variant="subtle" size="small" color="info" label="4 Steps" />
              </div>
              <div className="acs-pipeline-grid">
                {[
                  { n: 1, label: "Store Structure",  color: color.primary, Icon: LayoutDashboard, desc: "Groups stores by physical format and footprint.", kpis: ["Selling sq ft", "Store format", "Bay count", "Ceiling height"] },
                  { n: 2, label: "Market Context",   color: color.teal,    Icon: BarChart3,       desc: "Aligns trade-area demographics and housing stock.", kpis: ["Median HH income", "Owner-occupied %", "Housing age", "Pop. density"] },
                  { n: 3, label: "Commercial Scope", color: color.info,    Icon: DollarSign,      desc: "Weights commercial and contractor demand signals.", kpis: ["Sales velocity", "Pro vs DIY mix", "Contractor %", "Basket size"] },
                  { n: 4, label: "Product Profile",  color: color.accent,  Icon: Palette,         desc: "Matches style, finish and price-tier affinity.", kpis: ["SKU productivity", "Finish affinity", "Price-tier mix", "Attach rate"] },
                ].map((t, i, arr) => (
                  <React.Fragment key={t.n}>
                    <div className="acs-pipeline-card">
                      <div className="acs-pipeline-card-head">
                        <span className="acs-pipeline-medallion" style={{ "--acc": t.color }}>
                          <t.Icon size={18} strokeWidth={2} />
                        </span>
                        <div>
                          <Text variant="micro" tone="muted" style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 9, display: "block" }}>Step {t.n}</Text>
                          <Text variant="caption" style={{ fontWeight: 800 }}>{t.label}</Text>
                        </div>
                      </div>
                      <Text variant="micro" tone="muted" className="acs-pipeline-desc">{t.desc}</Text>
                      <div className="acs-pipeline-kpis">
                        {t.kpis.map((k) => (
                          <span key={k} className="acs-pipeline-kpi" style={{ "--acc": t.color }}>{k}</span>
                        ))}
                      </div>
                    </div>
                    {i < arr.length - 1 && <ChevronRight className="acs-pipeline-arrow" size={18} />}
                  </React.Fragment>
                ))}
              </div>
            </Card>

            <div className="acs-scope-footer">
              <Button variant="secondary" size="large" onClick={() => back()}>← Back</Button>
              <Button variant="primary" size="large" onClick={handleLaunch} disabled={!canLaunch}>
                Proceed to Step 1: Store Structure →
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
                Spinning up Step 1 · Store Structure analysis&nbsp;…
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
        <div className="acs-tier-running-label">
          <span className="acs-running-spinner" />
          <Text variant="body-strong" tone="strong">Running…</Text>
        </div>
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

/* ── Authoritative USA map geometry (shared by the Cluster Explorer map) ─────── */
const CLX_MAP_W = 720;
const CLX_MAP_H = 440;
const CLX_NON_CONTIGUOUS = new Set([
  "Alaska", "Hawaii", "Puerto Rico", "United States Virgin Islands",
  "Guam", "Commonwealth of the Northern Mariana Islands", "American Samoa",
]);
const CLX_STATE_ABBR = {
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
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};
const CLX_STATE_FEATURES = feature(usStatesTopology, usStatesTopology.objects.states).features
  .filter((f) => !CLX_NON_CONTIGUOUS.has(f.properties?.name));
const CLX_STATES_FC = { type: "FeatureCollection", features: CLX_STATE_FEATURES };
const CLX_PROJ = geoAlbers().fitExtent([[14, 14], [CLX_MAP_W - 14, CLX_MAP_H - 14]], CLX_STATES_FC);
const CLX_PATH = geoPath(CLX_PROJ);
const CLX_STATE_PATHS = CLX_STATE_FEATURES.map((f) => ({ name: f.properties?.name, d: CLX_PATH(f) }));
const CLX_STATE_CENTROID = {};
CLX_STATE_FEATURES.forEach((f) => {
  const ab = CLX_STATE_ABBR[f.properties?.name];
  if (ab) CLX_STATE_CENTROID[ab] = CLX_PATH.centroid(f);
});
// New store anchor — Billings, MT
const CLX_NEW_STORE = { name: "Billings, MT", pos: CLX_PROJ([-108.5007, 45.7833]) };

/* ══════════════════════════════════════════════════════════════════════════════
 * INTERACTIVE CLUSTER EXPLORER
 * A reusable results experience shared by all four tiers. Driven by
 * CLUSTER_EXPLORER_CONFIG[tierKey] + a synthesized per-store roster so cluster
 * KPIs, counts and dispersion recompute in real time on store reassignment.
 * ════════════════════════════════════════════════════════════════════════════ */

function clxFmt(v, format) {
  if (v == null || v === "") return "—";
  switch (format) {
    case "k":      return `${(v / 1000).toFixed(1)}k`;
    case "weeks":  return `${Math.round(v)}w`;
    case "usd":    return "$" + Math.round(v).toLocaleString();
    case "usd0":   return "$" + Math.round(v).toLocaleString();
    case "usd2":   return "$" + Number(v).toFixed(2);
    case "pct":    return `${Math.round(v)}%`;
    case "int":    return Math.round(v).toLocaleString();
    case "float2": return Number(v).toFixed(2);
    case "num1":   return Number(v).toFixed(1);
    case "year":   return String(Math.round(v));
    case "days":   return `${Math.round(v).toLocaleString()} d`;
    case "risk":   return `${Math.round(v)}/100`;
    case "text":   return String(v);
    default:       return String(v);
  }
}

function clxQuantiles(sorted) {
  if (!sorted.length) return null;
  const q = (p) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return [sorted[0], q(0.25), q(0.5), q(0.75), sorted[sorted.length - 1]];
}

/**
 * Membership + real-time aggregate model for one tier, resolved against the
 * metrics the user has actually selected (`selectedKeys`). Every selected metric
 * yields a table column + a store-level value; numeric metrics also produce
 * boxplot dispersion, categorical metrics produce per-cluster distribution shares.
 */
function useClusterModel(tierKey, selectedKeys) {
  const cfg = CLUSTER_EXPLORER_CONFIG[tierKey];
  const [stores, setStores] = useState(() => buildClusterRosters(tierKey));

  useEffect(() => { setStores(buildClusterRosters(tierKey)); }, [tierKey]);

  const reassign = useCallback((storeId, toClusterId) => {
    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, clusterId: toClusterId } : s)));
  }, []);

  const reassignMany = useCallback((moves) => {
    // moves: { [storeId]: toClusterId }
    setStores((prev) => prev.map((s) => (moves[s.id] ? { ...s, clusterId: moves[s.id] } : s)));
  }, []);

  // Resolve selected metric keys → descriptors (skip any without a registry entry).
  const metrics = useMemo(() => {
    const keys = Array.isArray(selectedKeys) ? selectedKeys : [];
    return keys
      .map((key) => { const m = getClxMetric(tierKey, key); return m ? { key, ...m } : null; })
      .filter(Boolean);
  }, [tierKey, selectedKeys]);

  const numericMetrics = useMemo(() => metrics.filter((m) => m.kind === "numeric"), [metrics]);
  const categoricalMetrics = useMemo(() => metrics.filter((m) => m.kind === "categorical"), [metrics]);

  const clusters = useMemo(() => {
    return cfg.clusters.map((cl) => {
      const members = stores.filter((s) => s.clusterId === cl.id);
      const kpis = {};
      metrics.forEach((m) => {
        if (m.kind === "numeric") {
          const vals = members.map((x) => x[m.key]).filter((x) => typeof x === "number");
          kpis[m.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        } else {
          const counts = {};
          members.forEach((x) => { const v = x[m.key]; if (v != null) counts[v] = (counts[v] || 0) + 1; });
          let best = null, bestN = -1;
          Object.entries(counts).forEach(([k, n]) => { if (n > bestN) { best = k; bestN = n; } });
          kpis[m.key] = best;
        }
      });
      return { ...cl, count: members.length, members, kpis };
    });
  }, [stores, cfg, metrics]);

  // Numeric → boxplot quantiles per cluster.
  const dispersion = useMemo(() => {
    const out = {};
    numericMetrics.forEach((m) => {
      out[m.key] = clusters.map((cl) => {
        const vals = cl.members.map((x) => x[m.key]).filter((x) => typeof x === "number").sort((a, b) => a - b);
        return { id: cl.id, label: cl.label, color: cl.color, box: clxQuantiles(vals) };
      });
    });
    return out;
  }, [clusters, numericMetrics]);

  // Categorical → per-cluster category share (%) so stacked bars recompute live.
  const distribution = useMemo(() => {
    const out = {};
    categoricalMetrics.forEach((m) => {
      out[m.key] = clusters.map((cl) => {
        const counts = {};
        cl.members.forEach((x) => { const v = x[m.key]; if (v != null) counts[v] = (counts[v] || 0) + 1; });
        const total = cl.members.length || 1;
        const shares = {};
        m.categories.forEach((c) => { shares[c] = ((counts[c] || 0) / total) * 100; });
        return { id: cl.id, label: cl.label, color: cl.color, shares };
      });
    });
    return out;
  }, [clusters, categoricalMetrics]);

  return { cfg, tierKey, stores, clusters, metrics, numericMetrics, categoricalMetrics, dispersion, distribution, reassign, reassignMany };
}

/** Highcharts horizontal boxplot with per-cluster colors + selection emphasis. */
function DispersionBox({ rows, format, selectedClusterId, onSelect }) {
  const selRef = useRef(selectedClusterId);
  selRef.current = selectedClusterId;
  const onSelRef = useRef(onSelect);
  onSelRef.current = onSelect;

  const options = useMemo(() => {
    const hasSel = selectedClusterId != null;
    const data = rows.map((r) => {
      const dim = hasSel && r.id !== selectedClusterId;
      const box = r.box || [null, null, null, null, null];
      return {
        clusterId: r.id,
        clusterLabel: r.label || r.id,
        dotColor: r.color,
        low: box[0], q1: box[1], median: box[2], q3: box[3], high: box[4],
        color: dim ? `${r.color}55` : r.color,
        fillColor: dim ? `${r.color}12` : `${r.color}2E`,
        medianColor: dim ? `${r.color}77` : r.color,
        stemColor: dim ? `${r.color}55` : r.color,
        whiskerColor: dim ? `${r.color}55` : r.color,
      };
    });
    return {
      chart: { type: "boxplot", inverted: true, backgroundColor: "transparent", height: rows.length * 46 + 54, spacing: [8, 8, 8, 8] },
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: rows.map((r) => r.id),
        lineColor: "#E2E8F0",
        labels: { style: { fontWeight: "700", color: "#334155", fontSize: "11px" } },
        tickLength: 0,
      },
      yAxis: {
        title: { text: null },
        gridLineColor: "#EEF2F7",
        labels: { formatter() { return clxFmt(this.value, format); }, style: { color: "#94A3B8", fontSize: "10px" } },
      },
      tooltip: {
        useHTML: true,
        headerFormat: "",
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#E2E8F0",
        borderRadius: 14,
        borderWidth: 1,
        shadow: false,
        padding: 0,
        pointFormatter() {
          const row = (label, val, opts = {}) => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;padding:3px 0;${opts.border ? "border-top:1px solid #F1F5F9;margin-top:2px;padding-top:6px;" : ""}">
              <span style="font-size:10.5px;color:#94A3B8;font-weight:600;letter-spacing:.02em;">${label}</span>
              <span style="font-size:12px;color:${opts.strong ? "#0F172A" : "#334155"};font-weight:${opts.strong ? 800 : 700};font-variant-numeric:tabular-nums;">${val}</span>
            </div>`;
          return `
            <div style="min-width:184px;padding:11px 13px 10px;font-family:inherit;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="width:9px;height:9px;border-radius:3px;background:${this.dotColor};box-shadow:0 0 0 3px ${this.dotColor}22;flex:none;"></span>
                <span style="font-weight:800;color:#0F172A;font-size:12.5px;">${this.clusterLabel}</span>
                <span style="margin-left:auto;font-size:9.5px;font-weight:700;color:#94A3B8;background:#F1F5F9;border-radius:5px;padding:2px 6px;">${this.clusterId}</span>
              </div>
              ${row("Max", clxFmt(this.high, format))}
              ${row("Q3", clxFmt(this.q3, format))}
              ${row("Median", clxFmt(this.median, format), { strong: true })}
              ${row("Q1", clxFmt(this.q1, format))}
              ${row("Min", clxFmt(this.low, format), { border: true })}
            </div>`;
        },
      },
      plotOptions: {
        boxplot: { lineWidth: 1.5, whiskerLength: "55%", whiskerWidth: 1.5, medianWidth: 3 },
        series: {
          cursor: "pointer",
          animation: { duration: 320 },
          point: { events: { click() { const id = this.clusterId ?? (this.options && this.options.clusterId); if (id != null && onSelRef.current) onSelRef.current(id); } } },
        },
      },
      series: [{ name: "Distribution", data }],
    };
  }, [rows, format, selectedClusterId]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

// Category palette for the stacked distribution bars.
const CLX_CAT_PALETTE = ["#2563EB", "#0EA5E9", "#14B8A6", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];

/** Highcharts stacked horizontal bar: per-cluster category share; selection emphasis + click-to-select. */
function CategoryDistribution({ rows, categories, selectedClusterId, onSelect }) {
  const onSelRef = useRef(onSelect);
  onSelRef.current = onSelect;

  const options = useMemo(() => {
    const hasSel = selectedClusterId != null;
    const catColor = (i) => CLX_CAT_PALETTE[i % CLX_CAT_PALETTE.length];
    const series = categories.map((cat, i) => ({
      name: cat,
      data: rows.map((r) => {
        const dim = hasSel && r.id !== selectedClusterId;
        const base = catColor(i);
        return { y: r.shares[cat] || 0, clusterId: r.id, color: dim ? `${base}33` : base };
      }),
    }));
    return {
      chart: { type: "bar", backgroundColor: "transparent", height: rows.length * 46 + 64, spacing: [8, 8, 8, 8] },
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: true, itemStyle: { fontSize: "10px", fontWeight: "600", color: "#475569" }, symbolRadius: 3, itemDistance: 12 },
      xAxis: {
        categories: rows.map((r) => r.id),
        lineColor: "#E2E8F0",
        labels: { style: { fontWeight: "700", color: "#334155", fontSize: "11px" } },
        tickLength: 0,
      },
      yAxis: {
        min: 0, max: 100, reversedStacks: false,
        title: { text: null },
        gridLineColor: "#EEF2F7",
        labels: { formatter() { return `${this.value}%`; }, style: { color: "#94A3B8", fontSize: "10px" } },
      },
      tooltip: {
        useHTML: true, headerFormat: "",
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#E2E8F0", borderRadius: 12, borderWidth: 1, shadow: false, padding: 0,
        pointFormatter() {
          const base = CLX_CAT_PALETTE[this.series.index % CLX_CAT_PALETTE.length];
          return `
            <div style="min-width:150px;padding:9px 12px;font-family:inherit;">
              <div style="font-size:9.5px;font-weight:700;color:#94A3B8;letter-spacing:.04em;text-transform:uppercase;margin-bottom:5px;">Cluster ${this.clusterId}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                <span style="display:flex;align-items:center;gap:7px;font-size:12px;color:#334155;font-weight:600;">
                  <span style="width:9px;height:9px;border-radius:3px;background:${base};flex:none;"></span>${this.series.name}
                </span>
                <span style="font-size:13px;font-weight:800;color:#0F172A;font-variant-numeric:tabular-nums;">${Math.round(this.y)}%</span>
              </div>
            </div>`;
        },
      },
      plotOptions: {
        series: {
          stacking: "percent",
          borderWidth: 0,
          animation: { duration: 320 },
          cursor: "pointer",
          point: { events: { click() { const id = this.clusterId; if (id != null && onSelRef.current) onSelRef.current(id); } } },
        },
      },
      series,
    };
  }, [rows, categories, selectedClusterId]);

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function PremiumDispersion({ model, selectedClusterId, onSelect }) {
  const { metrics, dispersion, distribution } = model;
  if (!metrics.length) {
    return (
      <Card sx={{ ...panelSx }}>
        <div className="acs-clx-empty">
          <BarChart3 size={22} />
          <Text variant="body-strong" tone="strong">No clustering metrics selected</Text>
          <Text variant="micro" tone="muted">Add metrics in the configuration to see their distribution across clusters.</Text>
        </div>
      </Card>
    );
  }
  return (
    <div className="acs-clx-disp-grid">
      {metrics.map((m) => (
        <Card key={m.key} sx={{ ...panelSx }}>
          <div className="acs-clx-disp-head">
            <Text variant="body-strong" tone="strong">{m.label} {m.kind === "categorical" ? "Mix" : "Distribution"}</Text>
            <Badge variant="subtle" size="small" color="neutral" label={m.kind === "categorical" ? "Share by cluster" : "Click a box to inspect"} />
          </div>
          {m.kind === "categorical"
            ? <CategoryDistribution rows={distribution[m.key]} categories={m.categories} selectedClusterId={selectedClusterId} onSelect={onSelect} />
            : <DispersionBox rows={dispersion[m.key]} format={m.format} selectedClusterId={selectedClusterId} onSelect={onSelect} />}
        </Card>
      ))}
    </div>
  );
}

// Diverging blue→white→red colormap for the relative-signal heatmap (RdBu-style).
function clxHeatColor(z) {
  const t = Math.max(0, Math.min(1, (z + 1.6) / 3.2));
  const stops = [
    [0.0, [33, 102, 172]],   // blue (below average)
    [0.5, [247, 247, 247]],  // white (average)
    [1.0, [178, 24, 43]],    // red (above average)
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const lt = (t - a[0]) / ((b[0] - a[0]) || 1);
  const rgb = a[1].map((c, i) => Math.round(c + (b[1][i] - c) * lt));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
function clxHeatText(z) {
  // white text on the deeper (saturated) cells, dark text near the neutral middle
  return Math.abs(z) > 0.85 ? "#F8FAFC" : "#334155";
}

/**
 * ClusterHeatmap — relative-signal matrix: clusters (rows) × selected numeric
 * metrics (columns), colored by each cluster's z-score vs. the cross-cluster mean.
 * Only meaningful with ≥2 numeric metrics and ≥2 clusters (categorical-only steps skip it).
 */
function ClusterHeatmap({ model, selectedClusterId, onSelect }) {
  const { clusters, numericMetrics } = model;

  const grid = useMemo(() => {
    return numericMetrics.map((m) => {
      const means = clusters.map((cl) => (typeof cl.kpis[m.key] === "number" ? cl.kpis[m.key] : null));
      const valid = means.filter((v) => v != null);
      const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
      const std = valid.length ? (Math.sqrt(valid.reduce((a, b) => a + (b - avg) ** 2, 0) / valid.length) || 1) : 1;
      const cells = clusters.map((cl, i) => {
        const v = means[i];
        const z = v == null ? 0 : (v - avg) / std;
        return { clusterId: cl.id, value: v, z: Math.max(-1.6, Math.min(1.6, z)) };
      });
      return { key: m.key, label: m.label, format: m.format, cells };
    });
  }, [clusters, numericMetrics]);

  if (numericMetrics.length < 2 || clusters.length < 2) return null;
  const hasSel = selectedClusterId != null;

  return (
    <Card sx={{ ...panelSx, padding: 0 }}>
      <div className="acs-section-header">
        <div>
          <Text variant="body-strong" tone="strong">Relative Signal Heatmap</Text>
          <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>
            How each cluster over- / under-indexes on the selected metrics (z-score vs. network mean)
          </Text>
        </div>
        <Badge variant="subtle" size="small" color="neutral" label="Click a row to inspect" />
      </div>

      <div className="acs-clx-heatmap-wrap">
        <div
          className="acs-clx-heatmap"
          style={{ gridTemplateColumns: `minmax(140px, 190px) repeat(${numericMetrics.length}, minmax(72px, 1fr))` }}
        >
          {/* Header row */}
          <div className="acs-clx-heat-corner">Cluster</div>
          {grid.map((col) => (
            <div key={col.key} className="acs-clx-heat-colhead" title={col.label}>{col.label}</div>
          ))}

          {/* Data rows */}
          {clusters.map((cl, ri) => {
            const dim = hasSel && cl.id !== selectedClusterId;
            return (
              <React.Fragment key={cl.id}>
                <div
                  className={`acs-clx-heat-rowhead${selectedClusterId === cl.id ? " is-selected" : ""}${dim ? " is-dim" : ""}`}
                  onClick={() => onSelect(cl.id)}
                >
                  <span className="acs-family-badge sm" style={{ background: cl.color }}>{cl.id}</span>
                  <span className="acs-clx-heat-rowlabel">{cl.label}</span>
                </div>
                {grid.map((col) => {
                  const cell = col.cells[ri];
                  const sign = cell.z > 0 ? "+" : "";
                  return (
                    <div
                      key={col.key}
                      className={`acs-clx-heat-cell${dim ? " is-dim" : ""}`}
                      style={{ background: clxHeatColor(cell.z), color: clxHeatText(cell.z) }}
                      onClick={() => onSelect(cl.id)}
                      title={`${cl.label} · ${col.label}: ${clxFmt(cell.value, col.format)}  (${sign}${cell.z.toFixed(2)}σ)`}
                    >
                      {sign}{cell.z.toFixed(1)}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* Legend */}
        <div className="acs-clx-heat-legend">
          <span className="acs-clx-heat-legend-lbl">Below avg</span>
          <span className="acs-clx-heat-legend-bar" />
          <span className="acs-clx-heat-legend-lbl">Above avg</span>
        </div>
      </div>
    </Card>
  );
}

/** Deterministic [0,1) jitter from a store id + salt (keeps dots stable per render). */
function clxJit(str, salt) {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/** USA map: every roster store as a cluster-colored dot + the new store; selected cluster is emphasized. */
function ClusterUSMap({ model, selectedClusterId, onSelect }) {
  const { clusters, stores } = model;
  const [expanded, setExpanded] = useState(false);
  const colorById = useMemo(() => Object.fromEntries(clusters.map((c) => [c.id, c.color])), [clusters]);

  const dots = useMemo(() => {
    const list = stores.map((s) => {
      const base = CLX_STATE_CENTROID[s.state];
      if (!base) return null;
      return {
        id: s.id,
        name: s.name,
        clusterId: s.clusterId,
        color: colorById[s.clusterId] || "#94a3b8",
        x: base[0] + (clxJit(s.id, 7) - 0.5) * 48,
        y: base[1] + (clxJit(s.id, 131) - 0.5) * 40,
      };
    }).filter(Boolean);
    // Render selected-cluster dots last so they sit on top.
    if (selectedClusterId != null) {
      list.sort((a, b) => (a.clusterId === selectedClusterId ? 1 : 0) - (b.clusterId === selectedClusterId ? 1 : 0));
    }
    return list;
  }, [stores, colorById, selectedClusterId]);

  const hasSel = selectedClusterId != null;
  const selCluster = clusters.find((c) => c.id === selectedClusterId);
  const newPos = CLX_NEW_STORE.pos;

  // Close on Escape while expanded.
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const subtitle = `${stores.length.toLocaleString()} stores${hasSel ? ` · highlighting ${selCluster?.count || 0} in ${selCluster?.label}` : " · select a cluster to highlight its stores"}`;

  const legend = (
    <div className="acs-clx-map-legend">
      {clusters.map((c) => (
        <button
          key={c.id}
          className={`acs-clx-map-legend-item${selectedClusterId === c.id ? " is-active" : ""}`}
          onClick={() => onSelect(selectedClusterId === c.id ? null : c.id)}
        >
          <span className="acs-clx-map-legend-dot" style={{ background: c.color }} />
          {c.id} · {c.count}
        </button>
      ))}
      <span className="acs-clx-map-legend-item is-new"><span className="acs-clx-map-legend-dot" style={{ background: "#F59E0B" }} /> {CLX_NEW_STORE.name} · New</span>
    </div>
  );

  const svg = (
    <svg viewBox={`0 0 ${CLX_MAP_W} ${CLX_MAP_H}`} className="acs-clx-map-svg" role="img" aria-label="US store network by cluster">
      <g>
        {CLX_STATE_PATHS.map((s) => (
          <path key={s.name} d={s.d} fill="#F1F5F9" stroke="#CBD5E1" strokeWidth={0.6} />
        ))}
      </g>
      <g>
        {dots.map((d) => {
          const inSel = !hasSel || d.clusterId === selectedClusterId;
          return (
            <circle
              key={d.id}
              cx={d.x}
              cy={d.y}
              r={hasSel && d.clusterId === selectedClusterId ? 4.4 : 3}
              fill={d.color}
              fillOpacity={inSel ? 0.92 : 0.13}
              stroke={hasSel && d.clusterId === selectedClusterId ? "#fff" : "none"}
              strokeWidth={hasSel && d.clusterId === selectedClusterId ? 1.2 : 0}
              style={{ cursor: "pointer", transition: "r .15s, fill-opacity .15s" }}
              onClick={() => onSelect(d.clusterId)}
            >
              <title>{d.name}</title>
            </circle>
          );
        })}
      </g>
      {newPos && (
        <g transform={`translate(${newPos[0]}, ${newPos[1]})`}>
          <circle r={11} fill="#F59E0B" fillOpacity={0.18}>
            <animate attributeName="r" values="8;15;8" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.28;0.05;0.28" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle r={5} fill="#F59E0B" stroke="#fff" strokeWidth={1.6} />
          <text x={9} y={4} fontSize={11} fontWeight={800} fill="#B45309">{CLX_NEW_STORE.name}</text>
        </g>
      )}
    </svg>
  );

  return (
    <>
      <Card sx={{ ...panelSx, padding: 0 }}>
        <div className="acs-section-header">
          <div>
            <Text variant="body-strong" tone="strong">Store Network — Continental USA</Text>
            <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>{subtitle}</Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {hasSel && <Button variant="secondary" size="small" onClick={() => onSelect(null)}>Clear highlight</Button>}
            <Button variant="secondary" size="small" onClick={() => setExpanded(true)}>
              <Maximize2 size={14} style={{ marginRight: 5 }} /> Expand
            </Button>
          </div>
        </div>
        {legend}
        <div className="acs-clx-map-body">{svg}</div>
      </Card>

      {expanded && createPortal(
        <div className="acs-clx-map-modal-scrim" onClick={() => setExpanded(false)}>
          <div className="acs-clx-map-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Expanded store map">
            <div className="acs-clx-map-modal-head">
              <div>
                <Text variant="body-strong" tone="strong">Store Network — Continental USA</Text>
                <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>{subtitle}</Text>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {hasSel && <Button variant="secondary" size="small" onClick={() => onSelect(null)}>Clear highlight</Button>}
                <button className="acs-clx-panel-close" onClick={() => setExpanded(false)} aria-label="Close"><X size={16} /></button>
              </div>
            </div>
            {legend}
            <div className="acs-clx-map-modal-body">{svg}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Clusters as rows, selected KPIs as columns; selectable + cross-highlighting. */
function ClusterSummaryTable({ model, selectedClusterId, onSelect }) {
  const { cfg, clusters, metrics } = model;
  const totalStores = clusters.reduce((a, c) => a + c.count, 0);
  const fmtCell = (m, val) => (m.kind === "categorical" ? (val ?? "—") : clxFmt(val, m.format));
  return (
    <Card sx={{ ...panelSx, padding: 0 }}>
      <div className="acs-section-header">
        <div>
          <Text variant="body-strong" tone="strong">Cluster Summary</Text>
          <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>
            {clusters.length} clusters · {totalStores.toLocaleString()} stores · select a cluster to inspect &amp; reassign
          </Text>
        </div>
        <Badge variant="subtle" size="small" color="neutral" label={`${clusters.length} ${cfg.countLabel}`} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="acs-table acs-clx-table">
          <thead>
            <tr>
              <th>Cluster</th>
              <th>Stores</th>
              {metrics.map((m) => <th key={m.key}>{m.label}</th>)}
              <th aria-label="inspect" />
            </tr>
          </thead>
          <tbody>
            {clusters.map((cl) => (
              <tr
                key={cl.id}
                className={`acs-clx-row${selectedClusterId === cl.id ? " is-selected" : ""}`}
                onClick={() => onSelect(cl.id)}
              >
                <td>
                  <span className="acs-clx-cluster-cell">
                    <span className="acs-family-badge" style={{ background: cl.color }}>{cl.id}</span>
                    <span className="acs-clx-cluster-meta">
                      <Text variant="caption" style={{ fontWeight: 700 }}>{cl.label}</Text>
                      {cl.blurb && (
                        <span className="acs-clx-cluster-blurb">
                          <Sparkles size={10} /> {cl.blurb}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td><Text variant="micro" mono style={{ fontWeight: 800 }}>{cl.count}</Text></td>
                {metrics.map((m) => (
                  <td key={m.key}><Text variant="micro" mono>{fmtCell(m, cl.kpis[m.key])}</Text></td>
                ))}
                <td>
                  <span className="acs-clx-row-inspect"><Users size={13} /> View stores <ChevronRight size={13} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Right slide-over: cluster KPIs, Cluster Insights, per-store attributes + staged reassignment. */
function ClusterStorePanel({ open, model, clusterId, onClose, onReassignMany }) {
  const { clusters, metrics } = model;
  const cluster = clusters.find((c) => c.id === clusterId);
  const fmtVal = (m, v) => (m.kind === "categorical" ? (v ?? "—") : clxFmt(v, m.format));

  const [pending, setPending] = useState({});   // { storeId: toClusterId }
  const [applying, setApplying] = useState(false);

  // Reset staged moves whenever the inspected cluster changes.
  useEffect(() => { setPending({}); setApplying(false); }, [clusterId]);

  const pendingCount = Object.keys(pending).length;

  const stageMove = (storeId, toId) => {
    setPending((prev) => {
      const next = { ...prev };
      if (!toId) delete next[storeId];
      else next[storeId] = toId;
      return next;
    });
  };

  const applyChanges = () => {
    if (!pendingCount) return;
    setApplying(true);
    const moves = pending;
    setTimeout(() => {
      onReassignMany(moves);
      setPending({});
      setApplying(false);
    }, 950);
  };

  return (
    <>
      <div className={`acs-clx-panel-scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`acs-clx-panel${open ? " open" : ""}`} role="dialog" aria-label="Cluster detail">
        {cluster && (
          <>
            <div className="acs-clx-panel-head" style={{ borderTopColor: cluster.color }}>
              <div className="acs-clx-panel-title">
                <span className="acs-family-badge lg" style={{ background: cluster.color }}>{cluster.id}</span>
                <div style={{ minWidth: 0 }}>
                  <Text variant="body-strong" tone="strong" style={{ display: "block" }}>{cluster.label}</Text>
                  {cluster.blurb && (
                    <span className="acs-clx-cluster-blurb" style={{ marginTop: 3 }}>
                      <Sparkles size={10} /> {cluster.blurb}
                    </span>
                  )}
                  <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 3 }}>{cluster.count} store{cluster.count === 1 ? "" : "s"} in this cluster</Text>
                </div>
              </div>
              <button className="acs-clx-panel-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </div>

            <div className="acs-clx-panel-body">
              {/* KPI chips */}
              <div className="acs-clx-panel-kpis">
                {metrics.length === 0 && (
                  <Text variant="micro" tone="muted">No metrics selected for this step.</Text>
                )}
                {metrics.map((m) => (
                  <div key={m.key} className="acs-clx-panel-kpi">
                    <span className="acs-clx-panel-kpi-label">{m.label}{m.kind === "categorical" ? " (modal)" : ""}</span>
                    <span className="acs-clx-panel-kpi-val">{fmtVal(m, cluster.kpis[m.key])}</span>
                  </div>
                ))}
              </div>

              {/* Cluster Insights */}
              <div className="acs-clx-insight" style={{ borderLeftColor: cluster.color }}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 9, display: "block", marginBottom: 4 }}>
                  Insights for Selected Cluster
                </Text>
                <Text variant="micro" style={{ lineHeight: 1.6 }}>{cluster.insight || "No additional insight for this cluster."}</Text>
              </div>

              {/* Store list — every store with all clustering attributes + move control */}
              <div className="acs-clx-store-head">
                <Text variant="micro" tone="subtle" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 9 }}>
                  Member Stores ({cluster.count})
                </Text>
                <Text variant="micro" tone="muted">Attributes used in clustering</Text>
              </div>

              <div className={`acs-clx-store-list${applying ? " is-applying" : ""}`}>
                {applying && (
                  <div className="acs-clx-apply-overlay">
                    <span className="acs-running-spinner" />
                    <Text variant="micro" style={{ fontWeight: 700 }}>Reassigning &amp; recomputing…</Text>
                  </div>
                )}
                {cluster.members.length === 0 && (
                  <div className="acs-clx-store-empty">No stores remain in this cluster.</div>
                )}
                {cluster.members.map((s) => {
                  const staged = pending[s.id];
                  return (
                    <div key={s.id} className={`acs-clx-store-row${staged ? " is-staged" : ""}`}>
                      <div className="acs-clx-store-top">
                        <div className="acs-clx-store-main">
                          <Text variant="micro" style={{ fontWeight: 700 }}>{s.name}</Text>
                          <Text variant="micro" tone="muted">#{s.storeNo}</Text>
                        </div>
                        <div className="acs-clx-store-move">
                          <ArrowLeftRight size={13} className="acs-clx-move-ico" />
                          <FdSelect
                            width={210}
                            placeholder="Move to…"
                            value={staged || ""}
                            disabled={applying}
                            options={clusters.filter((c) => c.id !== cluster.id).map((c) => ({ value: c.id, label: `${c.id} · ${c.label}` }))}
                            onChange={(v) => stageMove(s.id, v)}
                          />
                        </div>
                      </div>
                      {/* Per-store clustering attribute values */}
                      <div className="acs-clx-store-attrs">
                        {metrics.map((m) => (
                          <span key={m.key} className="acs-clx-store-attr">
                            <span className="acs-clx-store-attr-k">{m.label}</span>
                            <span className="acs-clx-store-attr-v">{fmtVal(m, s[m.key])}</span>
                          </span>
                        ))}
                      </div>
                      {staged && (
                        <div className="acs-clx-store-staged">
                          <ArrowLeftRight size={11} /> Staged → move to <strong>{staged}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky apply bar */}
            {pendingCount > 0 && (
              <div className="acs-clx-panel-foot">
                <Text variant="micro" tone="muted">{pendingCount} store{pendingCount === 1 ? "" : "s"} staged to move</Text>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="secondary" size="small" disabled={applying} onClick={() => setPending({})}>Discard</Button>
                  <Button variant="primary" size="small" disabled={applying} onClick={applyChanges}>
                    {applying ? "Applying…" : `Apply Changes (${pendingCount})`}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}

/** Orchestrator: run gating, config collapse + edit, and the interactive results. */
function ClusterExplorer({ tierKey, tierLabel, configCard, configSummary, insightText, insightType = "info", selectedKeys }) {
  const model = useClusterModel(tierKey, selectedKeys);
  const [runState, setRunState] = useState("idle"); // idle | running | results
  const [logLines, setLogLines] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const logs = TIER_WORK_LOGS[tierKey] || [];

  const startRun = useCallback(() => {
    setRunState("running");
    setLogLines([]);
    setSelectedClusterId(null);
    setPanelOpen(false);
    logs.forEach((line) => {
      setTimeout(() => setLogLines((prev) => [...prev, line]), Math.round(line.t * 1000));
    });
    const total = logs.length ? Math.round(logs[logs.length - 1].t * 1000) + 700 : 2000;
    setTimeout(() => setRunState("results"), total);
  }, [logs]);

  // Auto-load: whenever a step screen opens, kick off the clustering run once
  // so the user lands directly on the streaming computation → results.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    startRun();
  }, [startRun]);

  const selectCluster = (id) => {
    if (id == null) { setSelectedClusterId(null); setPanelOpen(false); return; }
    setSelectedClusterId(id);
    setPanelOpen(true);
  };
  const editConfig = () => { setRunState("idle"); setSelectedClusterId(null); setPanelOpen(false); };

  return (
    <div className="acs-clx">
      {/* Config: full card while idle, collapsed summary bar in results */}
      {runState !== "results" ? (
        configCard
      ) : (
        <div className="acs-clx-config-bar">
          <div className="acs-clx-config-bar-main">
            <span className="acs-clx-config-done"><CheckCircle2 size={13} /> Clustering complete</span>
            <div className="acs-clx-config-chips">
              {(configSummary || []).map((c) => <span key={c} className="acs-clx-config-chip">{c}</span>)}
            </div>
          </div>
          <Button variant="secondary" size="small" onClick={editConfig}>
            <Pencil size={13} style={{ marginRight: 5 }} /> Edit configuration
          </Button>
        </div>
      )}

      {/* Run CTA */}
      {runState === "idle" && (
        <div className="acs-tier-idle-cta">
          <Button variant="primary" size="large" onClick={startRun}>
            <Zap size={16} style={{ marginRight: 6 }} /> Run
          </Button>
        </div>
      )}

      {/* Running terminal */}
      {runState === "running" && (
        <div className="acs-tier-running">
          <div className="acs-tier-running-label">
            <span className="acs-running-spinner" />
            <Text variant="body-strong" tone="strong">Running…</Text>
          </div>
          <div className="acs-skeleton-grid">
            <div className="acs-skeleton-card"><div className="acs-skeleton-shimmer" style={{ height: 140 }} /></div>
            <div className="acs-skeleton-card"><div className="acs-skeleton-shimmer" style={{ height: 140 }} /></div>
          </div>
          <div className="acs-work-terminal">
            <div className="acs-work-terminal-header">
              <span className="acs-work-terminal-dot red" />
              <span className="acs-work-terminal-dot yellow" />
              <span className="acs-work-terminal-dot green" />
              <span className="acs-work-terminal-title"><Cpu size={11} style={{ marginRight: 4 }} /> AGENT · {tierLabel} COMPUTATION ENGINE</span>
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
      )}

      {/* Interactive results */}
      {runState === "results" && (
        <>
          <div className="acs-clx-results acs-tier-results revealed">
            <ClusterUSMap model={model} selectedClusterId={selectedClusterId} onSelect={selectCluster} />
            <PremiumDispersion model={model} selectedClusterId={selectedClusterId} onSelect={selectCluster} />
            <ClusterHeatmap model={model} selectedClusterId={selectedClusterId} onSelect={selectCluster} />
            <ClusterSummaryTable model={model} selectedClusterId={selectedClusterId} onSelect={selectCluster} />
            {insightText && <AgentInsight text={insightText} type={insightType} />}
          </div>
          {/* Panel kept outside the transformed .acs-tier-results so position:fixed anchors to the viewport */}
          <ClusterStorePanel open={panelOpen} model={model} clusterId={selectedClusterId} onClose={() => setPanelOpen(false)} onReassignMany={model.reassignMany} />
        </>
      )}
    </div>
  );
}

function Step0_Tier1A({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier1aMetrics.includes(key) ? d.tier1aMetrics.filter((k) => k !== key) : [...d.tier1aMetrics, key];
    return { ...d, tier1aMetrics: metrics, useAgentTier1a: false };
  });

  const configSummary = TIER1A_METRICS.filter((m) => draft.tier1aMetrics.includes(m.key)).map((m) => m.label);

  const metricCard = (
    <Card sx={{ ...panelSx, padding: 0 }}>
      <div className="acs-section-header">
        <Text variant="body-strong" tone="strong">Clustering Metrics</Text>
      </div>
      <div className="acs-metric-grid" style={{ padding: 16 }}>
        {TIER1A_METRICS.map((m) => (
          <MetricToggle key={m.key} metric={m} active={draft.tier1aMetrics.includes(m.key)} onToggle={toggleMetric} />
        ))}
      </div>
    </Card>
  );

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge">Step 1</div>
        <Text variant="title" tone="strong">Store Structure</Text>
        <Text variant="caption" tone="muted">Group stores purely by physical footprint, store maturity, and DC supply chain routing.</Text>
      </div>

      <ClusterExplorer
        tierKey="1A"
        tierLabel="Store Structure"
        configCard={metricCard}
        configSummary={configSummary}
        selectedKeys={draft.tier1aMetrics}
        insightText={TIER1A_MICRO_INSIGHT}
      />

      <WizardFooter tierLabel="Step 1 (Store Structure)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Step 2: Market Context →" />
    </div>
  );
}

function Step1_Tier1B({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier1bMetrics.includes(key) ? d.tier1bMetrics.filter((k) => k !== key) : [...d.tier1bMetrics, key];
    return { ...d, tier1bMetrics: metrics, useAgentTier1b: false };
  });

  const configSummary = TIER1B_METRICS.filter((m) => draft.tier1bMetrics.includes(m.key)).map((m) => m.label);

  const metricCard = (
    <Card sx={{ ...panelSx, padding: 0 }}>
      <div className="acs-section-header">
        <div>
          <Text variant="body-strong" tone="strong">Trade Area &amp; Metrics</Text>
          <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>
            Catchment Radius: <strong>30-Mile ZCTA Centroid Radius</strong>
          </Text>
        </div>
      </div>
      <div className="acs-metric-grid" style={{ padding: 16 }}>
        {TIER1B_METRICS.map((m) => (
          <MetricToggle key={m.key} metric={m} active={draft.tier1bMetrics.includes(m.key)} onToggle={toggleMetric} />
        ))}
      </div>
    </Card>
  );

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: LABEL_COLORS.market.M3 }}>Step 2</div>
        <Text variant="title" tone="strong">External Market Context</Text>
        <Text variant="caption" tone="muted">Map 30-mile ZCTA catchment trade areas using Census ACS, IRS SOI, Zillow ZHVI, and FEMA NRI climate data.</Text>
      </div>

      <ClusterExplorer
        tierKey="1B"
        tierLabel="Market Context"
        configCard={metricCard}
        configSummary={configSummary}
        selectedKeys={draft.tier1bMetrics}
        insightText={TIER1B_MICRO_INSIGHT}
      />

      <WizardFooter tierLabel="Step 2 (Market Context)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Step 3: Commercial Scope →" />
    </div>
  );
}

function Step2_ScopeAndTier2({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier2Metrics.includes(key) ? d.tier2Metrics.filter((k) => k !== key) : [...d.tier2Metrics, key];
    return { ...d, tier2Metrics: metrics, useAgentTier2: false };
  });

  const dosMax = 1800;

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: color.info }}>Step 3</div>
        <Text variant="title" tone="strong">Commercial Performance</Text>
        <Text variant="caption" tone="muted">Against the locked merchandise scope, fetch category-scoped sales velocity, sell-through %, and Days of Supply.</Text>
      </div>

      <ClusterExplorer
        tierKey="2"
        tierLabel="Commercial Performance"
        configCard={(
          <>
            {/* Scope selectors */}
            <Card sx={{ ...panelSx, padding: 0 }}>
              <div className="acs-section-header">
                <Text variant="body-strong" tone="strong">Target Merchandise Scope (Levels 1–4)</Text>
                <Badge variant="subtle" size="small" color="success" label="🔒 Locked from scope setup" />
              </div>
              <div className="acs-scope-grid" style={{ padding: "16px 20px 20px" }}>
                {[
                  { label: "Level 1 — Department", val: draft.scopeL1 },
                  { label: "Level 2 — Sub-Dept",   val: draft.scopeL2 },
                  { label: "Level 3 — Class",      val: draft.scopeL3 },
                  { label: "Level 4 — Sub-Class",  val: draft.scopeL4 },
                ].map((col) => (
                  <div key={col.label}>
                    <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8, display: "block" }}>{col.label}</Text>
                    <div className="acs-scope-readonly" title={col.val || "Not scoped"}>
                      <Lock size={12} className="acs-scope-readonly-ico" />
                      <span className="acs-scope-readonly-val">{col.val || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tier 2 metrics */}
            <Card sx={{ ...panelSx, padding: 0 }}>
              <div className="acs-section-header">
                <div>
                  <Text variant="body-strong" tone="strong">Category Commercial Metrics</Text>
                  <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>Scoped to: {draft.scopeL4 || "—"}</Text>
                </div>
              </div>
              <div className="acs-metric-grid" style={{ padding: 16 }}>
                {TIER2_METRICS.map((m) => (
                  <MetricToggle key={m.key} metric={m} active={draft.tier2Metrics.includes(m.key)} onToggle={toggleMetric} />
                ))}
              </div>
            </Card>
          </>
        )}
        configSummary={[draft.scopeL4, ...TIER2_METRICS.filter((m) => draft.tier2Metrics.includes(m.key)).map((m) => m.label)].filter(Boolean)}
        selectedKeys={draft.tier2Metrics}
        insightText={TIER2_AI_ALERT}
        insightType="warning"
      />

      <WizardFooter tierLabel="Step 3 (Commercial Performance)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Proceed to Step 4: Product Profile →" />
    </div>
  );
}

function Step4_Tier4({ draft, setDraft, onFinalize, onProceed }) {
  const toggleMetric = (key) => setDraft((d) => {
    const metrics = d.tier4Metrics.includes(key) ? d.tier4Metrics.filter((k) => k !== key) : [...d.tier4Metrics, key];
    return { ...d, tier4Metrics: metrics, useAgentTier4: false };
  });

  const configSummary = TIER4_METRICS.filter((m) => draft.tier4Metrics.includes(m.key)).map((m) => m.label);

  const metricCard = (
    <Card sx={{ ...panelSx, padding: 0 }}>
      <div className="acs-section-header">
        <Text variant="body-strong" tone="strong">Catalog Attributes</Text>
      </div>
      <div className="acs-metric-grid" style={{ padding: 16 }}>
        {TIER4_METRICS.map((m) => (
          <MetricToggle key={m.key} metric={m} active={draft.tier4Metrics.includes(m.key)} onToggle={toggleMetric} />
        ))}
      </div>
    </Card>
  );

  return (
    <div className="acs-wiz-step">
      <div className="acs-step-intro">
        <div className="acs-step-badge" style={{ background: color.accent }}>Step 4</div>
        <Text variant="title" tone="strong">Product Profile &amp; Aesthetic Style Mix</Text>
        <Text variant="caption" tone="muted">Layer localized customer style preferences, finish types, species mix, and Good/Better/Best price positioning.</Text>
      </div>

      <ClusterExplorer
        tierKey="4"
        tierLabel="Product Profile"
        configCard={metricCard}
        configSummary={configSummary}
        selectedKeys={draft.tier4Metrics}
        insightText="Wirebrushed Rustic Oak dominates the mid-tier profile at 64% share with the lowest style-mismatch risk. Premium smooth finishes carry higher ASP but skew Best-tier depth; value dark tones show elevated mismatch risk and warrant tighter localization."
        insightType="info"
      />

      <WizardFooter tierLabel="Step 4 (Product Profile)" onFinalize={onFinalize} onProceed={onProceed} proceedLabel="Initialize Final Agentic Run →" />
    </div>
  );
}

function SetupWizard({ onFinalize, onTerminal }) {
  const [step, setStep]   = useState(0);
  const [draft, setDraft] = useState({ ...STUDIO_WIZARD_DEFAULTS });

  const STEP_LABELS = ["Store Structure", "Market Context", "Commercial Scope", "Product Profile"];

  const goFinalize = () => onFinalize();
  const goNext     = () => {
    if (step < 3) setStep((s) => s + 1);
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
        {step === 3 && <Step4_Tier4 draft={draft} setDraft={setDraft} onFinalize={goFinalize} onProceed={goNext} />}
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
            Run ID: CR-019 · Multi-Step K-Medoids Distance Processing · Level 4: Solid Prefinished Wood
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

const SCENARIO_LOAD_STEPS = [
  "Merging Step 1–4 cluster assignments",
  "Scoring combined cluster DNA vs. enterprise average",
  "Reconciling commercial risk & Open-To-Buy exposure",
  "Compiling integrated label distribution",
];

function ScenarioReview({ onPromote }) {
  const [selected, setSelected] = useState("B");
  const [promoted, setPromoted] = useState(false);
  const [phase, setPhase] = useState("loading");   // loading | ready
  const [loadStep, setLoadStep] = useState(0);
  const [clusterId, setClusterId] = useState(null); // selected cluster for the detail panel
  const [panelOpen, setPanelOpen] = useState(false);

  // "Loading the Final Cluster Mix" — staged loader before revealing the dashboard.
  useEffect(() => {
    const stepTimers = SCENARIO_LOAD_STEPS.map((_, i) =>
      setTimeout(() => setLoadStep(i + 1), 480 * (i + 1))
    );
    const done = setTimeout(() => setPhase("ready"), 480 * SCENARIO_LOAD_STEPS.length + 700);
    return () => { stepTimers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  const riskBorder = { healthy: color.success, risk: color.warning, critical: color.error, coldstart: color.info };
  const riskLabel  = { healthy: "🟢 Healthy / Growth", risk: "🟡 At Risk", critical: "🔴 CRITICAL OVERBUY RISK", coldstart: "🟡 Cold-Start Protected" };

  const openCluster = (id) => { setClusterId(id); setPanelOpen(true); };

  const handlePromote = () => {
    setPromoted(true);
    setTimeout(onPromote, 2200);
  };

  if (phase === "loading") {
    return (
      <div className="acs-screen">
        <div className="acs-final-load">
          <div className="acs-final-load-card">
            <div className="acs-final-load-ring"><Cpu size={26} /></div>
            <Text variant="title" tone="strong" style={{ marginTop: 20, display: "block" }}>Loading the Final Cluster Mix</Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 6, display: "block", maxWidth: 420, marginInline: "auto" }}>
              Assembling the combined multi-step segmentation into a single promotion-ready scenario set.
            </Text>
            <div className="acs-final-load-steps">
              {SCENARIO_LOAD_STEPS.map((s, i) => {
                const state = i < loadStep ? "done" : i === loadStep ? "active" : "pending";
                return (
                  <div key={s} className={`acs-final-load-step is-${state}`}>
                    <span className="acs-final-load-step-ico">
                      {state === "done" ? <CheckCircle2 size={14} /> : state === "active" ? <span className="acs-running-spinner sm" /> : <span className="acs-final-load-dot" />}
                    </span>
                    <span className="acs-final-load-step-txt">{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <div>
            <Text variant="body-strong" tone="strong">Combined Cluster DNA — Spider Profile View</Text>
            <Text variant="micro" tone="muted" style={{ marginTop: 2, display: "block" }}>Cluster profile vs enterprise average · click a card to inspect</Text>
          </div>
          <div className="acs-spider-legend">
            <span className="acs-spider-legend-item"><span className="acs-spider-swatch solid" /> Cluster</span>
            <span className="acs-spider-legend-item"><span className="acs-spider-swatch dash" /> Network Avg</span>
          </div>
        </div>
        <div className="acs-spider-grid">
          {SCENARIO_FULL_CLUSTERS.map((cl) => (
            <button key={cl.id} type="button" className="acs-spider-cell" onClick={() => openCluster(cl.id)}>
              <span className="acs-spider-cell-head">
                <LabelPill id={cl.id} size="sm" />
                <span className="acs-spider-cell-label">{cl.label}</span>
                {cl.isProxy && <Badge variant="subtle" size="small" color="info" label="Proxy" />}
              </span>
              <SpiderChart
                axes={SPIDER_AXES}
                values={cl.spiderAxes}
                networkValues={NETWORK_AVG}
                title={cl.id}
                height={220}
                showLegend={false}
              />
              <span className="acs-spider-cell-cta">View details <ChevronRight size={12} /></span>
            </button>
          ))}
        </div>
      </Card>

      {/* Label distribution */}
      <Card sx={panelSx}>
        <Text variant="body-strong" tone="strong" style={{ marginBottom: 14, display: "block" }}>Integrated Label Distribution</Text>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SCENARIO_FULL_CLUSTERS.map((cl) => (
            <div key={cl.id} className="acs-dist-row acs-dist-row-click" onClick={() => openCluster(cl.id)} role="button" tabIndex={0}>
              <LabelPill id={cl.id} size="sm" />
              <Text variant="micro" tone="muted" style={{ flex: 1, minWidth: 0 }}>{cl.label}</Text>
              <Text variant="micro" mono style={{ fontWeight: 700 }}>{cl.stores} {cl.stores === 1 ? "Store" : "Stores"}</Text>
              {cl.isProxy && <Badge variant="subtle" size="small" color="info" label="Cold-Start" />}
              <ChevronRight size={13} className="acs-dist-row-chev" />
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
                <tr key={cl.id} className="acs-clx-row" style={{ borderLeft: `3px solid ${riskBorder[cl.riskStatus] || color.border}` }} onClick={() => openCluster(cl.id)}>
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

      <ScenarioClusterPanel open={panelOpen} clusterId={clusterId} onClose={() => setPanelOpen(false)} />
    </div>
  );
}

/** Slide-over detail panel for a scenario cluster (spider DNA, commercial KPIs, SKU actions). */
function ScenarioClusterPanel({ open, clusterId, onClose }) {
  const cl = SCENARIO_FULL_CLUSTERS.find((c) => c.id === clusterId);
  const riskMeta = {
    healthy:   { label: "Healthy / Growth",       color: "success" },
    risk:      { label: "At Risk",                color: "warning" },
    critical:  { label: "Critical Overbuy Risk",  color: "danger"  },
    coldstart: { label: "Cold-Start Protected",   color: "info"    },
  };
  const accent = { healthy: color.success, risk: color.warning, critical: color.error, coldstart: color.info };
  const skus = cl ? SKU_SCORECARD.filter((s) => s.cluster === cl.id) : [];
  const actionColor = { ADD: color.success, DROP: color.error, FREEZE: color.warning };

  const kpis = cl ? [
    { label: "Stores",        value: cl.stores.toLocaleString() },
    { label: "Sales / SqFt",  value: `$${cl.salesSqft}${cl.isProxy ? " (proj)" : ""}` },
    { label: "Sell-Through",  value: `${cl.sellThrough}%${cl.isProxy ? " (proj)" : ""}` },
    { label: "Days of Supply", value: `${cl.dos.toLocaleString()} d${cl.isProxy ? " (proj)" : ""}` },
    { label: "GMROI",         value: `${cl.gmroi.toFixed(1)}${cl.isProxy ? " (proj)" : ""}` },
    { label: "Aesthetic",     value: cl.aesthetic },
  ] : [];

  return (
    <>
      <div className={`acs-clx-panel-scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`acs-clx-panel${open ? " open" : ""}`} role="dialog" aria-label="Cluster detail">
        {cl && (
          <>
            <div className="acs-clx-panel-head" style={{ borderTopColor: accent[cl.riskStatus] || color.primary }}>
              <div className="acs-clx-panel-title">
                <LabelPill id={cl.id} size="sm" />
                <div style={{ minWidth: 0 }}>
                  <Text variant="body-strong" tone="strong" style={{ display: "block" }}>{cl.label}</Text>
                  <Stack direction="row" align="center" gap={2} style={{ marginTop: 3 }}>
                    <Badge variant="subtle" size="small" color={riskMeta[cl.riskStatus]?.color || "neutral"} label={riskMeta[cl.riskStatus]?.label || "—"} />
                    {cl.isProxy && <Badge variant="subtle" size="small" color="info" label="Cold-Start Proxy" />}
                  </Stack>
                </div>
              </div>
              <button className="acs-clx-panel-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
            </div>

            <div className="acs-clx-panel-body">
              {/* Commercial KPIs */}
              <div className="acs-clx-panel-kpis">
                {kpis.map((k) => (
                  <div key={k.label} className="acs-clx-panel-kpi">
                    <span className="acs-clx-panel-kpi-label">{k.label}</span>
                    <span className="acs-clx-panel-kpi-val">{k.value}</span>
                  </div>
                ))}
              </div>

              {/* Cluster DNA spider */}
              <div className="acs-scn-panel-section">
                <Text variant="micro" tone="subtle" className="acs-scn-panel-eyebrow">Cluster DNA vs Network Average</Text>
                <div className="acs-scn-panel-spider">
                  <SpiderChart axes={SPIDER_AXES} values={cl.spiderAxes} networkValues={NETWORK_AVG} title={cl.id} height={260} showLegend />
                </div>
              </div>

              {/* Axis breakdown */}
              <div className="acs-scn-panel-section">
                <Text variant="micro" tone="subtle" className="acs-scn-panel-eyebrow">Profile Signals</Text>
                <div className="acs-scn-axis-list">
                  {SPIDER_AXES.map((ax, i) => (
                    <div key={ax} className="acs-scn-axis-row">
                      <span className="acs-scn-axis-lbl">{ax}</span>
                      <span className="acs-scn-axis-bar">
                        <span className="acs-scn-axis-fill" style={{ width: `${cl.spiderAxes[i]}%`, background: accent[cl.riskStatus] || color.primary }} />
                      </span>
                      <span className="acs-scn-axis-val">{cl.spiderAxes[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SKU actions */}
              <div className="acs-scn-panel-section">
                <Text variant="micro" tone="subtle" className="acs-scn-panel-eyebrow">Line Review — SKU Actions ({skus.length})</Text>
                {skus.length === 0 ? (
                  <div className="acs-scn-panel-empty">No SKU add / drop actions staged for this cluster.</div>
                ) : (
                  <div className="acs-scn-sku-list">
                    {skus.map((s, i) => (
                      <div key={i} className="acs-scn-sku-row">
                        <span className="acs-action-badge" style={{ background: actionColor[s.action] || color.primary }}>{s.action}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Text variant="micro" style={{ fontWeight: 700, display: "block" }}>#{s.sku} · {s.description}</Text>
                          <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 2 }}>{s.attr}</Text>
                          <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 3, lineHeight: 1.5 }}>{s.rationale}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
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
  // Final agentic run now flows straight into the "Loading the Final Cluster Mix"
  // loader inside ScenarioReview (no standalone execution terminal step).
  const handleTerminal      = useCallback(() => setScreen("review"), []);
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
