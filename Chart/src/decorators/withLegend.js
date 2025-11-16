// src/decorators/withLegend.js

/**
 * Add a legend to the chart if legendConfig.enabled is true.
 *
 * legendConfig:
 *   { enabled: true }
 */
export function withLegend(root, chart, series, legendConfig = {}) {
  if (!legendConfig.enabled) return null;

  const legend = chart.children.push(
    am5.Legend.new(root, {
      centerX: am5.p50,
      x: am5.p50,
      layout: root.horizontalLayout,
    })
  );

  legend.data.setAll(series);

  return legend;
}
