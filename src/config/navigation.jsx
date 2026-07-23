import React from "react";
import {
  TodayIcon,
  RangeBuildIcon,
  WorkspaceIcon,
  CurationIcon,
  IntelligenceIcon,
  AdminIcon,
  OthersIcon,
  HindsightIcon,
  StoreHubIcon,
  PortfolioIcon,
  ForecastIcon,
  CatalogueIcon,
  NationalIcon,
  RegionalIcon,
  MpiIcon,
  MarketIntelIcon,
  FeedbackIcon,
  ApprovalIcon,
  PlanningAdminIcon,
  CalendarIcon,
  AssortPeriodsIcon,
  ClusteringIcon,
  LeadTimeIcon,
  PeerIntelIcon,
  SettingsIcon,
  AssortIntelIcon,
  PlanningRulesIcon,
  UsersRolesIcon,
  StorePlanningStudioIcon,
  NewStorePlanningIcon,
  AgenticClusteringStudioIcon,
} from "./navIcons.jsx";

/*
 * Navigation model for the Impact UI <Sidebar />.
 *
 * Groups mirror the fd-assortment-v6.html taskflow sidebar exactly:
 *   Today (standalone) / Range Build / My Workspace /
 *   Assortment Curation / Intelligence / Admin
 *
 * Modules that exist in the React app but not in the HTML prototype are
 * collected under an "Others" group so they remain accessible without
 * cluttering the primary workflow.
 *
 * All leaf `value` keys are IDENTICAL to the legacy goModule() keys used
 * in VIEWS (App.jsx) and RBAC (users.js) — only the parent grouping changes.
 */
/*
 * VISIBILITY RULES
 * ─────────────────
 * `hidden: true` on a group   → entire group hidden from sidebar
 * `hidden: true` on a child   → that child hidden from sidebar
 * Hidden items are still registered in VIEWS / MODULE_LABELS so all
 * programmatic navigation (tile links, wizard "next" buttons, etc.) keeps
 * working exactly as before.
 */
export const routes = [

  /* ── Today ─────────────────────────────────────────────────────────────── */
  {
    value: "today",
    label: "Today",
    icon: <TodayIcon />,
    link: "/today",
    children: [],
  },

  /* ── PLR Status — top-level shortcut ───────────────────────────────────── */
  {
    value: "approval",
    label: "PLR Status",
    icon: <ApprovalIcon />,
    link: "/approval",
    children: [],
  },

  /* ── Range Build — hidden; accessible via programmatic navigation ──────── */
  {
    value: "range-build",
    label: "Range Build",
    icon: <RangeBuildIcon />,
    link: "#range-build",
    hidden: true,
    children: [
      { value: "portfolio",  label: "Portfolio Build",    icon: <PortfolioIcon />, link: "/portfolio" },
      { value: "forecast",   label: "Like-Item Forecast", icon: <ForecastIcon />,  link: "/forecast"  },
      { value: "catalogue",  label: "Catalogue",          icon: <CatalogueIcon />, link: "/catalogue" },
    ],
  },

  /* ── My Workspace — hidden ─────────────────────────────────────────────── */
  {
    value: "workspace-group",
    label: "My Workspace",
    icon: <WorkspaceIcon />,
    link: "#workspace-group",
    hidden: true,
    children: [
      { value: "workspace", label: "My Workspace", icon: <WorkspaceIcon />, link: "/workspace", badge: "Plans" },
    ],
  },

  /* ── Assortment Curation — hidden ──────────────────────────────────────── */
  {
    value: "curation",
    label: "Assortment Curation",
    icon: <CurationIcon />,
    link: "#curation",
    hidden: true,
    children: [
      { value: "national",       label: "National Core",   icon: <NationalIcon />, link: "/national"       },
      { value: "regional",       label: "Regional Review", icon: <RegionalIcon />, link: "/regional"       },
      { value: "store-curation", label: "Store Curation",  icon: <CurationIcon />, link: "/store-curation" },
      { value: "mpi",            label: "NPI",             icon: <MpiIcon />,      link: "/mpi"            },
    ],
  },

  /* ── Intelligence — only Market Intelligence visible ───────────────────── */
  {
    value: "intelligence",
    label: "Intelligence",
    icon: <IntelligenceIcon />,
    link: "#intelligence",
    children: [
      { value: "intel",      label: "Market Intelligence", icon: <MarketIntelIcon />, link: "/intel"      },
      { value: "hindsight",  label: "Hindsight",           icon: <HindsightIcon />,   link: "/hindsight",  hidden: true },
      { value: "peer-intel", label: "Peer Intelligence",   icon: <PeerIntelIcon />,   link: "/peer-intel", hidden: true },
    ],
  },

  /* ── Admin ──────────────────────────────────────────────────────────────── */
  {
    value: "admin",
    label: "Admin",
    icon: <AdminIcon />,
    link: "#admin",
    children: [
      { value: "admin-planning",  label: "Planning Admin",      icon: <PlanningAdminIcon />, link: "/admin-planning"  },
      { value: "assort-periods",  label: "Define Assort Period", icon: <AssortPeriodsIcon />, link: "/assort-periods"  },
      { value: "periods",         label: "PLR Calendar",         icon: <CalendarIcon />,      link: "/periods",         hidden: true },
      { value: "planning-rules",  label: "Planning Rules",       icon: <PlanningRulesIcon />, link: "/planning-rules"  },
      { value: "users-roles",     label: "Users & Roles",        icon: <UsersRolesIcon />,    link: "/users-roles"     },
    ],
  },

  /* ── Store Planning Studio ──────────────────────────────────────────────── */
  {
    value: "store-planning-studio",
    label: "Store Planning Studio",
    icon: <StorePlanningStudioIcon />,
    link: "#store-planning-studio",
    children: [
      { value: "clustering",          label: "Location Clustering",      icon: <ClusteringIcon />,               link: "/clustering"          },
      { value: "agentic-clustering", label: "Agentic Clustering Studio", icon: <AgenticClusteringStudioIcon />, link: "/agentic-clustering"  },
      { value: "new-store-planning", label: "New Store Planning",        icon: <NewStorePlanningIcon />,        link: "/new-store-planning"  },
    ],
  },

  /* ── Others — all hidden; accessible only via programmatic navigation ───── */
  {
    value: "others",
    label: "Others",
    icon: <OthersIcon />,
    link: "#others",
    hidden: true,
    children: [
      { value: "assortment-intelligence", label: "Assortment Intelligence", icon: <AssortIntelIcon />, link: "/assortment-intelligence", badge: "Signals" },
      { value: "feedback",                label: "Feedback Loop",           icon: <FeedbackIcon />,    link: "/feedback"                },
      { value: "lead-time",               label: "Lead Time & Oracle",      icon: <LeadTimeIcon />,    link: "/lead-time"               },
      { value: "store-hub",               label: "Store Hub",               icon: <StoreHubIcon />,    link: "/store-hub"               },
    ],
  },
];

