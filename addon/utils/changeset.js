import { set } from '@ember/object';
import { A } from '@ember/array';
import HasManyChange from 'ember-simple-changeset/utils/has-many-change';

// function hasManysAreEqual(array1, array2) {
//   return (array1.length === array2.length) && array1.every((item, index) => (
//     item === array2.objectAt ? array2.objectAt(index) : array2[index]
//   ));
// }

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
      const getter = this._getAccessorFor(key, 'get');

      if (getter) {
        return getter.call(this._changes);
      }
    }

    return this._changes[key] || this._model.get(key);
  }

  set(key, value) {
    if (this._isRelation(key)) {
      const transformedValue = this._transformIfHasManyObject(key, value);
      set(this._changes, key, transformedValue);
      return value;
    }

    const setter = this._getAccessorFor(key, 'set');

    if (setter) {
      setter.call(this._changes, value);
    }

    return value;
  }

  applyChanges() {
    Object.entries(this._changes).forEach(([key, value]) => this._model.set(key, value));
  }

  rollbackAttributes() {
    this._changes = {};
    this._resetHasManyRelations();
  }

  _resetHasManyRelations() {
    const model = this._model;
    model.eachRelationship((key, { kind }) => {
      if (kind === 'hasMany') {
        const hasManyChange = HasManyChange.create({ content: model[key] });
        set(this._changes, key, hasManyChange);
      }
    });
  }

  _isRelation(key) {
    return this.modelAttributes.includes(key) || this._findRelation(key);
  }

  _findRelation(key, kind) {
    const relations = kind ? A(this.modelRelationships.filterBy('kind', kind)) : this.modelRelationships;
    return relations.findBy('key', key);
  }

  _getAccessorFor(key, type) {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this._model), key);
    return descriptor && descriptor[type];
  }

  _transformIfHasManyObject(key, value) {
    const hasMany = this._findRelation(key, 'hasMany');

    if (hasMany && typeof value === 'object') {
      return [value];
    }

    return value;
  }
}
