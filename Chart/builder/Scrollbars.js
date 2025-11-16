// src/builders/Scrollbars.js
export class Scrollbars {
  constructor() {
    this._scrollbars = {
      x: { enabled: true },
      y: { enabled: true },
    };
  }

  // convenience: turn on/off + merge options for X
  x(options = {}) {
    const enabled =
      typeof options.enabled === "boolean" ? options.enabled : true;

    this._scrollbars.x = {
      ...this._scrollbars.x,
      ...options,
      enabled,
    };
    return this;
  }

  // same for Y
  y(options = {}) {
    const enabled =
      typeof options.enabled === "boolean" ? options.enabled : true;

    this._scrollbars.y = {
      ...this._scrollbars.y,
      ...options,
      enabled,
    };
    return this;
  }

  build() {
    return {
      x: { ...this._scrollbars.x },
      y: { ...this._scrollbars.y },
    };
  }
}
