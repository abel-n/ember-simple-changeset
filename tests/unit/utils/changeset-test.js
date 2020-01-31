import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Changeset from 'dummy/utils/changeset';
import Model, { attr/*, belongsTo, hasMany*/ } from '@ember-data/model';
import { computed, setProperties } from '@ember/object';

class TestModel extends Model {
  @attr() firstName
  @attr() lastName

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  set fullName(value) {
    let [firstName, lastName] = (value || '').split(' ');
    setProperties(this, { firstName, lastName });
    return value;
  }
}

module('Unit | Utility | changeset', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:test', TestModel);

    this.model = this.owner.lookup('service:store').createRecord('test', {
      firstName: 'Jonathan',
      lastName: 'Palmer'
    });
    this.changeset = new Changeset(this.model);
  });

  test('it applies changes', function(assert) {
    this.changeset.set('firstName', 'Lilian');
    assert.equal(this.changeset.get('firstName'), 'Lilian');
    assert.equal(this.model.firstName, 'Jonathan');

    this.changeset.applyChanges();
    assert.equal(this.changeset.get('firstName'), 'Lilian');
    assert.equal(this.model.firstName, 'Lilian');
  });

  test('it reverts changes', function(assert) {
    this.changeset.set('firstName', 'Lilian');
    this.changeset.revertChanges();

    assert.equal(this.changeset.get('firstName'), 'Jonathan');
  });

  test('it handles computed properties', function(assert) {
    this.changeset.set('fullName', 'Lilian Baxter');

    assert.equal(this.changeset.get('firstName'), 'Lilian');
    assert.equal(this.changeset.get('lastName'), 'Baxter');

    this.changeset.set('firstName', 'Flora');
    assert.equal(this.changeset.get('fullName'), 'Flora Baxter');
    assert.equal(this.model.fullName, 'Jonathan Palmer');

    this.changeset.applyChanges();
    assert.equal(this.changeset.get('fullName'), 'Flora Baxter');
    assert.equal(this.model.fullName, 'Flora Baxter');
  });
});
