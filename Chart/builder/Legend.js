// src/builders/Legend.js
export class Legend {
  constructor() {
    this._legend = {
      enabled: true,
      // add more later: position, layout, etc.
    };
  }

  enabled(flag = true) {
    this._legend.enabled = !!flag;
    return this;
  }

  build() {
    return { ...this._legend };
  }
}
