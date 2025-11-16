// src/charts/xy/seriesSeries/_baseSeriesSeries.js

import { createXYChart } from "../../../engines/xyEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withLegend } from "../../../decorators/withLegend.js";
import { withCursor } from "../../../decorators/withCursor.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

/**
 * Generic numeric × numeric base (scatter-style charts).
 *
 * Expected engine shape for scatter:
 *   engine: {
 *     engineType: "XY",
 *     chartType: "scatter",
 *     axes: {
 *       x: { id: "x", type: "value", min, max, ... },
 *       y: [ { id: "y", type: "value", min, max, ... } ]
 *     },
 *     series: [
 *       { name, xField, yField, radius? },
 *       // more series allowed
 *     ]
 *   }
 */
export function buildSeriesSeriesChart(root, config) {
  const engine = config.engine || {};
  const data = Array.isArray(config.data) ? config.data : [];

  const axesCfg = engine.axes || {};
  const xCfg = axesCfg.x || {};
  const yCfgs = Array.isArray(axesCfg.y)
    ? axesCfg.y
    : axesCfg.y
    ? [axesCfg.y]
    : [];

  const seriesDefs = Array.isArray(engine.series) ? engine.series : [];

  const firstRow = data[0] || {};

  // --- resolve default x / y fields from engine / first series / data keys ---

  const defaultXField =
    engine.xField ||
    seriesDefs[0]?.xField ||
    Object.keys(firstRow).find((k) => typeof firstRow[k] === "number") ||
    "x";

  const defaultYField =
    engine.yField ||
    seriesDefs[0]?.yField ||
    Object.keys(firstRow).find(
      (k) => k !== defaultXField && typeof firstRow[k] === "number"
    ) ||
    "y";

  // --- CHART + AXES ---

  const { chart } = createXYChart(root, engine);

  const xAxis = chart.xAxes.push(
    am5xy.ValueAxis.new(root, {
      renderer: am5xy.AxisRendererX.new(root, {
        minGridDistance: 40,
      }),
      min: xCfg.min,
      max: xCfg.max,
    })
  );

  const firstY = yCfgs[0] || {};
  const yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      renderer: am5xy.AxisRendererY.new(root, {}),
      min: firstY.min,
      max: firstY.max,
    })
  );

  // --- SERIES (scatter) ---

  const series = seriesDefs.map((sDef, idx) => {
    const xField = sDef.xField || defaultXField;
    const yField = sDef.yField || defaultYField;

    const s = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: sDef.name || `Series ${idx + 1}`,
        xAxis,
        yAxis,
        valueXField: xField,
        valueYField: yField,
        tooltip: am5.Tooltip.new(root, {
          labelText: `{${xField}} , {${yField}}`,
        }),
      })
    );

    // scatter = no line, bullets only
    s.strokes.template.set("visible", false);
    s.fills.template.set("visible", false);

    s.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, {
          radius: sDef.radius ?? 4,
          fill: s.get("stroke"),
        }),
      })
    );

    s.data.setAll(data);
    s.appear(800);
    return s;
  });

  // --- BACKGROUND + DECORATORS ---

  if (config.theme && config.theme.background) {
    applyChartBackground(root, chart, config.theme.background);
  }

  const legend = withLegend(root, chart, series, config.legend || {});
  const cursor = withCursor(root, chart, xAxis, yAxis, config.cursor || {});
  const scrollbars = withScrollbars(root, chart, config.scrollbars || {});

  chart.appear(800, 100);

  const cleanup = () => {
    if (!root.isDisposed()) {
      root.dispose();
    }
  };

  return {
    chart,
    xAxis,
    yAxis,
    series,
    legend,
    cursor,
    scrollbars,
    cleanup,
  };
}
