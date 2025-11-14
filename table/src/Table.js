// src/Table.js
import { Inference } from "../utils/Inference.js";
import { HeatmapConfig } from "../utils/config.js";

export class Table {
  /**
   * @param {Object[]} rows - array of row objects
   * @param {Object} options
   * @param {string} [options.containerId="table"] - ID of container div
   * @param {number} [options.facetMaxCard=12]
   * @param {number} [options.maxDimensions=4]
   */
  constructor(
    rows,
    { containerId = "table", facetMaxCard = 12, maxDimensions = 4 } = {}
  ) {
    this.rows = rows || [];
    this.containerId = containerId;
    this.containerEl = document.getElementById(containerId);

    if (!this.containerEl) {
      throw new Error(`No container element found with id="${containerId}"`);
    }

    // Inference: dimensions vs measures
    const { dimensions, measures, profile } = Inference.inferSchema(this.rows, {
      facetMaxCard,
      maxDimensions,
    });

    this.dimensions = dimensions;
    this.measures = measures;
    this.profile = profile;

    // Cast numeric columns
    this._castNumericColumns();

    // Bookkeeping for formatting
    this._lastSortedRows = null;
    this._lastTableEl = null;

    // Render immediately
    this._render();
  }

  // ---------- PUBLIC API: formatting ----------

  /**
   * Heatmap grouped by a dimension (e.g., "date").
   *
   * @param {string} dimKey - dimension column name (must be one of this.dimensions)
   * @param {Object} options
   * @param {"global"|"perColumn"} [options.mode="global"]
   *   - "global": single range per dimension value (all measure columns in that slice)
   *   - "perColumn": each measure column has its own range inside that dimension slice
   */
  applyHeatmapByDimension(dimKey, { mode = "global" } = {}) {
    if (!this._lastTableEl || !this._lastSortedRows) return;
    if (!this.dimensions.includes(dimKey)) {
      console.warn(
        `Dimension "${dimKey}" is not in this.dimensions`,
        this.dimensions
      );
      return;
    }

    this._clearHeatmap();
    this._applyHeatmapByDimension(
      this._lastTableEl,
      this._lastSortedRows,
      dimKey,
      mode
    );
  }
  /**
   * Global heatmap: all measure values share the same min/max range.
   */
  applyHeatmapGlobal() {
    if (!this._lastTableEl || !this._lastSortedRows) return;
    this._clearHeatmap(); // reset first
    this._applyHeatmapGlobal(this._lastTableEl, this._lastSortedRows);
  }

  /**
   * Per-column heatmap: each measure column gets its own min/max range.
   */
  applyHeatmapPerColumn() {
    if (!this._lastTableEl || !this._lastSortedRows) return;
    this._clearHeatmap(); // reset first
    this._applyHeatmapPerColumn(this._lastTableEl, this._lastSortedRows);
  }

  /**
   * Remove any existing heatmap styles.
   */
  clearHeatmap() {
    this._clearHeatmap();
  }

  // ---------- INTERNAL: casting, rendering, rowspans ----------

  _castNumericColumns() {
    const types = this.profile.types || {};
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

  _render() {
    // Clear container
    this.containerEl.innerHTML = "";

    // Create inner <table>
    const tableEl = document.createElement("table");
    this.containerEl.appendChild(tableEl);

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // Header row 1: "Dimensions" vs "Measures"
    const headerRow1 = document.createElement("tr");

    const dimGroupTh = document.createElement("th");
    dimGroupTh.colSpan = this.dimensions.length;
    dimGroupTh.textContent = "Dimensions";
    dimGroupTh.classList.add("dim-header");

    const measGroupTh = document.createElement("th");
    measGroupTh.colSpan = this.measures.length;
    measGroupTh.textContent = "Measures";
    measGroupTh.classList.add("dim-header");

    headerRow1.appendChild(dimGroupTh);
    headerRow1.appendChild(measGroupTh);

    // Header row 2: dimension + measure names
    const headerRow2 = document.createElement("tr");

    this.dimensions.forEach((dim) => {
      const th = document.createElement("th");
      th.textContent = dim;
      th.classList.add("dim-header");
      headerRow2.appendChild(th);
    });

    this.measures.forEach((meas) => {
      const th = document.createElement("th");
      th.textContent = meas;
      headerRow2.appendChild(th);
    });

    thead.appendChild(headerRow1);
    thead.appendChild(headerRow2);

    // Sort & compute rowspans
    const sortedRows = this._sortRows(this.rows);
    const spans = this._computeRowSpans(sortedRows);

    // Body rows
    for (let i = 0; i < sortedRows.length; i++) {
      const rowObj = sortedRows[i];
      const tr = document.createElement("tr");

      // Store all dimension values on the row for later grouping
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
          tr.appendChild(td);
        }
      });

