export default class Changeset {
  _changes = {}

  constructor(model) {
    this._model = model;
  }

  get(key) {
    return this._changes[key] || this._model[key];
  }

  set(key, value) {
    this._changes[key] = value;
    return value;
  }

  applyChanges() {
    Object.entries(this._changes).forEach(([key, value]) => this._model.set(key, value));
  }
}
