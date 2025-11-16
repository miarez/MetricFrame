// src/charts/xy/catSeries/stackedArea.js

import { buildCatSeriesChart } from "./_baseCatSeries.js";

/**
 * engineType="XY", chartType="stackedArea"
 * Semantics:
 *   - uses area geoms
 *   - value axis is stacked by default
 */
export function stackedAreaChart(root, config) {
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
      chartType: "area", // ensure base sees an area geom at engine level
      axes: {
        ...axes,
        y: stackedY,
      },
    },
  };

  return buildCatSeriesChart(root, patchedConfig);
}
