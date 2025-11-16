// src/charts/radial/circularSeries/radar.js

import { buildCircularSeriesChart } from "./_baseCircularSeries.js";

/**
 * engineType="Radial", chartType="radar"
 *
 * Radar line chart:
 *  - angle axis: category
 *  - radius axis: value
 *  - series geom: "line" (default) unless overridden
 */
export function radarChart(root, config) {
  const engine = config.engine || {};

  const patchedConfig = {
    ...config,
    engine: {
      ...engine,
      engineType: "Radial",
      chartType: "radar",
    },
  };

  return buildCircularSeriesChart(root, patchedConfig);
}
