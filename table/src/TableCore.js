// src/TableCore.js
import { Inference } from "../utils/Inference.js";

export class TableCore {
  /**
   * @param {Object[]} rows
   * @param {Object} options
   * @param {string} [options.containerId="table"]
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

    const { dimensions, measures, profile } = Inference.inferSchema(this.rows, {
      facetMaxCard,
      maxDimensions,
    });

    this.dimensions = dimensions;
    this.measures = measures;
    this.profile = profile;

    this._castNumericColumns();

    this._lastSortedRows = null;
    this._lastTableEl = null;

    // interaction state
    this._activeColumns = new Set(); // Set<string> of measure keys
    this._activeRowFilters = []; // Array<{ dimKey, value }>

    this._render();
    this._setupInteractions();
  }

  // ---- PUBLIC READ API ----

  getTableElement() {
    return this._lastTableEl;
  }

  getSortedRows() {
    // "sorted" here just means "display order" (we don't sort internally)
    return this._lastSortedRows;
  }

  getDimensions() {
    return this.dimensions;
  }

  getMeasures() {
    return this.measures;
  }

  getProfile() {
    return this.profile;
  }

  // ---- INTERNAL: data prep + render ----

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

  // --- HELPER
  _hasAnySelection() {
    return this._activeColumns.size > 0 || this._activeRowFilters.length > 0;
  }

  _render() {
    this.containerEl.innerHTML = "";

    const tableEl = document.createElement("table");
    this.containerEl.appendChild(tableEl);

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // ---- SINGLE HEADER ROW: dimensions + measures in original order ----
    const headerRow = document.createElement("tr");

    this.dimensions.forEach((dim) => {
      const th = document.createElement("th");
      th.textContent = dim;
      th.classList.add("dim-header");
      headerRow.appendChild(th);
    });

    this.measures.forEach((meas) => {
      const th = document.createElement("th");
      th.textContent = meas;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    // ---- BODY (NO SORTING: preserve original row order) ----
    const renderRows = this.rows;
    const spans = this._computeRowSpans(renderRows);

    for (let i = 0; i < renderRows.length; i++) {
      const rowObj = renderRows[i];
      const tr = document.createElement("tr");

      // store dim values on row for grouping/formatting/interactions
      this.dimensions.forEach((dimKey) => {
        tr.dataset[dimKey] = rowObj[dimKey];
      });

      // dimension cells with rowSpan
      this.dimensions.forEach((dimKey, dimIdx) => {
        const span = spans[i][dimIdx];
        if (span > 0) {
          const td = document.createElement("td");
          td.textContent = rowObj[dimKey];
          td.rowSpan = span;
          td.classList.add("dim");

          // NEW: mark this explicitly as a dimension cell
          td.dataset.role = "dimension";
          td.dataset.dimKey = dimKey;

          tr.appendChild(td);
        }
      });

      // measure cells
      this.measures.forEach((mKey) => {
        const td = document.createElement("td");
        const value = rowObj[mKey];

        if (typeof value === "number") {
          if (Number.isInteger(value)) {
            td.textContent = String(value); // no thousands separators
          } else {
            td.textContent = value.toFixed(2);
          }
          td.dataset.value = String(value);
        } else {
          td.textContent = value;
        }

        td.dataset.role = "measure";
        td.dataset.col = mKey;

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    tableEl.appendChild(thead);
    tableEl.appendChild(tbody);

    this._lastSortedRows = renderRows;
    this._lastTableEl = tableEl;
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

  // ---- INTERACTIONS: column + row focus ----

  _setupInteractions() {
    const tableEl = this._lastTableEl;
    if (!tableEl) return;

    tableEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const multi = event.ctrlKey || event.metaKey;

      // --- GLOBAL ESCAPE LOGIC ---
      // If any selection is active and this is NOT a multi-select click,
      // then clear everything and stop. One-click escape from highlight mode.
      if (this._hasAnySelection() && !multi) {
        this._activeColumns.clear();
        this._activeRowFilters = [];
        this._applyFocusStyles();
        return;
      }

      // --- Normal behavior (possibly multi-select) ---
      if (target.tagName === "TH") {
        this._onHeaderClick(target, event);
      } else if (target.tagName === "TD") {
        this._onCellClick(target, event);
      }
    });
  }

  _onHeaderClick(th, event) {
    const idx = th.cellIndex;
    const key =
      idx < this.dimensions.length
        ? this.dimensions[idx]
        : this.measures[idx - this.dimensions.length];

    // Only allow column focus for measures
    if (!this.measures.includes(key)) {
      // Clicking a dimension header clears focus (unless ctrl/meta held, then ignore)
      if (!event.ctrlKey && !event.metaKey) {
        this._activeColumns.clear();
        this._activeRowFilters = [];
        this._applyFocusStyles();
      }
      return;
    }

    const multi = event.ctrlKey || event.metaKey;

    if (multi) {
      // Toggle membership in multi-select set
      if (this._activeColumns.has(key)) {
        this._activeColumns.delete(key);
      } else {
        this._activeColumns.add(key);
      }
      // Do NOT touch row filters in multi mode
    } else {
      // Single-select behavior
      if (this._activeColumns.size === 1 && this._activeColumns.has(key)) {
        // clicking same again → clear
        this._activeColumns.clear();
      } else {
        this._activeColumns = new Set([key]);
      }
      // Column click (single) clears row filters
      this._activeRowFilters = [];
    }

    this._applyFocusStyles();
  }

  _onCellClick(td, event) {
    const tr = td.parentElement;
    if (!tr || !tr.closest("tbody")) return;

    // Only respond to dimension cells
    if (td.dataset.role !== "dimension") return;

    const dimKey = td.dataset.dimKey;
    if (!dimKey) return;
    const value = tr.dataset[dimKey];

    const multi = event.ctrlKey || event.metaKey;

    const idx = this._activeRowFilters.findIndex(
      (f) => f.dimKey === dimKey && f.value === value
    );

    if (multi) {
      // toggle this filter in the list
      if (idx >= 0) {
        this._activeRowFilters.splice(idx, 1);
      } else {
        this._activeRowFilters.push({ dimKey, value });
      }
      // do NOT touch activeColumns in multi mode
    } else {
      // single-select behavior
      if (this._activeRowFilters.length === 1 && idx === 0) {
        // clicking same again → clear
        this._activeRowFilters = [];
      } else {
        this._activeRowFilters = [{ dimKey, value }];
      }
      // Row click (single) clears column focus
      this._activeColumns.clear();
    }

    this._applyFocusStyles();
  }

  _applyFocusStyles() {
    const tableEl = this._lastTableEl;
    if (!tableEl) return;

    const allCells = tableEl.querySelectorAll("th, td");
    const bodyRows = tableEl.querySelectorAll("tbody tr");

    // Clear previous muted state
    allCells.forEach((el) => el.classList.remove("muted"));
    bodyRows.forEach((el) => el.classList.remove("muted"));

    const hasColSel = this._activeColumns.size > 0;
    const hasRowSel = this._activeRowFilters.length > 0;

    if (!hasColSel && !hasRowSel) return; // nothing selected

    // ---- Headers ----
    const headerRow = tableEl.querySelector("thead tr");
    if (headerRow && hasColSel) {
      const ths = Array.from(headerRow.cells);
      ths.forEach((th, idx) => {
        const key =
          idx < this.dimensions.length
            ? this.dimensions[idx]
            : this.measures[idx - this.dimensions.length];

        // Only mute measure headers that are NOT selected
        if (this.measures.includes(key) && !this._activeColumns.has(key)) {
          th.classList.add("muted");
        }
      });
    }

    // ---- Body rows + cells ----
    bodyRows.forEach((tr) => {
      const rowMatches =
        !hasRowSel ||
        this._activeRowFilters.some((f) => tr.dataset[f.dimKey] === f.value);

      if (!rowMatches) {
        // whole row muted
        tr.classList.add("muted");
        return;
      }

      // row is active; handle column-based muting
      if (hasColSel) {
        const measureTds = tr.querySelectorAll('td[data-role="measure"]');
        measureTds.forEach((td) => {
          const colKey = td.dataset.col;
          if (!this._activeColumns.has(colKey)) {
            td.classList.add("muted");
          }
        });
      }
    });
  }
}
