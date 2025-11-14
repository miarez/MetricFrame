// src/Table.js

import { Inference } from "../utils/Inference.js";
import { HeatmapConfig } from "../utils/config.js";

export class Table {
  /**
   * @param {Object[]} rows
   * @param {Object} options
   * @param {string} [options.containerId="table"]
   * @param {Object|null} [options.info=null] - optional schema/profile from your language
   *        May include: rowDims, colDims, measures, columnIndex, types, cardinality…
   */
  constructor(
    rows,
    {
      containerId = "table",
      info = null,
      facetMaxCard = 12,
      maxDimensions = 4,
      selectionMode = "value", // "value" | "grain"
    } = {}
  ) {
    this.rows = rows || [];
    this.info = info || null;
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

    this._initSchema({ facetMaxCard, maxDimensions });

    // Cast numeric columns based on profile.types
    this._castNumericColumns();

    // Bookkeeping for formatting & interactions
    this._lastSortedRows = null;
    this._lastTableEl = null;

    // Render table
    this._render();

    // Set up click-based interactions (highlighting, etc.)
    this._setupInteractions();
  }

  // ---------- PUBLIC API: formatting ----------

  applyHeatmapGlobal() {
    if (!this._lastTableEl || !this._lastSortedRows) return;
    this._clearHeatmap();
    this._applyHeatmapGlobal(this._lastTableEl, this._lastSortedRows);
  }

  applyHeatmapPerColumn() {
    if (!this._lastTableEl || !this._lastSortedRows) return;
    this._clearHeatmap();
    this._applyHeatmapPerColumn(this._lastTableEl, this._lastSortedRows);
  }

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

  clearHeatmap() {
    this._clearHeatmap();
  }

  /**
   * Draw group borders between blocks of the same dimension value.
   */
  applyGroupBorders(dimKey, { color = "#fff", width = "2px" } = {}) {
    if (!this._lastTableEl || !this._lastSortedRows) return;
    if (!this.dimensions.includes(dimKey)) return;

    const dimIdx = this.dimensions.indexOf(dimKey);
    const tbody = this._lastTableEl.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (!rows.length) return;

    let prevVal = null;

    rows.forEach((tr) => {
      const val = tr.dataset[dimKey];
      if (prevVal !== null && val !== prevVal) {
        // put a thick top border on this row to separate groups
        Array.from(tr.children).forEach((cell) => {
          cell.style.borderTop = `${width} solid ${color}`;
        });
      }
      prevVal = val;
    });
  }

  clearGroupBorders() {
    if (!this._lastTableEl) return;
    const tds = this._lastTableEl.querySelectorAll("td, th");
    tds.forEach((cell) => {
      cell.style.borderTop = "";
    });
  }

  // ---------- INTERNAL: schema / roles ----------

  _initSchema({ facetMaxCard, maxDimensions }) {
    if (this.info && Array.isArray(this.info.rowDims)) {
      // Use explicit schema from info
      this.dimensions = [...this.info.rowDims];

      // Measures: if explicitly provided, use them; otherwise infer
      if (Array.isArray(this.info.measures) && this.info.measures.length) {
        this.measures = [...this.info.measures];
      } else {
        // Fallback: any numeric column not in rowDims
        const types = this.info.types || {};
        const cols = Object.keys(types);
        this.measures = cols.filter(
          (c) => types[c] === "num" && !this.dimensions.includes(c)
        );
      }

      // Profile = info, but ensure we have types/cardinality
      const fallbackProfile = Inference.profile(this.rows, {
        facetMaxCard,
      });
      this.profile = {
        ...fallbackProfile,
        ...(this.info || {}),
      };

      // Column index: multi-index leaf metadata
      if (
        Array.isArray(this.info.columnIndex) &&
        this.info.columnIndex.length
      ) {
        this.columnIndex = this.info.columnIndex.map((c) => ({
          key: c.key,
          path: Array.isArray(c.path) ? c.path : [String(c.path ?? "")],
          dims: c.dims || {},
          measure: c.measure || null,
        }));
      } else {
        // no multi-index column metadata; treat each measure as a single-level header
        this.columnIndex = this.measures.map((m) => ({
          key: m,
          path: [m],
          dims: {},
          measure: m,
        }));
      }
    } else {
      // No external info → infer everything from scratch (regular table mode)
      const { dimensions, measures, profile } = Inference.inferSchema(
        this.rows,
        { facetMaxCard, maxDimensions }
      );

      this.dimensions = dimensions;
      this.measures = measures;
      this.profile = profile;

      this.columnIndex = this.measures.map((m) => ({
        key: m,
        path: [m],
        dims: {},
        measure: m,
      }));
    }
  }

