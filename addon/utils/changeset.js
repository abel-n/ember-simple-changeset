import { set } from '@ember/object';
import { A } from '@ember/array';

export default class Changeset {
  _changes = {}
  modelAttributes = A()
  modelRelationships = A()

  constructor(model) {
    this._model = model;

    model.eachAttribute((key) => this.modelAttributes.pushObject(key));
    model.eachRelationship((key, { kind }) => this.modelRelationships.pushObject({ key, kind }));
    this._resetHasManyRelations();
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
    if (this._isRelation(key)) {
      set(this._changes, key, value);
      return value;
    }

    let setter = this._getAccessorFor(key, 'set');

    if (setter) {
      setter.call(this._changes, value);
      return value;
    }
  }

  applyChanges() {
    Object.entries(this._changes).forEach(([key, value]) => this._model.set(key, value));
  }

  rollbackAttributes() {
    this._changes = {};
    this._resetHasManyRelations();
  }

  _resetHasManyRelations() {
    let model = this._model;
    model.eachRelationship((key, { kind }) => {
      if (kind === 'hasMany' && model[key].length) {
        set(this._changes, key, model[key].toArray());
      }
    });
  }

  _isRelation(key) {
    return this.modelAttributes.includes(key) || this._findHasManyRelation(key);
  }

  _findHasManyRelation(key) {
    return this.modelRelationships.findBy('key', key);
  }

  _getAccessorFor(key, type) {
    let descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this._model), key);
    return descriptor && descriptor[type];
  }
}
