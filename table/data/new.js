const regularRows = [
  {
    source: "All Inbox (Email) - Jobs",
    date: "2025-10-31",
    is_weekend: false,
    lp_imp: 66046,
    rev_total: 10029.0,
    cost_mb: 7898.2,
    cost_platform: 331.16,
    cost_total: 8229.36,
    rpi_mb: 0.14,
    cpi_mb: 0.12,
    cpi_total: 0.12,
    gp: 1799.63,
    gp_pct: 0.18,
    avg_lo: 1.8,
  },
  {
    source: "All Inbox (Email) - Jobs",
    date: "2025-11-01",
    is_weekend: true,
    lp_imp: 38312,
    rev_total: 5505.03,
    cost_mb: 4596.46,
    cost_platform: 166.75,
    cost_total: 4763.21,
    rpi_mb: 0.14,
    cpi_mb: 0.12,
    cpi_total: 0.12,
    gp: 741.82,
    gp_pct: 0.13,
    avg_lo: 1.78,
  },
  {
    source: "Results Generation - Jobs",
    date: "2025-10-31",
    is_weekend: false,
    lp_imp: 29474,
    rev_total: 6113.33,
    cost_mb: 5120.41,
    cost_platform: 150.9,
    cost_total: 5271.31,
    rpi_mb: 0.19,
    cpi_mb: 0.17,
    cpi_total: 0.18,
    gp: 842.92,
    gp_pct: 0.14,
    avg_lo: 1.79,
  },
  {
    source: "Results Generation - Jobs",
    date: "2025-11-01",
    is_weekend: true,
    lp_imp: 10665,
    rev_total: 1942.14,
    cost_mb: 1657.94,
    cost_platform: 78.39,
    cost_total: 1736.33,
    rpi_mb: 0.17,
    cpi_mb: 0.16,
    cpi_total: 0.16,
    gp: 205.81,
    gp_pct: 0.11,
    avg_lo: 1.58,
  },
];

const regularInfo = {
  nRows: regularRows.length,
  nCols: Object.keys(regularRows[0] || {}).length,

  types: {
    source: "cat",
    date: "date",
    is_weekend: "bool",
    lp_imp: "num",
    rev_total: "num",
    cost_mb: "num",
    cost_platform: "num",
    cost_total: "num",
    rpi_mb: "num",
    cpi_mb: "num",
    cpi_total: "num",
    gp: "num",
    gp_pct: "num",
    avg_lo: "num",
  },

  // very light cardinality just for demo
  cardinality: {
    source: 2,
    date: 3,
    is_weekend: 2,
    lp_imp: 4,
    rev_total: 4,
    cost_mb: 4,
    cost_platform: 4,
    cost_total: 4,
    rpi_mb: 3,
    cpi_mb: 2,
    cpi_total: 2,
    gp: 4,
    gp_pct: 4,
    avg_lo: 3,
  },

  // semantic roles for the table engine:
  rowDims: ["source", "date", "is_weekend"], // left side, with rowspans
  colDims: [], // no column dimensions
  measures: [
    "lp_imp",
    "rev_total",
    "cost_mb",
    "cost_platform",
    "cost_total",
    "rpi_mb",
    "cpi_mb",
    "cpi_total",
    "gp",
    "gp_pct",
    "avg_lo",
  ],

  // "columnIndex" is trivial here: one leaf per measure
  columnIndex: [
    { key: "lp_imp", path: ["lp_imp"], dims: {}, measure: "lp_imp" },
    { key: "rev_total", path: ["rev_total"], dims: {}, measure: "rev_total" },
    { key: "cost_mb", path: ["cost_mb"], dims: {}, measure: "cost_mb" },
    {
      key: "cost_platform",
      path: ["cost_platform"],
      dims: {},
      measure: "cost_platform",
    },
    {
      key: "cost_total",
      path: ["cost_total"],
      dims: {},
      measure: "cost_total",
    },
    { key: "rpi_mb", path: ["rpi_mb"], dims: {}, measure: "rpi_mb" },
    { key: "cpi_mb", path: ["cpi_mb"], dims: {}, measure: "cpi_mb" },
    { key: "cpi_total", path: ["cpi_total"], dims: {}, measure: "cpi_total" },
    { key: "gp", path: ["gp"], dims: {}, measure: "gp" },
    { key: "gp_pct", path: ["gp_pct"], dims: {}, measure: "gp_pct" },
    { key: "avg_lo", path: ["avg_lo"], dims: {}, measure: "avg_lo" },
  ],
};

