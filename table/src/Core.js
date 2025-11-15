// src/Table.js

import { Interaction } from "./Interaction.js";
import { Heatmap } from "./Heatmap.js";
import { Border } from "./Border.js";

export class Core {
  /**
   * @param {Object[]} rows
   * @param {Object} options
   * @param {string} [options.containerId="table"]
   * @param {Object|null} [options.info=null]
   *        Expected to include at least: rowDims, measures, columnIndex, types?
   */
  constructor(
    rows,
    {
      containerId = "table",
      info = null,
      selectionMode = "value", // "value" | "grain"
    } = {}
  ) {
    this.rows = rows || [];
    this.info = info || {};
    this.containerId = containerId;
    this.containerEl = document.getElementById(containerId);

    if (!this.containerEl) {
      throw new Error(`No container element found with id="${containerId}"`);
    }

    this._selectionMode = selectionMode;

    // schema / roles
    this.dimensions = [];
    this.measures = [];
    this.profile = null;
    this.columnIndex = []; // multi-index metadata for measure columns

    this._initSchema();

    // Cast numeric columns based on types (if provided)
    this._castNumericColumns();

    // Bookkeeping for formatting & interactions
    this._lastTableEl = null;

    // Render table
    this._render();

    // Attach helpers
    this.interaction = new Interaction(this);
    this.heatmap = new Heatmap(this);
    this.border = new Border(this);
  }

  // ---------- GETTERS ----------

  getTableElement() {
    return this._lastTableEl;
  }

  // ---------- PUBLIC API: heatmap ----------

  applyHeatmapGlobal() {
    if (!this.heatmap) return;
    this.heatmap.applyGlobal();
  }

  applyHeatmapPerColumn() {
    if (!this.heatmap) return;
    this.heatmap.applyPerColumn();
  }

  applyHeatmapByDimension(dimKey, { mode = "global" } = {}) {
    if (!this.heatmap) return;
    this.heatmap.applyByDimension(dimKey, mode);
  }

  clearHeatmap() {
    if (!this.heatmap) return;
    this.heatmap.clear();
  }

  // ---------- PUBLIC API: borders ----------

  applyGroupBorders(dimKey, options = {}) {
    if (!this.border) return;
    this.border.applyGroupBorders(dimKey, options);
  }

  clearGroupBorders() {
    if (!this.border) return;
    this.border.clearGroupBorders();
  }

  // ---------- INTERNAL: schema / roles ----------

  _initSchema() {
    const info = this.info || {};

    // Row dimensions and measures come straight from info
    this.dimensions = Array.isArray(info.rowDims) ? [...info.rowDims] : [];
    this.measures = Array.isArray(info.measures) ? [...info.measures] : [];

    // Profile is just a thin wrapper around info (if you ever need it later)
    this.profile = {
      types: info.types || {},
      cardinality: info.cardinality || {},
      ...info,
    };

    // Column index: use provided, or default to single-level headers for measures
    if (Array.isArray(info.columnIndex) && info.columnIndex.length) {
      this.columnIndex = info.columnIndex.map((c) => ({
        key: c.key,
        path: Array.isArray(c.path) ? c.path : [String(c.path ?? "")],
        dims: c.dims || {},
        measure: c.measure || c.key,
      }));
    } else {
      this.columnIndex = this.measures.map((m) => ({
        key: m,
        path: [m],
        dims: {},
        measure: m,
      }));
    }
  }

  // This should also probably be removed down the line
  _castNumericColumns() {
    // Only cast if upstream told us which columns are numeric
    const types = this.info?.types || this.profile?.types || {}; // profile is basically info anyway

    const cols = Object.keys(types);

    this.rows.forEach((r) => {
      cols.forEach((col) => {
        if (types[col] === "num") {
          const n = Number(r[col]);
          if (!Number.isNaN(n)) {
            r[col] = n;
          }
        }
      });
    });
  }

  // ---------- RENDER ----------

