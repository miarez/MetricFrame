// src/builders/Theme.js
export class Theme {
  constructor() {
    this._theme = {
      animated: true,
      mode: "Dark",
      background: "#000000",
    };
  }

  animated(flag) {
    this._theme.animated = !!flag;
    return this;
  }

  mode(mode) {
    this._theme.mode = mode;
    return this;
  }

  background(color) {
    this._theme.background = color;
    return this;
  }

  build() {
    return { ...this._theme };
  }
}