// Pivoted table: multi-index columns (Experiment Type × IsPehDup × Measure)
//
// Convention for leaf column keys: `${measure}|${experimentType}|${isPehDup}`

const pivotRows = [
  {
    source: "All Inbox (Email) - Jobs",
    date: "2025-10-31",
    is_weekend: false,

    // Landing Impressions
    "lp_imp|DUPLICATE|0": 15942,
    "lp_imp|DUPLICATE|1": 14850,
    "lp_imp|FLOW|0": 19620,
    "lp_imp|FLOW|1": 3017,

    // Total Revenue
    "rev_total|DUPLICATE|0": 1548.75,
    "rev_total|DUPLICATE|1": 3015.94,
    "rev_total|FLOW|0": 1876.64,
    "rev_total|FLOW|1": 790.11,

    // Cost (MB)
    "cost_mb|DUPLICATE|0": 1750.04,
    "cost_mb|DUPLICATE|1": 1626.52,
    "cost_mb|FLOW|0": 2438.74,
    "cost_mb|FLOW|1": 429.97,
  },
  {
    source: "All Inbox (Email) - Jobs",
    date: "2025-11-01",
    is_weekend: true,

    "lp_imp|DUPLICATE|0": 10958,
    "lp_imp|DUPLICATE|1": 10916,
    "lp_imp|FLOW|0": 14180,
    "lp_imp|FLOW|1": 2258,

    "rev_total|DUPLICATE|0": 1103.69,
    "rev_total|DUPLICATE|1": 2253.98,
    "rev_total|FLOW|0": 1304.7,
    "rev_total|FLOW|1": 607.16,

    "cost_mb|DUPLICATE|0": 1221.49,
    "cost_mb|DUPLICATE|1": 1208.77,
    "cost_mb|FLOW|0": 1775.28,
    "cost_mb|FLOW|1": 321.45,
  },
  {
    source: "Results Generation - Jobs",
    date: "2025-10-31",
    is_weekend: false,

    "lp_imp|DUPLICATE|0": 8227,
    "lp_imp|DUPLICATE|1": 17991,
    "lp_imp|FLOW|0": 15092,
    "lp_imp|FLOW|1": 2800,

    "rev_total|DUPLICATE|0": 672.95,
    "rev_total|DUPLICATE|1": 1148.38,
    "rev_total|FLOW|0": 582.52,
    "rev_total|FLOW|1": 993.32,

    "cost_mb|DUPLICATE|0": 745.77,
    "cost_mb|DUPLICATE|1": 1125.09,
    "cost_mb|FLOW|0": 520.01,
    "cost_mb|FLOW|1": 151.4,
  },
];

