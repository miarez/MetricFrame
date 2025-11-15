// src/Interaction.js

export class Interaction {
  /**
   * @param {Table} table - an instance of Table
   */
  constructor(table) {
    this.table = table;
    this.tableEl = table.getTableElement();
    this.dimensions = table.dimensions;
    this.columnIndex = table.columnIndex;
    this._selectionMode = table._selectionMode; // "value" | "grain"

    if (!this.tableEl) return;

    this._activeColumns = new Set();
    this._activeRowFilters = []; // [{ type: "grain" | "dim", ... }]

    this._setupInteractions();
  }

  _setupInteractions() {
    const tableEl = this.tableEl;
    if (!tableEl) return;

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

    // ✅ NEW: detect type by attributes, not position
    const isMeasureCell = td.dataset.role === "measure";

    // ✅ NEW: find which dimension this cell represents (if any)
    let dimIdx = -1;
    if (td.classList.contains("dim")) {
      const dimKey = td.dataset.dimKey;
      dimIdx = this.dimensions.indexOf(dimKey); // 0 = source, 1 = day, ...
    }

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
    if (this._selectionMode === "grain") {
      let sel;

      if (isMeasureCell) {
        sel = makeGrainSelector(); // all dims
      } else if (dimIdx !== -1) {
        sel = makeGrainSelector(dimIdx); // up to clicked dim
      } else {
        sel = makeGrainSelector();
      }

      toggleSelector(sel);
      this._applyFocusStyles();
      return;
    }

    // ---------- VALUE MODE ----------

    if (isMeasureCell) {
      const sel = makeGrainSelector();
      toggleSelector(sel);
      this._applyFocusStyles();
      return;
    }

    if (dimIdx !== -1) {
      const dimKey = this.dimensions[dimIdx];
      const value = tr.dataset[dimKey];
      const sel = { type: "dim", dimKey, value };
      toggleSelector(sel);
      this._applyFocusStyles();
    }
  }

  _applyFocusStyles() {
    if (!this.tableEl) return;

    const hasColSel = this._activeColumns && this._activeColumns.size > 0;
    const hasRowSel =
      this._activeRowFilters && this._activeRowFilters.length > 0;

    const tbodyRows = this.tableEl.querySelectorAll("tbody tr");
    const allCells = this.tableEl.querySelectorAll("td, th");

    // reset
    allCells.forEach((cell) => {
      cell.classList.remove("muted");
      cell.classList.remove("highlight");
    });

    if (!hasColSel && !hasRowSel) {
      return; // nothing selected
    }

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
      const measureCells = this.tableEl.querySelectorAll(
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
}
