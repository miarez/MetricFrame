// src/charts/radial/circularSeries/polarLine.js
import { buildCircularSeriesChart } from "./_baseCircularSeries.js";

export function polarLineChart(root, config) {
  const engine = config.engine || {};
  return buildCircularSeriesChart(root, {
    ...config,
    engine: {
      ...engine,
      engineType: "Radial",
      chartType: "polarLine",
    },
  });
}
