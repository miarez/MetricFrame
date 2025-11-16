// src/charts/xy/catCat/heatmap.js

import { createXYChart } from "../../../engines/xyEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withCursor } from "../../../decorators/withCursor.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

export function heatmapChart(root, config) {
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

  // --- resolve fields ---

  const categoryXField =
    xCfg.field ||
    engine.categoryXField ||
    Object.keys(firstRow).find((k) => isNaN(Number(firstRow[k]))) ||
    "categoryX";

  const categoryYField =
    (yCfgs[0] && (yCfgs[0].field || yCfgs[0].categoryField)) ||
    engine.categoryYField ||
    Object.keys(firstRow).find(
      (k) => k !== categoryXField && isNaN(Number(firstRow[k]))
    ) ||
    "categoryY";

  const valueField =
    (seriesDefs[0] && seriesDefs[0].field) ||
    engine.valueField ||
    Object.keys(firstRow).find((k) => !isNaN(Number(firstRow[k]))) ||
    "value";

  // --- derive distinct categories for axes ---

  const xCats = Array.from(
    new Set(data.map((row) => row[categoryXField]))
  ).filter((v) => v !== undefined);

  const yCats = Array.from(
    new Set(data.map((row) => row[categoryYField]))
  ).filter((v) => v !== undefined);

  const xAxisData = xCats.map((c) => ({ [categoryXField]: c }));
  const yAxisData = yCats.map((c) => ({ [categoryYField]: c }));

  // --- chart + axes ---

  const { chart } = createXYChart(root, engine);

  const xAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, {
      categoryField: categoryXField,
      renderer: am5xy.AxisRendererX.new(root, {
        minGridDistance: 20,
      }),
    })
  );

  const yAxis = chart.yAxes.push(
    am5xy.CategoryAxis.new(root, {
      categoryField: categoryYField,
      renderer: am5xy.AxisRendererY.new(root, {}),
    })
  );

  xAxis.data.setAll(xAxisData);
  yAxis.data.setAll(yAxisData);

  // --- series ---

  const series = chart.series.push(
    am5xy.ColumnSeries.new(root, {
      name: seriesDefs[0]?.name || "Values",
      xAxis,
      yAxis,
      categoryXField,
      categoryYField,
      valueField,
    })
  );

  // columns handle their own tooltip + hit testing
  series.columns.template.setAll({
    strokeOpacity: 0,
    width: am5.percent(100),
    height: am5.percent(100),
    tooltipText: `{${categoryXField}} × {${categoryYField}}: {${valueField}}`,
    interactive: true,
  });

  // --- compute numeric min/max for valueField ---

  const values = data
    .map((row) => {
      const v = row[valueField];
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .filter((v) => v !== null);

  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 1;

  series.set("heatRules", [
    {
      target: series.columns.template,
      key: "fill",
      dataField: valueField,
      min: am5.color(0xfff6b7), // light yellow
      max: am5.color(0xff0000), // red
      minValue: minVal,
      maxValue: maxVal,
    },
  ]);

  const legend = chart.children.push(
    am5.HeatLegend.new(root, {
      orientation: "horizontal",
      startColor: am5.color(0xfff6b7),
      endColor: am5.color(0xff0000),
      startText: "Low",
      endText: "High",
    })
  );

  legend.startLabel.setAll({
    fontSize: 12,
    fill: am5.color(0xaaaaaa),
  });
  legend.endLabel.setAll({
    fontSize: 12,
    fill: am5.color(0xaaaaaa),
  });

  series.on("datavalidated", () => {
    legend.set("startValue", series.getPrivate("valueLow"));
    legend.set("endValue", series.getPrivate("valueHigh"));
  });
  // IMPORTANT: series gets the *full* matrix of cells
  series.data.setAll(data);
  series.appear(800);

  // --- background + decorators ---

  if (config.theme && config.theme.background) {
    applyChartBackground(root, chart, config.theme.background);
  }
  // Heatmaps work best without XYCursor;
  // let columns handle their own hover + tooltip.
  const cursor = null;

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
    series: [series],
    cursor,
    scrollbars,
    cleanup,
  };
}
