// Axis.js
export class AxisBase {
  constructor(id) {
    if (!id) {
      throw new Error("Axis constructor requires an 'id'.");
    }

    this._axis = {
      id,
      type: null, // set by subclass
      grid: true,
      // no position/title/min/max by default
    };
  }

  position(pos) {
    this._axis.position = pos;
    return this;
  }

  title(title) {
    this._axis.title = title;
    return this;
  }

  grid(enabled) {
    this._axis.grid = enabled;
    return this;
  }

  id(id) {
    this._axis.id = id;
    return this;
  }

  build() {
    return Object.fromEntries(
      Object.entries(this._axis).filter(([, v]) => v !== undefined)
    );
  }
}

export class CategoryAxis extends AxisBase {
  constructor(id) {
    super(id);
    this._axis.type = "category";
  }
}

export class ValueAxis extends AxisBase {
  constructor(id) {
    super(id);
    this._axis.type = "value";
    this._axis.stacked = false;
  }

  min(v) {
    this._axis.min = v;
    return this;
  }

  max(v) {
    this._axis.max = v;
    return this;
  }

  strictMinMax(flag = true) {
    this._axis.strictMinMax = !!flag;
    return this;
  }

  logarithmic(flag = true) {
    this._axis.logarithmic = !!flag;
    return this;
  }

  stacked(stacked) {
    this._axis.stacked = stacked;
    return this;
  }
}

export class DateAxis extends AxisBase {
  constructor(id) {
    super(id);
    this._axis.type = "date";
  }

  min(dateOrTs) {
    this._axis.min = dateOrTs;
    return this;
  }

  max(dateOrTs) {
    this._axis.max = dateOrTs;
    return this;
  }

  baseInterval(timeUnit, count = 1) {
    this._axis.baseInterval = { timeUnit, count };
    return this;
  }
}
