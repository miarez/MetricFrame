// src/Border.js

export class Border {
  /**
   * @param {Table} table
   */
  constructor(table) {
    this.table = table;
  }

  /**
   * Draw a rectangular border around each contiguous block of rows
   * that share the same value for dimKey.
   */
  applyGroupBorders(dimKey, { color = "#fff", width = "2px" } = {}) {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;
    if (!this.table.dimensions.includes(dimKey)) return;

    const tbody = tableEl.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (!rows.length) return;

    let start = 0;

    while (start < rows.length) {
      const groupVal = rows[start].dataset[dimKey];
      let end = start;

      // extend until the dimension value changes
      while (
        end + 1 < rows.length &&
        rows[end + 1].dataset[dimKey] === groupVal
      ) {
        end++;
      }

      // ----- find the dimension cell in the first row of this block -----
      const firstRow = rows[start];
      const firstDimCell = firstRow.querySelector(
        `td.dim[data-dim-key="${dimKey}"]`
      );

      if (!firstDimCell) {
        // no explicit dim cell in this row for this key → skip this block
        start = end + 1;
        continue;
      }

      const dimColIndex = firstDimCell.cellIndex; // visual column index

      // ----- TOP border on first row, from dim column to the end -----
      const firstCells = Array.from(firstRow.cells);
      for (let c = dimColIndex; c < firstCells.length; c++) {
        firstCells[c].style.borderTop = `${width} solid ${color}`;
      }

      // ----- BOTTOM border on last row, from dim column to the end -----
      const lastRow = rows[end];
      const lastCells = Array.from(lastRow.cells);
      const bottomStart = Math.min(dimColIndex, lastCells.length - 1);
      for (let c = bottomStart; c < lastCells.length; c++) {
        lastCells[c].style.borderBottom = `${width} solid ${color}`;
      }

      // ensure the dim cell itself has a bottom border (for row-spanned dims)
      firstDimCell.style.borderBottom = `${width} solid ${color}`;

      // ----- LEFT border on every dim cell for this dimension in the block -----
      for (let r = start; r <= end; r++) {
        const dimCell = rows[r].querySelector(
          `td.dim[data-dim-key="${dimKey}"]`
        );
        if (dimCell) {
          dimCell.style.borderLeft = `${width} solid ${color}`;
        }
      }

      // ----- RIGHT border on the last cell of every row in the block -----
      for (let r = start; r <= end; r++) {
        const rowCells = Array.from(rows[r].cells);
        if (!rowCells.length) continue;
        const rightCell = rowCells[rowCells.length - 1];
        rightCell.style.borderRight = `${width} solid ${color}`;
      }

      // move to next block
      start = end + 1;
    }
  }

  clearGroupBorders() {
    const tableEl = this.table.getTableElement();
    if (!tableEl) return;
    const cells = tableEl.querySelectorAll("td, th");
    cells.forEach((cell) => {
      cell.style.borderTop = "";
      cell.style.borderBottom = "";
      cell.style.borderLeft = "";
      cell.style.borderRight = "";
    });
  }
}
