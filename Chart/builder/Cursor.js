// src/builders/Cursor.js
export class Cursor {
  constructor() {
    this._cursor = {
      // hardcoded defaults you had
      enabled: true, // NOTE: off by default at chart level
      behavior: "none",
      showLineX: true,
      showLineY: true,
      xAxisTooltip: {
        enabled: true,
        categoryFormat: "{value}",
      },
    };
  }

  enabled(flag = true) {
    this._cursor.enabled = !!flag;
    return this;
  }

  behavior(behavior) {
    this._cursor.behavior = behavior;
    return this;
  }

  showLineX(flag = true) {
    this._cursor.showLineX = !!flag;
    return this;
  }

  showLineY(flag = true) {
    this._cursor.showLineY = !!flag;
    return this;
  }

  xAxisTooltipEnabled(flag = true) {
    this._cursor.xAxisTooltip = {
      ...this._cursor.xAxisTooltip,
      enabled: !!flag,
    };
    return this;
  }

  xAxisTooltipFormat(format) {
    this._cursor.xAxisTooltip = {
      ...this._cursor.xAxisTooltip,
      categoryFormat: format,
    };
    return this;
  }

  build() {
    // shallow copy with nested tooltip preserved
    return {
      ...this._cursor,
      xAxisTooltip: { ...this._cursor.xAxisTooltip },
    };
  }
}