  _render() {
    // Clear container
    this.containerEl.innerHTML = "";

    const tableEl = document.createElement("table");
    this.containerEl.appendChild(tableEl);

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    this._renderHeader(thead);

    // Body rows
    const spans = this._computeRowSpans(this.rows);

    for (let i = 0; i < this.rows.length; i++) {
      const rowObj = this.rows[i];
      const tr = document.createElement("tr");

      // store all dimension values as data attributes for selection/grouping
      this.dimensions.forEach((dimKey) => {
        tr.dataset[dimKey] = rowObj[dimKey];
      });

      // Dimension cells (with rowSpan)
      this.dimensions.forEach((dimKey, dimIdx) => {
        const span = spans[i][dimIdx];
        if (span > 0) {
          const td = document.createElement("td");
          td.textContent = rowObj[dimKey];
          td.rowSpan = span;
          td.classList.add("dim");
          td.dataset.dimKey = dimKey;
          tr.appendChild(td);
        }
      });

      // Measure cells: walk through columnIndex leaf keys
      this.columnIndex.forEach((colInfo) => {
        const key = colInfo.key;
        const value = rowObj[key];
        const td = document.createElement("td");

        if (typeof value === "number") {
          if (Number.isInteger(value)) {
            td.textContent = String(value);
          } else {
            td.textContent = value.toFixed(2);
          }
        } else {
          td.textContent = value != null ? String(value) : "";
        }

        td.dataset.role = "measure";
        td.dataset.col = key;
        td.dataset.measure = colInfo.measure || key;
        if (typeof value === "number") {
          td.dataset.value = String(value);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    tableEl.appendChild(thead);
    tableEl.appendChild(tbody);

    this._lastTableEl = tableEl;
  }

  _renderHeader(thead) {
    thead.innerHTML = "";

    const headerDepth =
      this.columnIndex.length === 0
        ? 1
        : this.columnIndex.reduce(
            (max, col) => Math.max(max, col.path.length || 1),
            1
          );

    for (let level = 0; level < headerDepth; level++) {
      const tr = document.createElement("tr");

      // On the first header row, render row-dim headers and rowSpan them across all header rows.
      if (level === 0) {
        this.dimensions.forEach((dim) => {
          const th = document.createElement("th");
          th.textContent = dim;
          th.classList.add("dim-header");
          if (headerDepth > 1) {
            th.rowSpan = headerDepth;
          }
          tr.appendChild(th);
        });
      }

      // Column headers for this level: compress runs with same label into colSpans
      let i = 0;
      while (i < this.columnIndex.length) {
        const col = this.columnIndex[i];
        const labelRaw =
          col.path && col.path.length > level ? col.path[level] : "";
        const label =
          labelRaw === null || labelRaw === undefined ? "" : String(labelRaw);

        let span = 1;
        let j = i + 1;
        while (
          j < this.columnIndex.length &&
          (this.columnIndex[j].path && this.columnIndex[j].path.length > level
            ? this.columnIndex[j].path[level]
            : "") === labelRaw
        ) {
          span++;
          j++;
        }

        const th = document.createElement("th");
        th.textContent = label;
        if (span > 1) th.colSpan = span;
        tr.appendChild(th);

        i = j;
      }

      thead.appendChild(tr);
    }
  }

  _computeRowSpans(rows) {
    const n = rows.length;
    const d = this.dimensions.length;
    const spans = Array.from({ length: n }, () => Array(d).fill(0));

    for (let dimIdx = 0; dimIdx < d; dimIdx++) {
      let row = 0;
      while (row < n) {
        let span = 1;

        while (
          row + span < n &&
          this._dimsEqualUpTo(rows[row], rows[row + span], dimIdx)
        ) {
          span++;
        }

        spans[row][dimIdx] = span;
        for (let k = 1; k < span; k++) {
          spans[row + k][dimIdx] = 0;
        }

        row += span;
      }
    }

    return spans;
  }

  _dimsEqualUpTo(rowA, rowB, upToIdx) {
    for (let i = 0; i <= upToIdx; i++) {
      const key = this.dimensions[i];
      if (rowA[key] !== rowB[key]) return false;
    }
    return true;
  }
}
