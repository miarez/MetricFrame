// src/TableFormatter.js
import { HeatmapConfig } from "../utils/config.js";
import { TableCore } from "./TableCore.js";

export class TableFormatter {
  /**
   * @param {TableCore} tableCore
   */
  constructor(tableCore) {
    this.table = tableCore;
  }

  // ----- PUBLIC API -----

  clearHeatmap() {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;
    const tds = tableEl.querySelectorAll('td[data-role="measure"]');
    tds.forEach((td) => {
      td.style.backgroundColor = "";
      td.style.color = "";
    });
  }

  applyHeatmapGlobal() {
    const tableEl = this.table.getTableElement();
    const rows = this.table.getSortedRows();
    if (!tableEl || !rows) return;

    this.clearHeatmap();

    const measures = this.table.getMeasures();
    const allValues = [];

    rows.forEach((row) => {
      measures.forEach((mKey) => {
        const v = row[mKey];
        if (typeof v === "number" && !Number.isNaN(v)) {
          allValues.push(v);
        }
      });
    });

    const colorFor = this._createColorScale(allValues);
    const tds = tableEl.querySelectorAll('td[data-role="measure"]');

    tds.forEach((td) => {
      const v = Number(td.dataset.value);
      if (!Number.isNaN(v)) {
        const bg = colorFor(v);
        td.style.backgroundColor = bg;
        td.style.color = HeatmapConfig.textColor;
      }
    });
  }

  applyHeatmapPerColumn() {
    const tableEl = this.table.getTableElement();
    const rows = this.table.getSortedRows();
    if (!tableEl || !rows) return;

    this.clearHeatmap();

    const measures = this.table.getMeasures();

    measures.forEach((mKey) => {
      const values = [];
      rows.forEach((row) => {
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
   * @param {string} dimKey - must be a dimension from TableCore
   * @param {{mode?: "global"|"perColumn"}} [options]
   */
  applyHeatmapByDimension(dimKey, { mode = "global" } = {}) {
    const tableEl = this.table.getTableElement();
    const rows = this.table.getSortedRows();
    const dims = this.table.getDimensions();
    if (!tableEl || !rows) return;
    if (!dims.includes(dimKey)) {
      console.warn(`Dimension "${dimKey}" not found in`, dims);
      return;
    }

    this.clearHeatmap();
    this._applyHeatmapByDimension(tableEl, dimKey, mode);
  }

  // ----- INTERNAL HELPERS -----

  _applyHeatmapByDimension(tableEl, dimKey, mode) {
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
  // ===== GROUP BORDERS BY DIMENSION =====

  // src/TableFormatter.js

  /**
   * Draw a thick border around each contiguous block of rows
   * sharing the same dimension value (e.g., "source").
   *
   * You can call this multiple times with different dimKeys
   * and the borders will stack/overwrite where they overlap.
   *
   * @param {string} dimKey - dimension name, e.g. "source"
   * @param {Object} [options]
   * @param {string} [options.color] - border color (default "#ffffff")
   * @param {string} [options.width] - border width (default "2px")
   * @param {string} [options.style] - CSS border style (default "solid")
   */
  applyGroupBordersByDimension(dimKey, options = {}) {
    const tableEl = this.table.getTableElement();
    const dims = this.table.getDimensions();
    if (!tableEl) return;
    if (!dims.includes(dimKey)) {
      console.warn(`Dimension "${dimKey}" not found in`, dims);
      return;
    }

    const { color = "#ffffff", width = "2px", style = "solid" } = options;

    const tbody = tableEl.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (!rows.length) return;

    let currentValue = null;
    let currentGroup = [];

    const flushGroup = () => {
      if (!currentGroup.length) return;
      const first = currentGroup[0];
      const last = currentGroup[currentGroup.length - 1];

      // top border on first row in group
      Array.from(first.children).forEach((cell) => {
        cell.style.borderTopWidth = width;
        cell.style.borderTopStyle = style;
        cell.style.borderTopColor = color;
      });

      // bottom border on last row in group
      Array.from(last.children).forEach((cell) => {
        cell.style.borderBottomWidth = width;
        cell.style.borderBottomStyle = style;
        cell.style.borderBottomColor = color;
      });
    };

    rows.forEach((tr) => {
      const val = tr.dataset[dimKey];

      if (currentValue === null) {
        currentValue = val;
        currentGroup = [tr];
      } else if (val === currentValue) {
        currentGroup.push(tr);
      } else {
        flushGroup();
        currentValue = val;
        currentGroup = [tr];
      }
    });

    flushGroup();
  }

  /**
   * Explicitly clear all group borders (if you want a reset).
   */
  clearGroupBorders() {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;
    this._clearGroupBorders(tableEl);
  }

  _clearGroupBorders(tableEl) {
    const tds = tableEl.querySelectorAll("td");
    tds.forEach((td) => {
      td.style.borderTopWidth = "";
      td.style.borderTopStyle = "";
      td.style.borderTopColor = "";
      td.style.borderBottomWidth = "";
      td.style.borderBottomStyle = "";
      td.style.borderBottomColor = "";
    });
  }
}
