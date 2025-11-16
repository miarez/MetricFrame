// src/charts/radial/circularSeries/radarHeatmap.js

import { createRadialChart } from "../../../engines/radialEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";
// no cursor on heatmaps – same reason as XY heatmap

/**
 * Radar Heatmap (Category × Category in polar coordinates)
 *
 * Expected engine shape:
 *  engine: {
 *    engineType: "Radial",
 *    chartType: "radarHeatmap",
 *    axes: {
 *      x: { id: "angle", type: "category", field: "hour" },
 *      y: [
 *        { id: "radius", type: "category", field: "weekday" }
 *      ]
 *    },
 *    series: [
 *      { field: "value", name: "Value" }
 *    ]
 *  }
 */
export function radarHeatmapChart(root, config) {
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

  // ---- FIELD RESOLUTION ----

  // Angle categories (around the circle)
  const angleCategoryField =
    xCfg.field ||
    engine.categoryAngleField ||
    engine.categoryField ||
    Object.keys(firstRow).find((k) => isNaN(Number(firstRow[k]))) ||
    "angle";

  // Radial categories (outward from center)
  const radialCategoryField =
    (yCfgs[0] && (yCfgs[0].field || yCfgs[0].categoryField)) ||
    engine.categoryRadiusField ||
    Object.keys(firstRow).find(
      (k) => k !== angleCategoryField && isNaN(Number(firstRow[k]))
    ) ||
    "radiusCategory";

  const valueField =
    (seriesDefs[0] && seriesDefs[0].field) ||
    engine.valueField ||
    Object.keys(firstRow).find((k) => !isNaN(Number(firstRow[k]))) ||
    "value";

  // ---- DISTINCT CATEGORIES FOR AXES ----

  const angleCats = Array.from(
    new Set(data.map((row) => row[angleCategoryField]))
  ).filter((v) => v !== undefined && v !== null);

  const radialCats = Array.from(
    new Set(data.map((row) => row[radialCategoryField]))
  ).filter((v) => v !== undefined && v !== null);

  const angleAxisData = angleCats.map((c) => ({
    [angleCategoryField]: c,
  }));
  const radialAxisData = radialCats.map((c) => ({
    [radialCategoryField]: c,
  }));

  // ---- BASE RADIAL CHART ----

  const { chart } = createRadialChart(root, engine);

  const angleAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, {
      categoryField: angleCategoryField,
      renderer: am5radar.AxisRendererCircular.new(root, {
        minGridDistance: 10,
      }),
    })
  );

  const radialAxis = chart.yAxes.push(
    am5xy.CategoryAxis.new(root, {
      categoryField: radialCategoryField,
      renderer: am5radar.AxisRendererRadial.new(root, {}),
    })
  );

  angleAxis.data.setAll(angleAxisData);
  radialAxis.data.setAll(radialAxisData);

  // ---- SERIES (RadarColumnSeries as tiles) ----

  const series = chart.series.push(
    am5radar.RadarColumnSeries.new(root, {
      name: seriesDefs[0]?.name || "Values",
      xAxis: angleAxis,
      yAxis: radialAxis,
      categoryXField: angleCategoryField,
      categoryYField: radialCategoryField,
      valueField,
    })
  );

  series.columns.template.setAll({
    strokeOpacity: 0,
    width: am5.percent(100),
    height: am5.percent(100),
    tooltipText: `{${angleCategoryField}} × {${radialCategoryField}}: {${valueField}}`,
    interactive: true,
  });

  // ---- HEAT RULES (yellow → red, scaled to data range) ----

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
      min: am5.color(0xfff6b7), // light yellow
      max: am5.color(0xff0000), // red
      dataField: valueField,
      minValue: minVal,
      maxValue: maxVal,
    },
  ]);

  series.data.setAll(data);
  series.appear(800);

  // ---- DECORATORS + BACKGROUND ----

  if (config.theme && config.theme.background) {
    applyChartBackground(root, chart, config.theme.background);
  }

  const cursor = null; // XY-style cursor breaks heatmaps
  const scrollbars = withScrollbars(root, chart, config.scrollbars || {});

  chart.appear(800, 100);

  const cleanup = () => {
    if (!root.isDisposed()) {
      root.dispose();
    }
  };

  return {
    chart,
    angleAxis,
    radialAxis,
    series: [series],
    cursor,
    scrollbars,
    cleanup,
  };
}
