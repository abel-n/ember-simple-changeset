import { set } from '@ember/object';
import { A } from '@ember/array';
import { getOwner } from '@ember/application';
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

    model.eachAttribute((key, { type }) => this.modelAttributes.pushObject({ key, type }));
    model.eachRelationship((key, { kind }) => this.modelRelationships.pushObject({ key, kind }));
    this._resetHasManyRelations();
  }

  get(key) {
    if (!this._findRelation(key)) {
      const getter = this._getAccessorFor(key, 'get');

      if (getter) {
        return getter.call(this._changes);
      }
    }

    return this._changes[key] || this._model.get(key);
  }

  set(key, value) {
    const relation = this._findRelation(key);

    if (relation) {
      const transformedValue = this._transformRelation(relation, value);
      set(this._changes, key, transformedValue);
      return value;
    }

    const setter = this._getAccessorFor(key, 'set');

    if (setter) {
      setter.call(this._changes, value);
    }

    return value;
  }

  setProperties(hash) {
    if (hash === null || typeof hash !== 'object') {
      return hash;
    }

    Object.entries(hash).forEach(([key, value]) => this.set(key, value));
    return hash;
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

  _findRelation(key) {
    return this._findAttr(key) || this._findRelationship(key);
  }

  _findAttr(key) {
    return this.modelAttributes.findBy('key', key);
  }

  _findRelationship(key, kind) {
    const relations = kind ? A(this.modelRelationships.filterBy('kind', kind)) : this.modelRelationships;
    return relations.findBy('key', key);
  }

  _getAccessorFor(key, type) {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this._model), key);
    return descriptor && descriptor[type];
  }

  _transformRelation(relation, value) { // eslint-disable-line class-methods-use-this
    const isHasMany = relation.kind && relation.kind === 'hasMany';
    const transformType = relation.type;

    if (isHasMany && typeof value === 'object') {
      return [value];
    }

    if (transformType) {
      const transform = getOwner(this._model).lookup(`transform:${transformType}`);
      return transform.serialize(value);
    }

    return value;
  }
}
