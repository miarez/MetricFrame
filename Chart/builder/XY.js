// builder/XY.js

import { AxisBase, CategoryAxis, ValueAxis } from "./Axis.js";
import { Series } from "./Series.js";

export class XY {
  constructor() {
    // x: category x-axis
    const defaultXAxis = new CategoryAxis("x").build();
    // y: primary value axis
    const defaultYAxis = new ValueAxis("y").build();

    // inject orientation defaults here
    if (!defaultXAxis.position) defaultXAxis.position = "bottom";
    if (!defaultYAxis.position) defaultYAxis.position = "left";

    this._config = {
      engineType: "XY",
      chartType: null, // explicit override; if null we infer
      categoryField: null,
      axes: {
        x: defaultXAxis,
        y: [defaultYAxis],
      },
      series: [],
    };
  }

  chartType(chartType) {
    this._config.chartType = chartType;
    return this;
  }

  category(field) {
    this._config.categoryField = field;
    return this;
  }

  // X axis modifier (never changes id, respects existing position)
  xAxis(input = {}) {
    const raw = input instanceof AxisBase ? input.build() : input;

    const { id: _ignored, ...rest } = raw;

    Object.assign(this._config.axes.x, rest);

    // ensure we always have a position
    if (!this._config.axes.x.position) {
      this._config.axes.x.position = "bottom";
    }

    return this;
  }

  // Y axis upsert by id
  yAxis(input = {}) {
    const raw = input instanceof AxisBase ? input.build() : input;
    const id = raw.id;
    if (!id) {
      throw new Error("yAxis requires an 'id' (e.g. 'y', 'y2').");
    }

    const yAxes = this._config.axes.y;
    const existing = yAxes.find((a) => a.id === id);

    if (existing) {
      Object.assign(existing, raw);
      // preserve existing position unless user explicitly set one
      if (!existing.position) {
        existing.position = id === "y" ? "left" : "right";
      }
    } else {
      const position =
        raw.position ||
        (id === "y" ? "left" : yAxes.length === 0 ? "left" : "right");

      yAxes.push({
        id,
        type: raw.type || "value",
        position,
        ...raw,
      });
    }

    return this;
  }

  addSeries(seriesBuilder) {
    if (!(seriesBuilder instanceof Series)) {
      throw new Error("addSeries expects a Series instance.");
    }
    const built = seriesBuilder.build();
    this._config.series.push(built);
    return this;
  }

  /**
   * Optional helper if you ever want to inspect the inferred chartType
   * without finalizing the engine.
   */
  inferChartType() {
    const yAxes = this._config.axes.y;
    return inferChartTypeFromSeriesAndAxes(this._config.series, yAxes);
  }

  build() {
    if (!this._config.categoryField) {
      throw new Error("categoryField must be set.");
    }
    if (!this._config.series.length) {
      throw new Error("At least one series must be added.");
    }

    const categoryField = this._config.categoryField;
    const defaultXAxisId = this._config.axes.x?.id || "x";

    // auto-create missing Y axes referenced in series.axis
    const existingYIds = new Set(this._config.axes.y.map((a) => a.id));
    const usedAxisIds = new Set(this._config.series.map((s) => s.axis || "y"));

    usedAxisIds.forEach((axisId) => {
      if (!existingYIds.has(axisId)) {
        const axis = new ValueAxis(axisId).build();
        if (!axis.position) {
          axis.position = this._config.axes.y.length === 0 ? "left" : "right";
        }
        this._config.axes.y.push(axis);
        existingYIds.add(axisId);
      }
    });

    // normalize series defaults
    const normalizedSeries = this._config.series.map((s) => ({
      ...s,
      axis: s.axis || "y",
      xField: s.xField || categoryField,
      xAxisId: s.xAxisId || defaultXAxisId,
    }));

    const yAxes = this._config.axes.y;

    // stacking guardrail
    validateStackingPerAxis(normalizedSeries, yAxes);

    // chartType: explicit wins; else infer
    const inferredType = inferChartTypeFromSeriesAndAxes(
      normalizedSeries,
      yAxes
    );
    const chartType = this._config.chartType || inferredType;

    return {
      ...this._config,
      chartType,
      series: normalizedSeries,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers (same as before, reused)                                  */
/* ------------------------------------------------------------------ */

function normalizeGeom(s) {
  return (s.geom || "line").toLowerCase();
}

function inferChartTypeFromSeriesAndAxes(series, yAxes) {
  if (!Array.isArray(series) || series.length === 0) {
    return "column"; // safe fallback
  }

  const geoms = series.map(normalizeGeom);
  const uniqueGeoms = [...new Set(geoms)];

  const firstY = (Array.isArray(yAxes) && yAxes[0]) || {};
  const stackingRaw = (firstY.stacking || "").toLowerCase();
  const isStackedAxis =
    firstY.stacked === true || (stackingRaw && stackingRaw !== "none");

  // Single-geom charts
  if (uniqueGeoms.length === 1) {
    const g = uniqueGeoms[0];

    if (g === "column") {
      return isStackedAxis ? "stackedColumn" : "column";
    }

    if (g === "area") {
      return isStackedAxis ? "stackedArea" : "area";
    }

    if (g === "line") {
      return "line";
    }

    if (g === "dot") {
      return "dot";
    }

    if (g === "stream") {
      return "stream";
    }

    return "column";
  }

  // Mixed geoms → combo
  return "combo";
}

function validateStackingPerAxis(series, yAxes) {
  if (!Array.isArray(yAxes) || yAxes.length === 0) return;
  if (!Array.isArray(series) || series.length === 0) return;

  const axisById = new Map();
  yAxes.forEach((axis, idx) => {
    const id = axis.id || `y${idx}`;
    axisById.set(id, axis);
  });

  const geomsByAxis = new Map();

  series.forEach((s) => {
    const geom = normalizeGeom(s);
    const axisIdFromSeries = s.axis || s.valueAxisId || s.yAxisId;

    let axisId = axisIdFromSeries;
    if (!axisId) {
      const defaultAxis = yAxes[0];
      axisId = defaultAxis?.id || "y0";
    }

    if (!geomsByAxis.has(axisId)) {
      geomsByAxis.set(axisId, []);
    }
    geomsByAxis.get(axisId).push(geom);
  });

  for (const [axisId, geoms] of geomsByAxis.entries()) {
    const axis = axisById.get(axisId) || {};
    const stackingRaw = (axis.stacking || "").toLowerCase();
    const isStackedAxis =
      axis.stacked === true || (stackingRaw && stackingRaw !== "none");

    if (!isStackedAxis) continue;

    const uniqueGeoms = [...new Set(geoms)];

    if (uniqueGeoms.length > 1) {
      throw new Error(
        `Invalid config: axis "${axisId}" is stacked, but has multiple geometries: ` +
          uniqueGeoms.join(", ") +
          ". Use a single geom type per stacked axis."
      );
    }
  }
}
