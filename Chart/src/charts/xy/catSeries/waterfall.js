// src/charts/xy/catSeries/waterfall.js

import { createXYChart } from "../../../engines/xyEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withLegend } from "../../../decorators/withLegend.js";
import { withCursor } from "../../../decorators/withCursor.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

export function waterfallChart(root, config) {
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
  const mainSeries = seriesDefs[0];

  if (!mainSeries || !mainSeries.field) {
    throw new Error(
      "[Waterfall] engine.series[0].field is required for waterfall charts"
    );
  }

  const valueField = mainSeries.field;

  let categoryField =
    engine.categoryField || xCfg.field || (data[0] && Object.keys(data[0])[0]);

  // --- Build base XY chart ---

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
      min: firstY.min ?? 0,
      max: firstY.max,
    })
  );

  // --- Compute cumulative open/close per category ---

  let cumulative = 0;
  const wfData = data.map((row) => {
    const vRaw = row[valueField];
    const delta = typeof vRaw === "number" ? vRaw : Number(vRaw ?? 0) || 0;

    const open = cumulative;
    cumulative += delta;
    const close = cumulative;

    return {
      ...row,
      [categoryField]: row[categoryField],
      open,
      close,
    };
  });

  xAxis.data.setAll(wfData);

  const series = [];

  const s = chart.series.push(
    am5xy.ColumnSeries.new(root, {
      name: mainSeries.name || valueField,
      xAxis,
      yAxis,
      categoryXField: categoryField,
      valueYField: "close",
      openValueYField: "open",
      tooltip: am5.Tooltip.new(root, {
        labelText: "{name}: {valueY}",
      }),
    })
  );

  s.data.setAll(wfData);
  s.appear(800);
  series.push(s);

  // --- DECORATORS & BACKGROUND ---

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