const pivotInfo = {
  nRows: pivotRows.length,
  nCols: Object.keys(pivotRows[0] || {}).length,

  types: {
    source: "cat",
    date: "date",
    is_weekend: "bool",

    "lp_imp|DUPLICATE|0": "num",
    "lp_imp|DUPLICATE|1": "num",
    "lp_imp|FLOW|0": "num",
    "lp_imp|FLOW|1": "num",

    "rev_total|DUPLICATE|0": "num",
    "rev_total|DUPLICATE|1": "num",
    "rev_total|FLOW|0": "num",
    "rev_total|FLOW|1": "num",

    "cost_mb|DUPLICATE|0": "num",
    "cost_mb|DUPLICATE|1": "num",
    "cost_mb|FLOW|0": "num",
    "cost_mb|FLOW|1": "num",
  },

  // again, tiny demo numbers
  cardinality: {
    source: 2,
    date: 3,
    is_weekend: 2,
    "lp_imp|DUPLICATE|0": 3,
    "lp_imp|DUPLICATE|1": 3,
    "lp_imp|FLOW|0": 3,
    "lp_imp|FLOW|1": 3,
    "rev_total|DUPLICATE|0": 3,
    "rev_total|DUPLICATE|1": 3,
    "rev_total|FLOW|0": 3,
    "rev_total|FLOW|1": 3,
    "cost_mb|DUPLICATE|0": 3,
    "cost_mb|DUPLICATE|1": 3,
    "cost_mb|FLOW|0": 3,
    "cost_mb|FLOW|1": 3,
  },

  // semantic roles
  rowDims: ["source", "date", "is_weekend"],
  colDims: ["experiment_type", "is_peh_dup"], // logical names
  measures: ["lp_imp", "rev_total", "cost_mb"],

  // Multi-index header description for the viewer.
  // Each leaf column corresponds to one <th> at the deepest header row.
  // `path` is the full header stack from left to right.
  columnIndex: [
    // Landing Impressions
    {
      key: "lp_imp|DUPLICATE|0",
      path: ["Landing Impressions", "DUPLICATE", 0],
      dims: { experiment_type: "DUPLICATE", is_peh_dup: 0 },
      measure: "lp_imp",
    },
    {
      key: "lp_imp|DUPLICATE|1",
      path: ["Landing Impressions", "DUPLICATE", 1],
      dims: { experiment_type: "DUPLICATE", is_peh_dup: 1 },
      measure: "lp_imp",
    },
    {
      key: "lp_imp|FLOW|0",
      path: ["Landing Impressions", "FLOW", 0],
      dims: { experiment_type: "FLOW", is_peh_dup: 0 },
      measure: "lp_imp",
    },
    {
      key: "lp_imp|FLOW|1",
      path: ["Landing Impressions", "FLOW", 1],
      dims: { experiment_type: "FLOW", is_peh_dup: 1 },
      measure: "lp_imp",
    },

    // Total Revenue
    {
      key: "rev_total|DUPLICATE|0",
      path: ["Total Revenue", "DUPLICATE", 0],
      dims: { experiment_type: "DUPLICATE", is_peh_dup: 0 },
      measure: "rev_total",
    },
    {
      key: "rev_total|DUPLICATE|1",
      path: ["Total Revenue", "DUPLICATE", 1],
      dims: { experiment_type: "DUPLICATE", is_peh_dup: 1 },
      measure: "rev_total",
    },
    {
      key: "rev_total|FLOW|0",
      path: ["Total Revenue", "FLOW", 0],
      dims: { experiment_type: "FLOW", is_peh_dup: 0 },
      measure: "rev_total",
    },
    {
      key: "rev_total|FLOW|1",
      path: ["Total Revenue", "FLOW", 1],
      dims: { experiment_type: "FLOW", is_peh_dup: 1 },
      measure: "rev_total",
    },

    // Cost (MB)
    {
      key: "cost_mb|DUPLICATE|0",
      path: ["Cost (MB)", "DUPLICATE", 0],
      dims: { experiment_type: "DUPLICATE", is_peh_dup: 0 },
      measure: "cost_mb",
    },
    {
      key: "cost_mb|DUPLICATE|1",
      path: ["Cost (MB)", "DUPLICATE", 1],
      dims: { experiment_type: "DUPLICATE", is_peh_dup: 1 },
      measure: "cost_mb",
    },
    {
      key: "cost_mb|FLOW|0",
      path: ["Cost (MB)", "FLOW", 0],
      dims: { experiment_type: "FLOW", is_peh_dup: 0 },
      measure: "cost_mb",
    },
    {
      key: "cost_mb|FLOW|1",
      path: ["Cost (MB)", "FLOW", 1],
      dims: { experiment_type: "FLOW", is_peh_dup: 1 },
      measure: "cost_mb",
    },
  ],
};

export const regular = {
  df: regularRows,
  info: regularInfo,
};

export const pivot = {
  df: pivotRows,
  info: pivotInfo,
};
