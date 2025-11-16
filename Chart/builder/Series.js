// SeriesBuilder.js

import { toTitleCase } from "./utils.js";

export class Series {
  constructor(field) {
    if (!field) {
      throw new Error("SeriesBuilder requires a 'field' in constructor.");
    }

    this._series = {
      field, // required
      name: toTitleCase(field), // ✅ titlecased for legend/tooltips
      geom: "line", // default
      axis: "y", // default value axis
      xAxisId: "x", // default x axis
    };
  }

  geom(geom) {
    this._series.geom = geom;
    return this;
  }

  axis(axisId) {
    this._series.axis = axisId; // e.g. "y", or a secondary axis later
    return this;
  }

  xAxis(id) {
    this._series.xAxisId = id; // if you ever support multiple x axes
    return this;
  }

  xField(field) {
    this._series.xField = field;
    return this;
  }

  id(id) {
    this._series.id = id;
    return this;
  }

  name(name) {
    this._series.name = name;
    return this;
  }

  color(color) {
    this._series.color = color;
    return this;
  }

  build() {
    return { ...this._series };
  }
}
