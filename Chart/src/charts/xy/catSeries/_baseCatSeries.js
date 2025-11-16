import { createXYChart } from "../../../engines/xyEngine.js";
import { applyChartBackground } from "../../../utils/applyChartBackground.js";
import { withLegend } from "../../../decorators/withLegend.js";
import { withCursor } from "../../../decorators/withCursor.js";
import { withScrollbars } from "../../../decorators/withScrollbars.js";

const STACKABLE_GEOMS = new Set(["column", "bar", "area"]);

export function buildCatSeriesChart(root, config) {
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

  // --- FIELDS ---

  let categoryField = engine.categoryField || xCfg.field;
  if (!categoryField && data.length) {
    const keys = Object.keys(data[0]);
    categoryField = keys.find((k) => isNaN(Number(data[0][k]))) || keys[0];
  }

  const firstSeries = seriesDefs[0];
  const valueField = firstSeries?.field;

  // --- CHART + X AXIS ---

  const { chart } = createXYChart(root, engine);

  const xAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, {
      categoryField,
      renderer: am5xy.AxisRendererX.new(root, {
        minGridDistance: 30,
      }),
    })
  );
  xAxis.data.setAll(data);

  // --- Y AXES (multi-axis support) ---

  const yAxisById = new Map();
  const axisStackingById = new Map();

  yCfgs.forEach((yCfg, idx) => {
    const id = yCfg.id || `y${idx}`;

    const renderer = am5xy.AxisRendererY.new(root, {
      opposite: yCfg.position === "right",
    });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer,
        min: yCfg.min ?? 0,
        max: yCfg.max,
      })
    );

    yAxisById.set(id, yAxis);

    let mode = "none";
    if (typeof yCfg.stacking === "string") {
      mode = yCfg.stacking.toLowerCase(); // "none" | "stacked" | "percent"
    } else if (yCfg.stacked) {
      mode = "stacked";
    }

    if (mode === "percent") {
      yAxis.set("calculateTotals", true);
    }

    axisStackingById.set(id, mode);
  });

  // fallbacks if no yCfgs somehow
  if (yAxisById.size === 0) {
    const renderer = am5xy.AxisRendererY.new(root, {});
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer, min: 0 })
    );
    yAxisById.set("y", yAxis);
    axisStackingById.set("y", "none");
  }

  const [primaryAxisId] = yAxisById.keys();
  const primaryYAxis = yAxisById.get(primaryAxisId);

  // --- SERIES ---

  const series = seriesDefs.map((sDef) => {
    const vf = sDef.field || valueField;

    const geom = (sDef.geom || engine.chartType || "column").toLowerCase();
    let SeriesClass = am5xy.ColumnSeries;
    if (
      geom === "line" ||
      geom === "area" ||
      geom === "dot" ||
      geom === "stream"
    ) {
      SeriesClass = am5xy.LineSeries;
    }

    const isStackableGeom = STACKABLE_GEOMS.has(geom);

    // choose axis for this series
    const axisIdFromSeries =
      sDef.axis || sDef.valueAxisId || sDef.yAxisId || primaryAxisId;

    const yAxis = yAxisById.get(axisIdFromSeries) || primaryYAxis;
    const axisStacking = axisStackingById.get(axisIdFromSeries) || "none";

    const tooltipText =
      axisStacking === "percent"
        ? "{name}: {valueYTotalPercent.formatNumber('0.0')}"
        : "{name}: {valueY}";

    const s = chart.series.push(
      SeriesClass.new(root, {
        name: sDef.name || vf,
        xAxis,
        yAxis,
        categoryXField: categoryField,
        valueYField: vf,
        tooltip: am5.Tooltip.new(root, {
          labelText: tooltipText,
        }),
      })
    );

    // styling for line/area/stream
    if (geom === "line") {
      s.strokes.template.setAll({
        strokeWidth: sDef.strokeWidth ?? 2,
      });
      s.fills.template.set("visible", false);
    }

    if (geom === "area" || geom === "stream") {
      s.strokes.template.setAll({
        strokeWidth: sDef.strokeWidth ?? 2,
      });
      s.fills.template.setAll({
        visible: true,
        fillOpacity: sDef.fillOpacity ?? 0.4,
      });
    }

    // dot → bullets only
    if (geom === "dot") {
      s.strokes.template.set("visible", false);
      s.fills.template.set("visible", false);
      s.bullets.push(() =>
        am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, {
            radius: sDef.radius ?? 5,
            fill: s.get("fill"),
          }),
        })
      );
    }

    // stacking per axis
    if (axisStacking !== "none" && isStackableGeom) {
      s.set("stacked", true);
      if (axisStacking === "percent") {
        s.set("valueYShow", "valueYTotalPercent");
      }
    }

    s.data.setAll(data);
    s.appear(800);
    return s;
  });

  // --- THEME + DECORATORS ---

  if (config.theme && config.theme.background) {
    applyChartBackground(root, chart, config.theme.background);
  }

  const legend = withLegend(root, chart, series, config.legend || {});
  const cursor = withCursor(
    root,
    chart,
    xAxis,
    primaryYAxis,
    config.cursor || {}
  );
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
    yAxis: primaryYAxis,
    yAxes: Array.from(yAxisById.values()),
    series,
    legend,
    cursor,
    scrollbars,
    cleanup,
  };
}
