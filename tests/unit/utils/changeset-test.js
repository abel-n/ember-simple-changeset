import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Changeset from 'dummy/utils/changeset';
import Model, { attr/*, belongsTo, hasMany*/ } from '@ember-data/model';

class TestModel extends Model {
  @attr() name
}

module('Unit | Utility | changeset', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:test', TestModel);

    this.model = this.owner.lookup('service:store').createRecord('test', {
      name: 'Jonathan'
    });
    this.changeset = new Changeset(this.model);
  });

  test('it applies changes', function(assert) {
    this.changeset.set('name', 'Lilian');
    assert.equal(this.changeset.get('name'), 'Lilian');
    assert.equal(this.model.name, 'Jonathan');

    this.changeset.applyChanges();
    assert.equal(this.changeset.get('name'), 'Lilian');
    assert.equal(this.model.name, 'Lilian');
  });

  test('it reverts changes', function(assert) {
    this.changeset.set('name', 'Lilian');
    this.changeset.revertChanges();

    assert.equal(this.changeset.get('name'), 'Jonathan');
  });
});