  _castNumericColumns() {
    const types = this.profile?.types || {};
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
    const sortedRows = this._sortRows(this.rows);
    const spans = this._computeRowSpans(sortedRows);

    for (let i = 0; i < sortedRows.length; i++) {
      const rowObj = sortedRows[i];
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

    this._lastSortedRows = sortedRows;
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

  _sortRows(rows) {
    // IMPORTANT: do NOT change original ordering, just clone.
    return [...rows];
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

  // ---------- INTERACTIONS (click focus / highlight) ----------

  _setupInteractions() {
    const tableEl = this._lastTableEl;
    if (!tableEl) return;

    this._activeColumns = new Set();
    this._activeRowFilters = []; // [{ dimKey, value }]

    tableEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const multi = event.ctrlKey || event.metaKey;

      // If any selection active and this is not a multi-select click, clear selection & exit
      if (this._hasAnySelection() && !multi) {
        this._activeColumns.clear();
        this._activeRowFilters = [];
        this._applyFocusStyles();
        return;
      }

      if (target.tagName === "TH") {
        this._onHeaderClick(target, event);
      } else if (target.tagName === "TD") {
        this._onCellClick(target, event);
      }
    });
  }

  _hasAnySelection() {
    return (
      (this._activeColumns && this._activeColumns.size > 0) ||
      (this._activeRowFilters && this._activeRowFilters.length > 0)
    );
  }

  _onHeaderClick(th, event) {
    const headerRow = th.parentElement;
    const thead = headerRow?.parentElement;
    if (!thead) return;

    const multi = event.ctrlKey || event.metaKey;

    const headerRows = Array.from(thead.querySelectorAll("tr"));
    const firstHeaderRow = headerRows[0];
    const rowThs = Array.from(headerRow.querySelectorAll("th"));

    // Ignore row-dimension headers (only possible on first header row)
    if (headerRow === firstHeaderRow) {
      const dimThs = rowThs.slice(0, this.dimensions.length);
      if (dimThs.includes(th)) {
        return;
      }
    }

    // Compute starting leaf index by summing colSpans of measure headers before this one
    const startIdxInRow =
      headerRow === firstHeaderRow ? this.dimensions.length : 0;

    let startLeaf = 0;
    for (let i = startIdxInRow; i < rowThs.length; i++) {
      const cell = rowThs[i];
      if (cell === th) break;
      startLeaf += cell.colSpan || 1;
    }
    const spanLeaf = th.colSpan || 1;

    const level = headerRows.indexOf(headerRow); // which header depth this is

    if (!multi) {
      this._activeColumns.clear();
    }

    let leafIndices = [];

    // ---------- GRAIN MODE ----------
    if (this._selectionMode === "grain") {
      // Only the leaves directly under this header
      for (let i = startLeaf; i < startLeaf + spanLeaf; i++) {
        if (this.columnIndex[i]) leafIndices.push(i);
      }
    } else {
      // ---------- VALUE MODE ----------
      // All leaves whose header at this level has the same label
      const baseCol = this.columnIndex[startLeaf];
      const targetLabel =
        baseCol && baseCol.path && baseCol.path.length > level
          ? baseCol.path[level]
          : undefined;

      for (let i = 0; i < this.columnIndex.length; i++) {
        const col = this.columnIndex[i];
        const label =
          col.path && col.path.length > level ? col.path[level] : undefined;
        if (label === targetLabel) {
          leafIndices.push(i);
        }
      }
    }

    // Toggle all selected leaf columns
    for (const idx of leafIndices) {
      const colInfo = this.columnIndex[idx];
      if (!colInfo) continue;
      const leafKey = colInfo.key;
      if (this._activeColumns.has(leafKey)) {
        this._activeColumns.delete(leafKey);
      } else {
        this._activeColumns.add(leafKey);
      }
    }

    this._applyFocusStyles();
  }
  _onCellClick(td, event) {
    const tr = td.parentElement;
    if (!tr) return;
    const multi = event.ctrlKey || event.metaKey;

    const dimCells = Array.from(tr.querySelectorAll("td.dim"));
    const clickedCellIndex = Array.from(tr.children).indexOf(td);
    const dimIdx = dimCells.findIndex((cell) => cell === td);
    const isMeasureCell =
      dimIdx === -1 && clickedCellIndex >= this.dimensions.length;

    // Build a "grain" selector = all dims for this row
    // Build a "grain" selector; maxDimIdx controls how many dims we include.
    const makeGrainSelector = (maxDimIdx = this.dimensions.length - 1) => {
      const dims = {};
      for (let i = 0; i <= maxDimIdx; i++) {
        const dimKey = this.dimensions[i];
        dims[dimKey] = tr.dataset[dimKey];
      }
      return { type: "grain", dims };
    };
    const grainsEqual = (a, b) => {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      for (const k of ka) {
        if (a[k] !== b[k]) return false;
      }
      return true;
    };

    const toggleSelector = (sel) => {
      if (!multi) {
        // single-select
        this._activeRowFilters = [sel];
        return;
      }

      if (sel.type === "grain") {
        const idx = this._activeRowFilters.findIndex(
          (f) => f.type === "grain" && grainsEqual(f.dims, sel.dims)
        );
        if (idx >= 0) {
          this._activeRowFilters.splice(idx, 1);
        } else {
          this._activeRowFilters.push(sel);
        }
      } else if (sel.type === "dim") {
        const idx = this._activeRowFilters.findIndex(
          (f) =>
            f.type === "dim" && f.dimKey === sel.dimKey && f.value === sel.value
        );
        if (idx >= 0) {
          this._activeRowFilters.splice(idx, 1);
        } else {
          this._activeRowFilters.push(sel);
        }
      }
    };

    // ---------- GRAIN MODE ----------
    // ---------- GRAIN MODE ----------
    if (this._selectionMode === "grain") {
      let sel;

      if (isMeasureCell) {
        // measure click → full row grain (all dimensions)
        sel = makeGrainSelector(); // uses all dims
      } else if (dimIdx !== -1) {
        // dimension click → grain up to that level
        // e.g. clicking "source" (dimIdx 0) groups by source only
        // clicking "date" (dimIdx 1) groups by source+date, etc.
        sel = makeGrainSelector(dimIdx);
      } else {
        // fallback: full grain
        sel = makeGrainSelector();
      }

      toggleSelector(sel);
      this._applyFocusStyles();
      return; // don't fall through into value-mode logic
    }
    // ---------- VALUE MODE ----------

    // Measure click in value mode → treat as grain (single row)
    if (isMeasureCell) {
      const sel = makeGrainSelector();
      toggleSelector(sel);
      this._applyFocusStyles();
      return;
    }

    // Dimension click in value mode → all rows with that dim == value
    if (dimIdx !== -1) {
      const dimKey = this.dimensions[dimIdx];
      const value = tr.dataset[dimKey];
      const sel = { type: "dim", dimKey, value };
      toggleSelector(sel);
      this._applyFocusStyles();
    }
  }
  _applyFocusStyles() {
    if (!this._lastTableEl) return;

    const hasColSel = this._activeColumns && this._activeColumns.size > 0;
    const hasRowSel =
      this._activeRowFilters && this._activeRowFilters.length > 0;

    const tbodyRows = this._lastTableEl.querySelectorAll("tbody tr");
    const allCells = this._lastTableEl.querySelectorAll("td, th");

    // reset
    allCells.forEach((cell) => {
      cell.classList.remove("muted");
      cell.classList.remove("highlight");
    });

    if (!hasColSel && !hasRowSel) {
      return; // nothing selected
    }

    // Row filter: keep only rows that match all active filters
    const selectorMatchesRow = (sel, tr) => {
      if (sel.type === "dim") {
        return tr.dataset[sel.dimKey] === String(sel.value);
      }
      if (sel.type === "grain") {
        const dims = sel.dims;
        for (const k in dims) {
          if (tr.dataset[k] !== String(dims[k])) return false;
        }
        return true;
      }
      return false;
    };

    // Row filter: keep rows that match ANY selector (OR)
    tbodyRows.forEach((tr) => {
      let matchesRow = true;
      if (hasRowSel) {
        matchesRow = this._activeRowFilters.some((sel) =>
          selectorMatchesRow(sel, tr)
        );
      }

      const cells = Array.from(tr.children);
      if (!matchesRow) {
        cells.forEach((c) => c.classList.add("muted"));
      } else if (hasColSel) {
        // highlight only selected columns in matching rows
        cells.forEach((c) => {
          if (c.dataset.role === "measure") {
            const key = c.dataset.col;
            if (this._activeColumns.has(key)) {
              c.classList.add("highlight");
            } else {
              c.classList.add("muted");
            }
          }
        });
      } else {
        // Row selection only
        cells.forEach((c) => c.classList.add("highlight"));
      }
    });
    // Column-only selection (no row filters): highlight entire columns
    if (hasColSel && !hasRowSel) {
      const measureCells = this._lastTableEl.querySelectorAll(
        'td[data-role="measure"]'
      );
      measureCells.forEach((td) => {
        const key = td.dataset.col;
        if (this._activeColumns.has(key)) {
          td.classList.add("highlight");
        } else {
          td.classList.add("muted");
        }
      });
    }
  }

  // ---------- HEATMAP HELPERS (unchanged from earlier version) ----------

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
      this.columnIndex.forEach((colInfo) => {
        const v = row[colInfo.key];
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
    this.columnIndex.forEach((colInfo) => {
      const key = colInfo.key;
      const values = [];
      sortedRows.forEach((row) => {
        const v = row[key];
        if (typeof v === "number" && !Number.isNaN(v)) {
          values.push(v);
        }
      });

      const colorFor = this._createColorScale(values);
      const tds = tableEl.querySelectorAll(
        `td[data-role="measure"][data-col="${key}"]`
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

  _applyHeatmapByDimension(tableEl, sortedRows, dimKey, mode) {
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
          cells: [],
          valuesAll: [],
          cols: Object.create(null),
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

    Object.values(groups).forEach((group) => {
      if (mode === "perColumn") {
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
}
