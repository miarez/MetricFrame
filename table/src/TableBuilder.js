// src/TableBuilder.js

import { Table } from "./Table.js";

export class TableBuilder {
  constructor() {
    this._containerId = "table";
    this._rows = [];
    this._info = null;

    // formatting config
    this._heatmapMode = null; // "global" | "perColumn" | "byDimension"
    this._heatmapDimKey = null;
    this._groupBorders = []; // [{ dimKey, options }]
    this._selectionMode = "value"; // "value" | "grain"
  }

  container(id) {
    this._containerId = id;
    return this;
  }

  // src/TableBuilder.js
  selectionMode(mode) {
    // mode: "value" | "grain"
    if (mode === "value" || mode === "grain") {
      this._selectionMode = mode;
    }
    return this;
  }

  /**
   * Primary API for your language-style integration.
   * df: array of row objects
   * info: profile / schema (may include rowDims, colDims, columnIndex, etc.)
   */
  data(df, info = null) {
    this._rows = df || [];
    this._info = info || null;
    return this;
  }

  /**
   * Backwards-compatible: if someone only passes rows,
   * we infer everything from scratch.
   */
  rows(rows) {
    this._rows = rows || [];
    this._info = null;
    return this;
  }

  // ---------- Formatting hooks (for regular table demos) ----------

  heatmapGlobal() {
    this._heatmapMode = "global";
    this._heatmapDimKey = null;
    return this;
  }

  heatmapPerColumn() {
    this._heatmapMode = "perColumn";
    this._heatmapDimKey = null;
    return this;
  }

  /**
   * mode: "global" | "perColumn"
   */
  heatmapByDimension(dimKey, mode = "global") {
    this._heatmapMode = "byDimension";
    this._heatmapDimKey = dimKey;
    this._heatmapDimMode = mode;
    return this;
  }

  groupBorders(dimKey, options = {}) {
    this._groupBorders.push({ dimKey, options });
    return this;
  }

  build() {
    console.log("selection_mode", this._selectionMode);
    const table = new Table(this._rows, {
      containerId: this._containerId,
      info: this._info,
      selectionMode: this._selectionMode,
    });

    // Apply heatmap formatting if configured
    if (this._heatmapMode === "global") {
      table.applyHeatmapGlobal();
    } else if (this._heatmapMode === "perColumn") {
      table.applyHeatmapPerColumn();
    } else if (this._heatmapMode === "byDimension" && this._heatmapDimKey) {
      table.applyHeatmapByDimension(this._heatmapDimKey, {
        mode: this._heatmapDimMode || "global",
      });
    }

    // Apply group borders (row grouping) if any
    for (const { dimKey, options } of this._groupBorders) {
      table.applyGroupBorders(dimKey, options);
    }

    return table;
  }
}
