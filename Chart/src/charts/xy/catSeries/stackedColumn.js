// src/charts/xy/catSeries/stackedColumn.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * engineType="XY", chartType="stackedColumn"
 * Semantics:
 *   - same as column, but value axis is stacked by default
 */
export function stackedColumnChart(root, config) {
  // clone just enough to avoid mutating the original config
  const engine = config.engine || {};
  const axes = engine.axes || {};
  const yCfgs = Array.isArray(axes.y) ? axes.y : axes.y ? [axes.y] : [];

  const stackedY = yCfgs.map((axis, idx) =>
    idx === 0 ? { ...axis, stacked: axis.stacked ?? true } : { ...axis }
  );

  const patchedConfig = {
    ...config,
    engine: {
      ...engine,
      chartType: engine.chartType || "column", // ensure a sane default
      axes: {
        ...axes,
        y: stackedY,
      },
    },
  };

  return buildCatSeriesChart(root, patchedConfig);
}