export const actionRoutes = [
  {
    value: "settings",
    label: "Settings",
    icon: <SettingsIcon />,
    link: "/settings",
    children: [],
  },
];

/**
 * Filter the route tree down to only the modules the current user can access.
 *
 * @param {typeof routes} tree - full routes array
 * @param {string[] | "ALL"} allowed - user.modules from users.js
 * @returns a new routes array with unauthorized leaves removed and empty
 *          parent groups dropped entirely.
 */
export function filterRoutesByAccess(tree, allowed) {
  return tree.reduce((acc, route) => {
    // Groups/leaves marked hidden:true are never rendered in the sidebar,
    // but their module values remain accessible via programmatic navigation.
    if (route.hidden) return acc;

    if (!route.children?.length) {
      // Standalone leaf (e.g. "today", "approval")
      if (allowed === "ALL" || allowed.includes(route.value)) {
        acc.push(route);
      }
    } else {
      // Group parent — filter out hidden children AND unauthorised children
      const visibleChildren = route.children.filter((c) => {
        if (c.hidden) return false;
        return allowed === "ALL" || allowed.includes(c.value);
      });
      if (visibleChildren.length > 0) {
        acc.push({ ...route, children: visibleChildren });
      }
    }
    return acc;
  }, []);
}

/* value → human label, for breadcrumb + content placeholder titles */
export const MODULE_LABELS = {
  today:                    "Today",
  workspace:                "My Workspace",
  hindsight:                "Hindsight",
  "store-hub":              "Store Hub",
  portfolio:                "Portfolio Build",
  forecast:                 "Like-Item Forecast",
  "assortment-intelligence":"Assortment Intelligence",
  catalogue:                "Catalogue",
  national:                 "National Core",
  regional:                 "Regional Review",
  "store-curation":         "Store Curation",
  mpi:                      "NPI",
  intel:                    "Market Intelligence",
  feedback:                 "Feedback Loop",
  approval:                 "PLR Status",
  "admin-planning":         "Planning Admin",
  "assort-periods":         "Define Assort Period",
  periods:                  "PLR Calendar",
  clustering:               "Location Clustering",
  "agentic-clustering":     "Agentic Clustering Studio",
  "new-store-planning":     "New Store Planning",
  "lead-time":              "Lead Time & Oracle",
  "peer-intel":             "Peer Intelligence",
  "planning-rules":         "Planning Rules",
  "users-roles":            "Users & Roles",
  settings:                 "Settings",
};

/* parent group label for a given leaf value (used in breadcrumb) */
export const MODULE_GROUP = (() => {
  const map = {};
  routes.forEach((r) => {
    if (r.children && r.children.length) {
      r.children.forEach((c) => (map[c.value] = r.label));
    }
  });
  return map;
})();
