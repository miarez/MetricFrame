// src/charts/xy/catSeries/stream.js

import { createXYChart } from "../../../engines/xyEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withLegend } from "../../../decorators/withLegend.js";
import { withCursor } from "../../../decorators/withCursor.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

/**
 * Build ThemeRiver / Stream chart using SmoothedXLineSeries.
 *
 * Assumptions:
 *  - engine.categoryField set (or inferred from data)
 *  - engine.series[i].field = original value field
 */
export function streamChart(root, config) {
  const engine = config.engine || {};
  const rawData = Array.isArray(config.data) ? config.data : [];

  const axesCfg = engine.axes || {};
  const xCfg = axesCfg.x || {};
  const yCfgs = Array.isArray(axesCfg.y)
    ? axesCfg.y
    : axesCfg.y
    ? [axesCfg.y]
    : [];

  const seriesDefs = Array.isArray(engine.series) ? engine.series : [];
  if (!seriesDefs.length) {
    throw new Error("[Stream] engine.series must contain at least one series");
  }

  // --- CATEGORY FIELD ---

  let categoryField =
    engine.categoryField ||
    xCfg.field ||
    (rawData[0] && Object.keys(rawData[0])[0]);

  // --- BASE CHART + AXES ---

  const { chart } = createXYChart(root, engine);

  const xAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, {
      categoryField,
      renderer: am5xy.AxisRendererX.new(root, {
        minGridDistance: 30,
      }),
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

  // --- PREPROCESS DATA FOR STREAM OFFSETS ---

  const streamData = buildStreamData(rawData, seriesDefs, categoryField);
  xAxis.data.setAll(streamData);

  // --- SERIES ---

  const series = [];

  for (const sDef of seriesDefs) {
    const field = sDef.field;
    if (!field) continue;

    const valueField = `${field}_streamValue`;
    const openField = `${field}_streamOpen`;

    const s = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: sDef.name || field,
        xAxis,
        yAxis,
        categoryXField: categoryField,
        valueYField: valueField,
        openValueYField: openField,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: {valueY}",
        }),
      })
    );

    // fill as an area
    s.fills.template.setAll({
      visible: true,
      fillOpacity: 1,
    });
    s.strokes.template.setAll({
      strokeOpacity: 0.7,
      strokeWidth: 2,
    });

    s.data.setAll(streamData);
    s.appear(800);
    series.push(s);
  }

  // --- DECORATORS + BACKGROUND ---

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

/**
 * For each category, compute centered open/close bands per series.
 *
 * For a row with values v1..vn:
 *   total = v1 + ... + vn
 *   offset = -total / 2
 *   series1: open=offset, close=offset+v1
 *   series2: open=close1, close=close1+v2
 *   ...
 */
function buildStreamData(rawData, seriesDefs, categoryField) {
  return rawData.map((row) => {
    const out = { ...row };

    // collect numeric values for each series
    const values = seriesDefs.map((s) => {
      const f = s.field;
      const v = row[f];
      const n = typeof v === "number" ? v : Number(v ?? 0);
      return Number.isFinite(n) ? n : 0;
    });

    const total = values.reduce((a, b) => a + b, 0);
    let offset = -total / 2; // center around zero

    values.forEach((v, idx) => {
      const sDef = seriesDefs[idx];
      const f = sDef.field;

      const open = offset;
      const close = offset + v;

      out[`${f}_streamOpen`] = open;
      out[`${f}_streamValue`] = close;

      offset = close;
    });

    // category value stays as-is
    out[categoryField] = row[categoryField];

    return out;
  });
}
