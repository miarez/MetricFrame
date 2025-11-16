// builder/Chart.js

import { Theme } from "./Theme.js";
import { Legend } from "./Legend.js";
import { Cursor } from "./Cursor.js";
import { Scrollbars } from "./Scrollbars.js";

export class Chart {
  constructor() {
    this._config = {
      // sensible defaults
      container: "chartdiv",
      dataLoader: null,
      engine: null,
      theme: null,
      legend: null,
      cursor: null,
      scrollbars: null,
    };
  }

  /**
   * Set the container div ID
   */
  htmlContainer(id) {
    this._config.container = id;
    return this;
  }

  /**
   * Data loader config
   */
  dataLoader(obj) {
    this._config.dataLoader = obj;
    return this;
  }

  /**
   * Engine config (e.g., XY, Radial, etc.)
   */
  engine(engineConfig) {
    this._config.engine = engineConfig;
    return this;
  }

  /**
   * Optionally override defaults with custom Theme
   */
  theme(themeInstance) {
    this._config.theme = themeInstance;
    return this;
  }

  /**
   * Optionally override defaults with custom Legend
   */
  legend(legendInstance) {
    this._config.legend = legendInstance;
    return this;
  }

  /**
   * Optionally override defaults with custom Cursor
   */
  cursor(cursorInstance) {
    this._config.cursor = cursorInstance;
    return this;
  }

  /**
   * Optionally override defaults with custom Scrollbars
   */
  scrollbars(scrollbarsInstance) {
    this._config.scrollbars = scrollbarsInstance;
    return this;
  }

  /**
   * Finalize the config object.
   * Any missing visual builders get their default instances here.
   */
  build() {
    const cfg = { ...this._config };

    // --- DEFAULTS ---
    if (!cfg.theme) cfg.theme = new Theme();
    if (!cfg.legend) cfg.legend = new Legend();
    if (!cfg.cursor) cfg.cursor = new Cursor();
    if (!cfg.scrollbars) cfg.scrollbars = new Scrollbars();

    // Convert builder instances to plain objects if they have a build() method
    for (const key of ["theme", "legend", "cursor", "scrollbars"]) {
      const val = cfg[key];
      if (val && typeof val.build === "function") {
        cfg[key] = val.build();
      }
    }

    return cfg;
  }
}
