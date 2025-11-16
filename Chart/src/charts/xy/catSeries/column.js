// src/charts/xy/catSeries/column.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * Final chart type for engineType="XY", chartType="column".
 */
export function columnChart(root, config) {
  // You can inject column-specific options here later
  return buildCatSeriesChart(root, config);
}
