// src/charts/xy/catSeries/area.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * Final chart type for engineType="XY", chartType="area".
 * Uses the generic CatSeries base, which:
 *  - chooses LineSeries for geom "area"
 *  - turns fills on with some opacity
 */
export function areaChart(root, config) {
  return buildCatSeriesChart(root, config);
}
