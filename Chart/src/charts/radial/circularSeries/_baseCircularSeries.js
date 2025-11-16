// src/charts/radial/circularSeries/_baseCircularSeries.js

import { createRadialChart } from "../../../engines/radialEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withLegend } from "../../../decorators/withLegend.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

/**
 * Shared base for radar / polar charts (line, area, column, scatter)
 *
 * Supports:
 *  - Radar (categorical angle)
 *  - Polar (numeric angle)
 *  - Geoms: line, area, column, dot
 */
export function buildCircularSeriesChart(root, config) {
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

  // Determine chart mode
  const typeKey = (engine.chartType || "").toLowerCase();
  const isPolar = typeKey.startsWith("polar") || xCfg.type === "value";

  // ---- FIELD RESOLUTION ----
  const numericKeys = Object.keys(firstRow).filter(
    (k) => typeof firstRow[k] === "number"
  );

  // For radar (categorical)
  const categoryField =
    engine.categoryField ||
    xCfg.field ||
    Object.keys(firstRow).find((k) => isNaN(Number(firstRow[k]))) ||
    "category";

  // For polar (numeric angle)
  const defaultAngleField =
    engine.angleField || xCfg.field || numericKeys[0] || "angle";

  const primarySeries = seriesDefs[0];

  const defaultValueField =
    primarySeries?.field ||
    numericKeys.find((k) => k !== defaultAngleField) ||
    numericKeys[0] ||
    "value";
  // ---- BASE RADIAL CHART ----
  // ---- BASE RADIAL CHART ----

  const { chart } = createRadialChart(root, engine);

  let angleAxis; // <-- declare once, up here

  if (isPolar) {
    // numeric angle axis
    angleAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5radar.AxisRendererCircular.new(root, {
          minGridDistance: 30,
        }),
        min: xCfg.min,
        max: xCfg.max,
      })
    );

    // auto-fit angle domain to data if min/max weren't explicitly set
    const hasExplicitMin = typeof xCfg.min === "number";
    const hasExplicitMax = typeof xCfg.max === "number";

    if (!hasExplicitMin || !hasExplicitMax) {
      const angleFieldForDomain =
        seriesDefs[0]?.angleField ||
        engine.angleField ||
        xCfg.field ||
        defaultAngleField;

      let aMin = Infinity;
      let aMax = -Infinity;

      data.forEach((row) => {
        const v = Number(row[angleFieldForDomain]);
        if (!Number.isNaN(v)) {
          if (v < aMin) aMin = v;
          if (v > aMax) aMax = v;
        }
      });

      if (aMin < Infinity && aMax > -Infinity) {
        angleAxis.setAll({
          min: hasExplicitMin ? xCfg.min : aMin,
          max: hasExplicitMax ? xCfg.max : aMax,
          strictMinMax: true,
        });
      }
    }
  } else {
    // categorical angle axis (radar)
    angleAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField,
        renderer: am5radar.AxisRendererCircular.new(root, {
          minGridDistance: 30,
        }),
      })
    );
    angleAxis.data.setAll(data);
  }

  // radius (value) axis
  const firstY = yCfgs[0] || {};
  const radiusAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      renderer: am5radar.AxisRendererRadial.new(root, {}),
      min: firstY.min ?? 0,
      max: firstY.max,
    })
  );

  // ---- SERIES CREATION ----

  const series = seriesDefs.map((sDef, idx) => {
    const valueField = sDef.field || defaultValueField;
    const angleField = sDef.angleField || defaultAngleField;
    const geom = (sDef.geom || engine.chartType || "line").toLowerCase();

    // decide series class
    let SeriesClass = am5radar.RadarLineSeries;
    if (geom === "column") {
      SeriesClass = am5radar.RadarColumnSeries;
    }

    const commonOpts = {
      name: sDef.name || `Series ${idx + 1}`,
      xAxis: angleAxis,
      yAxis: radiusAxis,
      tooltip: am5.Tooltip.new(root, {
        labelText: isPolar
          ? `{${angleField}}°: {${valueField}}`
          : `{${categoryField}}: {${valueField}}`,
      }),
    };

    const fieldOpts = isPolar
      ? { valueXField: angleField, valueYField: valueField }
      : { categoryXField: categoryField, valueYField: valueField };

    const s = chart.series.push(
      SeriesClass.new(root, {
        ...commonOpts,
        ...fieldOpts,
      })
    );

    // --- geom-specific styling ---
    if (geom === "line") {
      s.strokes.template.setAll({ strokeWidth: sDef.strokeWidth ?? 2 });
      s.fills.template.set("visible", false);
    }

    if (geom === "area") {
      s.strokes.template.setAll({ strokeWidth: sDef.strokeWidth ?? 2 });
      s.fills.template.setAll({
        visible: true,
        fillOpacity: sDef.fillOpacity ?? 0.4,
      });
    }

    if (geom === "column" && s.columns) {
      s.columns.template.setAll({ strokeOpacity: 0 });
    }

    if (geom === "dot") {
      // bullets only
      s.strokes.template.set("visible", false);
      s.fills.template.set("visible", false);
      s.bullets.push(() =>
        am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, {
            radius: sDef.radius ?? 4,
            fill: s.get("fill"),
          }),
        })
      );
    }

    s.data.setAll(data);
    s.appear(800);
    return s;
  });

  // ---- DECORATORS ----

  if (config.theme && config.theme.background) {
    applyChartBackground(root, chart, config.theme.background);
  }

  const legend = withLegend(root, chart, series, config.legend || {});
  const cursor = null; // radar cursor later if needed
  const scrollbars = withScrollbars(root, chart, config.scrollbars || {});

  chart.appear(800, 100);

  const cleanup = () => {
    if (!root.isDisposed()) root.dispose();
  };

  return {
    chart,
    angleAxis,
    radiusAxis,
    series,
    legend,
    cursor,
    scrollbars,
    cleanup,
  };
}
