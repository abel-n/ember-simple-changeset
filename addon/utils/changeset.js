import { set } from '@ember/object';

export default class Changeset {
  _changes = {}
  modelAttributes = []
  modelRelationships = []

  constructor(model) {
    this._model = model;

    model.eachAttribute((name) => this.modelAttributes.push(name));
    model.eachRelationship((name) => this.modelRelationships.push(name));
  }

  get(key) {
    if (!this._isRelation(key)) {
      let getter = this._getAccessorFor(key, 'get');

      if (getter) {
        return getter.call(this._changes);
      }
    }

    return this._changes[key] || this._model.get(key);
  }

  set(key, value) {
    if (!this._isRelation(key)) {
      let setter = this._getAccessorFor(key, 'set');

      if (setter) {
        setter.call(this._changes, value);
        return value;
      }
    }

    set(this._changes, key, value);

    return value;
  }

  _isRelation(key) {
    return this.modelAttributes.includes(key) || this.modelRelationships.includes(key);
  }

  _getAccessorFor(key, type) {
    let descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this._model), key);
    return descriptor && descriptor[type];
  }

  applyChanges() {
    Object.entries(this._changes).forEach(([key, value]) => this._model.set(key, value));
  }

  revertChanges() {
    this._changes = {};
  }
}
