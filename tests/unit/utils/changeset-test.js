import { module, test/* , todo */ } from 'qunit';
import { setupTest } from 'ember-qunit';
import Changeset from 'dummy/utils/changeset';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed, setProperties } from '@ember/object';
import { A } from '@ember/array';

class TestModel extends Model {
  @attr() firstName
  @attr() lastName

  @belongsTo('test', { inverse: 'followers' }) follows
  @hasMany('test', { inverse: 'follows' }) followers

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  set fullName(value) {
    const [firstName, lastName] = (value || '').split(' ');
    setProperties(this, { firstName, lastName });
    return value;
  }
}

module('Unit | Utility | changeset', (hooks) => {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:test', TestModel);

    this.store = this.owner.lookup('service:store');
    this.model = this.store.createRecord('test', {
      firstName: 'Jonathan',
      lastName: 'Palmer',
    });
    this.changeset = new Changeset(this.model);
  });

  test('it applies changes', function(assert) {
    assert.expect(5);

    this.changeset.setProperties({
      firstName: 'Lilian',
      notAProperty: 'someValue',
    });
    assert.equal(this.changeset.get('firstName'), 'Lilian');
    assert.equal(this.model.firstName, 'Jonathan', 'model attr is unchanged before application');

    this.changeset.applyChanges();
    assert.equal(this.changeset.get('firstName'), 'Lilian');
    assert.equal(this.model.firstName, 'Lilian', 'model attr is changed after application');
    assert.notOk(this.model.notAProperty, 'only tracks model attrs and relations');
  });

  test('it reverts changes', function(assert) {
    assert.expect(1);

    this.changeset.set('firstName', 'Lilian');
    this.changeset.rollbackAttributes();

    assert.equal(this.changeset.get('firstName'), 'Jonathan');
  });

  test('it handles computed properties', function(assert) {
    assert.expect(6);

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

  test('it handles belongsTo relationships', function(assert) {
    assert.expect(4);

    const follows = this.store.createRecord('test');

    this.changeset.set('follows', follows);
    assert.equal(this.changeset.get('follows'), follows);
    assert.notOk(this.model.follows.content);

    this.changeset.applyChanges();
    assert.equal(this.changeset.get('follows'), follows);
    assert.equal(this.model.follows.content, follows);
  });

  module('hasMany', (hasManyHooks) => {
    hasManyHooks.beforeEach(function() {
      this.followers = A(new Array(3).fill().map((_v, index) => this.store.createRecord('test', { id: Number(index) + 1 })));
      this.model = this.store.createRecord('test', {
        firstName: 'Jonathan',
        lastName: 'Palmer',
        followers: this.followers,
      });
      this.changeset = new Changeset(this.model);
      this.getFollowers = () => this.changeset.get('followers');
    });

    test('it reacts with model as expected', function(assert) {
      assert.expect(10);

      const {
        changeset,
        followers,
        getFollowers,
        model,
      } = this;

      assert.equal(model.followers.content.length, 3);
      assert.deepEqual(getFollowers().mapBy('id'), followers.mapBy('id'), 'returns the initial hasMany');

      model.followers.removeObject(model.followers.lastObject);
      assert.equal(model.followers.content.length, 2);
      assert.deepEqual(getFollowers().mapBy('id'), model.followers.mapBy('id'), 'reflects changes in the underlying model when not changed yet');

      getFollowers().removeObject(getFollowers().lastObject);
      assert.equal(model.followers.content.length, 2, 'underlying model doesn\'t change when changeset field is mutated');
      assert.equal(getFollowers().length, 1);

      changeset.rollbackAttributes();
      assert.equal(model.followers.content.length, 2);
      assert.equal(getFollowers().length, 2, 'on rollback changeset reflects the actual state of the model');

      getFollowers().removeObject(getFollowers().lastObject);
      changeset.applyChanges();

      const changesetFollowers = changeset.get('followers').toArray();
      const modelFollowers = model.followers.toArray();
      const expected = [followers.firstObject];

      assert.deepEqual(changesetFollowers, expected);
      assert.deepEqual(modelFollowers, expected, 'changes from changeset are applied to model');
    });

    test('setting it as an object wraps that object in an array', function(assert) {
      assert.expect(2);

      assert.equal(this.getFollowers().length, 3);

      const follower = this.store.createRecord('test');
      this.changeset.set('followers', follower);

      assert.deepEqual(this.getFollowers(), [follower]);
    });
  });
});
