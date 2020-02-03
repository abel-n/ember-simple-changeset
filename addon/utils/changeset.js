import {
  computed,
  defineProperty,
  get,
  set,
} from '@ember/object';
import { A } from '@ember/array';
import { getOwner } from '@ember/application';
import ObjectProxy from '@ember/object/proxy';
import HasManyChange from 'ember-simple-changeset/utils/has-many-change';
import { resolve } from 'rsvp';

function extractContent(obj) {
  if (!obj || !obj.content) {
    return obj;
  }
  return obj.content;
}

function belongsTosDiffer(obj1, obj2) {
  return extractContent(obj1) !== extractContent(obj2);
}

function getPathRoot(path) {
  return path.split('.')[0].replace(/\.\[\]$/, '');
}

export default class Changeset extends ObjectProxy {
  _changes = {}
  modelAttributes = A()
  modelRelationships = A()

  init() {
    super.init();

    this._setupAttrs();
    this._setupRelationships();
    this._setupIsDirty();
    this._resetHasManyRelations();
  }

  unknownProperty(...args) {
    return this.get(...args);
  }

  setUnknownProperty(...args) {
    if (args[0] === '_model') {
      return super.setUnknownProperty(...args);
    }
    return this.set(...args);
  }

  get(key) {
    const rootKey = getPathRoot(key);
    if (!this._findRelation(rootKey)) {
      const getter = this._getAccessorFor(key, 'get');

      if (getter) {
        return getter.call(this._changes);
      }
    }

    const change = get(this._changes, key);

    if (Object.prototype.hasOwnProperty.call(this._changes, rootKey)) {
      return change;
    }

    return get(this._model, key);
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
    set(this, '_changes', {});
    this._resetHasManyRelations();
  }

  save() {
    if (!this.isDirty) {
      return resolve();
    }

    return this._model.save();
  }

  _setupAttrs() {
    this._model.eachAttribute((key, { type }) => this.modelAttributes.pushObject({ key, type }));
  }

  _setupRelationships() {
    this._model.eachRelationship(
      (key, { kind }) => this.modelRelationships.pushObject({ key, kind })
    );
  }

  _setupIsDirty() {
    const attrs = this.modelAttributes;
    const rels = this.modelRelationships;
    const dependentKeys = [
      ...attrs.mapBy('key'),
      ...A(rels.rejectBy('kind', 'hasMany')).mapBy('key'),
      ...rels.filterBy('kind', 'hasMany').map(({ key }) => `${key}.[]`),
    ];
    const changesetKeys = `_changes.{${dependentKeys.join(',')}}`;

    defineProperty(this, 'isDirty', computed(changesetKeys, function() {
      const changes = Object.entries(this._changes);

      let dirty = false;

      for (let i = 0, x = changes.length; i < x; i += 1) {
        const [key, change] = changes[i];

        dirty = this._isDirtyChange(key, change);

        if (dirty) {
          continue;
        }
      }

      return dirty;
    }));
  }

  _isDirtyChange(key, change) {
    const original = this._model.get(key);

    if (this._findAttr(key)) {
      return change !== original;
    }

    if (this._findRelationship(key, 'belongsTo')) {
      return belongsTosDiffer(change, original);
    }

    const isSameLength = change.length === original.length;

    return !isSameLength || change.content.any(
      (item, index) => item !== original.objectAt(index)
    );
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

  _transformRelation(relation, value) {
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
