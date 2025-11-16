// src/charts/xy/seriesSeries/scatter.js

import { buildSeriesSeriesChart } from "./_baseSeriesSeries.js";

/**
 * engineType="XY", chartType="scatter"
 * Numeric × numeric scatter plot.
 */
export function scatterChart(root, config) {
  return buildSeriesSeriesChart(root, config);
}
