// src/TableBuilder.js
import { TableCore } from "./TableCore.js";
import { TableFormatter } from "./TableFormatter.js";

export class TableBuilder {
  constructor() {
    this._rows = null;
    this._containerId = "table";
    this._facetMaxCard = 12;
    this._maxDimensions = 4;

    // list of (formatter) => void
    this._formatActions = [];
  }

  rows(rows) {
    this._rows = rows;
    return this;
  }

  container(id) {
    this._containerId = id;
    return this;
  }

  facetMaxCard(n) {
    this._facetMaxCard = n;
    return this;
  }

  maxDimensions(n) {
    this._maxDimensions = n;
    return this;
  }

  // ----- formatting options -----

  heatmapGlobal() {
    this._formatActions.push((fmt) => fmt.applyHeatmapGlobal());
    return this;
  }

  heatmapPerColumn() {
    this._formatActions.push((fmt) => fmt.applyHeatmapPerColumn());
    return this;
  }

  /**
   * @param {string} dimKey
   * @param {"global"|"perColumn"} mode
   */
  heatmapByDimension(dimKey, mode = "global") {
    this._formatActions.push((fmt) =>
      fmt.applyHeatmapByDimension(dimKey, { mode })
    );
    return this;
  }

  // ----- formatting options -----

  heatmapGlobal() {
    this._formatActions.push((fmt) => fmt.applyHeatmapGlobal());
    return this;
  }

  heatmapPerColumn() {
    this._formatActions.push((fmt) => fmt.applyHeatmapPerColumn());
    return this;
  }

  heatmapByDimension(dimKey, mode = "global") {
    this._formatActions.push((fmt) =>
      fmt.applyHeatmapByDimension(dimKey, { mode })
    );
    return this;
  }

  /**
   * Draw a border around each group of identical dimKey values.
   * e.g. .groupBorders("source")
   */
  groupBorders(dimKey, opts = {}) {
    this._formatActions.push((fmt) =>
      fmt.applyGroupBordersByDimension(dimKey, opts)
    );
    return this;
  }

  // ----- build -----

  build() {
    if (!this._rows) {
      throw new Error("TableBuilder: rows() must be provided before build().");
    }

    const core = new TableCore(this._rows, {
      containerId: this._containerId,
      facetMaxCard: this._facetMaxCard,
      maxDimensions: this._maxDimensions,
    });

    const formatter = new TableFormatter(core);

    // apply any queued formatting actions
    this._formatActions.forEach((fn) => fn(formatter));

    // return a façade that feels like your old Table API
    return {
      core,
      formatter,
      applyHeatmapGlobal: () => formatter.applyHeatmapGlobal(),
      applyHeatmapPerColumn: () => formatter.applyHeatmapPerColumn(),
      applyHeatmapByDimension: (dimKey, opts) =>
        formatter.applyHeatmapByDimension(dimKey, opts),
      clearHeatmap: () => formatter.clearHeatmap(),
      applyGroupBordersByDimension: (dimKey, opts) =>
        formatter.applyGroupBordersByDimension(dimKey, opts),
      clearGroupBorders: () => formatter.clearGroupBorders(),
    };
  }
}
