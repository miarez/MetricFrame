// src/charts/radial/circularSeries/polarScatter.js
import { buildCircularSeriesChart } from "./_baseCircularSeries.js";

export function polarScatterChart(root, config) {
  const engine = config.engine || {};
  const series = engine.series || [];

  const patchedEngine = {
    ...engine,
    engineType: "Radial",
    chartType: "polarScatter",
    series: series.map((s) => ({
      geom: "dot",
      ...s,
    })),
  };

  return buildCircularSeriesChart(root, {
    ...config,
    engine: patchedEngine,
  });
}