      // Measure cells
      this.measures.forEach((mKey) => {
        const td = document.createElement("td");
        const value = rowObj[mKey];

        if (typeof value === "number") {
          if (Number.isInteger(value)) {
            // td.textContent = value.toLocaleString(); // <-- formats shit
            td.textContent = String(value);
          } else {
            td.textContent = value.toFixed(2);
          }
        } else {
          td.textContent = value;
        }

        // Tag measure cells so we can format them later
        td.dataset.role = "measure";
        td.dataset.col = mKey;
        if (typeof value === "number") {
          td.dataset.value = String(value);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    tableEl.appendChild(thead);
    tableEl.appendChild(tbody);

    // Keep references for later formatting calls
    this._lastSortedRows = sortedRows;
    this._lastTableEl = tableEl;
  }

  _sortRows(rows) {
    const dims = this.dimensions;
    return [...rows].sort((a, b) => {
      for (const key of dims) {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
      }
      return 0;
    });
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

  // ---------- INTERNAL: heatmap helpers ----------

  _clearHeatmap() {
    if (!this._lastTableEl) return;
    const tds = this._lastTableEl.querySelectorAll('td[data-role="measure"]');
    tds.forEach((td) => {
      td.style.backgroundColor = "";
      td.style.color = "";
    });
  }

  _applyHeatmapGlobal(tableEl, sortedRows) {
    const allValues = [];

    sortedRows.forEach((row) => {
      this.measures.forEach((mKey) => {
        const v = row[mKey];
        if (typeof v === "number" && !Number.isNaN(v)) {
          allValues.push(v);
        }
      });
    });

    const colorFor = this._createColorScale(allValues);

    const measureTds = tableEl.querySelectorAll('td[data-role="measure"]');
    measureTds.forEach((td) => {
      const v = Number(td.dataset.value);
      if (!Number.isNaN(v)) {
        const bg = colorFor(v);
        td.style.backgroundColor = bg;
        td.style.color = HeatmapConfig.textColor;
      }
    });
  }

  _applyHeatmapPerColumn(tableEl, sortedRows) {
    this.measures.forEach((mKey) => {
      const values = [];
      sortedRows.forEach((row) => {
        const v = row[mKey];
        if (typeof v === "number" && !Number.isNaN(v)) {
          values.push(v);
        }
      });

      const colorFor = this._createColorScale(values);
      const tds = tableEl.querySelectorAll(
        `td[data-role="measure"][data-col="${mKey}"]`
      );

      tds.forEach((td) => {
        const v = Number(td.dataset.value);
        if (!Number.isNaN(v)) {
          const bg = colorFor(v);
          td.style.backgroundColor = bg;
          td.style.color = HeatmapConfig.textColor;
        }
      });
    });
  }

  /**
   * Core function you asked for:
   * receives an array of values, finds min/max,
   * and returns a function value -> color (red→green gradient).
   */
  _createColorScale(values) {
    const nums = values.filter(
      (v) => typeof v === "number" && !Number.isNaN(v)
    );
    if (!nums.length) {
      return () => HeatmapConfig.nullColor;
    }

    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;

    const cMin = this._hexToRgb(HeatmapConfig.minColor);
    const cMax = this._hexToRgb(HeatmapConfig.maxColor);

    return (value) => {
      if (value == null || Number.isNaN(value)) {
        return HeatmapConfig.nullColor;
      }
      const tRaw = (value - min) / range;
      const t = Math.max(0, Math.min(1, tRaw));

      const r = Math.round(cMin.r + (cMax.r - cMin.r) * t);
      const g = Math.round(cMin.g + (cMax.g - cMin.g) * t);
      const b = Math.round(cMin.b + (cMax.b - cMin.b) * t);

      return `rgb(${r}, ${g}, ${b})`;
    };
  }

  _hexToRgb(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const int = parseInt(h, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }
  _applyHeatmapByDimension(tableEl, sortedRows, dimKey, mode) {
    // Group measure cells by dimension value (e.g., by date)
    const groups = Object.create(null);

    const measureTds = tableEl.querySelectorAll('td[data-role="measure"]');
    measureTds.forEach((td) => {
      const col = td.dataset.col;
      const v = Number(td.dataset.value);
      const row = td.parentElement;
      const dimValue = row.dataset[dimKey];

      if (dimValue === undefined) return;

      if (!groups[dimValue]) {
        groups[dimValue] = {
          cells: [], // all measure cells in this dimension slice
          valuesAll: [], // all numeric values in this slice
          cols: Object.create(null), // per-column bucket
        };
      }

      const group = groups[dimValue];
      group.cells.push(td);

      if (!Number.isNaN(v)) {
        group.valuesAll.push(v);

        if (!group.cols[col]) {
          group.cols[col] = { cells: [], values: [] };
        }
        group.cols[col].cells.push(td);
        group.cols[col].values.push(v);
      }
    });

    // Now apply coloring per group
    Object.values(groups).forEach((group) => {
      if (mode === "perColumn") {
        // Each column inside this dimension slice gets its own min/max
        Object.values(group.cols).forEach((colGroup) => {
          const colorFor = this._createColorScale(colGroup.values);
          colGroup.cells.forEach((td) => {
            const v = Number(td.dataset.value);
            if (!Number.isNaN(v)) {
              const bg = colorFor(v);
              td.style.backgroundColor = bg;
              td.style.color = HeatmapConfig.textColor;
            } else {
              td.style.backgroundColor = HeatmapConfig.nullColor;
              td.style.color = HeatmapConfig.textColor;
            }
          });
        });
      } else {
        // "global" within dimension slice: one min/max for ALL measure columns for that dim
        const colorFor = this._createColorScale(group.valuesAll);
        group.cells.forEach((td) => {
          const v = Number(td.dataset.value);
          if (!Number.isNaN(v)) {
            const bg = colorFor(v);
            td.style.backgroundColor = bg;
            td.style.color = HeatmapConfig.textColor;
          } else {
            td.style.backgroundColor = HeatmapConfig.nullColor;
            td.style.color = HeatmapConfig.textColor;
          }
        });
      }
    });
  }
}
