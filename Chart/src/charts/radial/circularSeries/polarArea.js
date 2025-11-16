// src/charts/radial/circularSeries/polarArea.js
import { buildCircularSeriesChart } from "./_baseCircularSeries.js";

export function polarAreaChart(root, config) {
  const engine = config.engine || {};
  return buildCircularSeriesChart(root, {
    ...config,
    engine: {
      ...engine,
      engineType: "Radial",
      chartType: "polarArea",
    },
  });
}
