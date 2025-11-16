// src/engines/xyEngine.js

/**
 * Low-level XY engine.
 *
 * Creates an amCharts XYChart and returns it.
 * It does NOT create axes or series – that is the job of
 * _baseCatSeries / _baseSeriesSeries and the final chart files.
 *
 * engineConfig comes from config.engine.
 */
export function createXYChart(root, engineConfig = {}) {
  const ec = engineConfig || {};

  const chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      // sensible defaults, overridable via engineConfig if you want later
      panX: ec.panX ?? false,
      panY: ec.panY ?? false,
      wheelX: ec.wheelX ?? "none",
      wheelY: ec.wheelY ?? "none",
      layout: root.verticalLayout,
    })
  );

  return { chart };
}
