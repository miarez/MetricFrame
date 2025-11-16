// src/charts/xy/catSeries/combo.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * engineType="XY", chartType="combo"
 *
 * Combo charts allow mixed geoms (e.g., line + column) on shared axes.
 * _baseCatSeries already respects per-series .geom(), so we just delegate.
 */
export function comboChart(root, config) {
  // No patching required: combo is just a mixed-geom XY chart.
  // If you ever want to add defaults (e.g., area transparency), do it here.
  return buildCatSeriesChart(root, config);
}
