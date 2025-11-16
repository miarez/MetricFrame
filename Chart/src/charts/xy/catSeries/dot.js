// src/charts/xy/catSeries/dot.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * engineType="XY", chartType="dot"
 * Category × numeric, rendered as bullet-only series.
 */
export function dotChart(root, config) {
  const engine = config.engine || {};

  const patchedConfig = {
    ...config,
    engine: {
      ...engine,
      chartType: "dot",
    },
  };

  return buildCatSeriesChart(root, patchedConfig);
}
