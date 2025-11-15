// src/Heatmap.js
import { HeatmapConfig } from "../utils/config.js";

export class Heatmap {
  constructor(table) {
    this.table = table;
  }

  clear() {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;
    const tds = tableEl.querySelectorAll('td[data-role="measure"]');
    tds.forEach((td) => {
      td.style.backgroundColor = "";
      td.style.color = "";
    });
  }

  applyGlobal() {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;

    this.clear();

    const measureTds = tableEl.querySelectorAll('td[data-role="measure"]');
    const allValues = [];
    measureTds.forEach((td) => {
      const v = Number(td.dataset.value);
      if (!Number.isNaN(v)) allValues.push(v);
    });

    const colorFor = this._createColorScale(allValues);

    measureTds.forEach((td) => {
      const v = Number(td.dataset.value);
      if (!Number.isNaN(v)) {
        const bg = colorFor(v);
        td.style.backgroundColor = bg;
        td.style.color = HeatmapConfig.textColor;
      }
    });
  }

  applyPerColumn() {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;

    this.clear();

    this.table.columnIndex.forEach((colInfo) => {
      const key = colInfo.key;
      const tds = tableEl.querySelectorAll(
        `td[data-role="measure"][data-col="${key}"]`
      );

      const values = [];
      tds.forEach((td) => {
        const v = Number(td.dataset.value);
        if (!Number.isNaN(v)) values.push(v);
      });

      const colorFor = this._createColorScale(values);
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

  applyByDimension(dimKey, mode = "global") {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;
    if (!this.table.dimensions.includes(dimKey)) {
      console.warn(
        `Dimension "${dimKey}" is not in dimensions`,
        this.table.dimensions
      );
      return;
    }

    this.clear();

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
