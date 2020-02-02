import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Changeset from 'dummy/utils/changeset';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed, setProperties } from '@ember/object';
import { A } from '@ember/array';
import sinon from 'sinon';

class TestModel extends Model {
  @attr() firstName
  @attr() lastName
  @attr() lastName
  @attr() notes
  @attr('boolean') isMath
  @attr('number') children
  @attr('date') birthDate

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
  });

  module('basic tests', (basicHooks) => {
    basicHooks.beforeEach(function() {
      this.model = this.store.createRecord('test', {
        firstName: 'Jonathan',
        lastName: 'Palmer',
      });
      this.changeset = new Changeset(this.model);
    });

    test('it serializes attributes and applies appropriate changes on model', function(assert) {
      assert.expect(12);

      const expected = {
        firstName: 'Lilian',
        notAProperty: undefined,
        children: 2,
        notes: '123',
        isMath: true,
      };

      const assertProps = (obj) => {
        ['firstName', 'notAProperty', 'children', 'notes', 'isMath'].forEach((prop) => {
          assert.equal(obj.get(prop), expected[prop], `${prop} equals ${expected[prop]}`);
        });
      };

      this.changeset.setProperties({
        firstName: expected.firstName,
        notAProperty: 'someValue',
        children: '2',
        notes: 123,
        isMath: 'not boolean',
      });

      assertProps(this.changeset);
      assert.equal(this.model.firstName, 'Jonathan', 'model attr is unchanged before application');

      this.changeset.applyChanges();

      assert.equal(this.changeset.get('firstName'), 'Lilian');
      assertProps(this.model);
    });

    test('it handles nested accessors', function(assert) {
      assert.expect(2);

      const model = this.store.createRecord('test', {
        follows: this.store.createRecord('test', { firstName: 'Trevor' }),
      });
      const changeset = new Changeset(model);

      assert.equal(changeset.get('follows.firstName'), 'Trevor');

      changeset.set('follows', this.store.createRecord('test', { firstName: 'Paul' }));

      assert.equal(changeset.get('follows.firstName'), 'Paul');
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

    test('it calls model.save if not dirty', async function(assert) {
      assert.expect(2);

      const save = sinon.stub(this.model, 'save');

      await this.changeset.save();
      assert.ok(save.notCalled);

      this.changeset.set('firstName', 'Po');
      await this.changeset.save();
      assert.ok(save.calledOnce);
    });
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

  module('isDirty', () => {
    test('it returns appropriate value for any type of change', function(assert) {
      assert.expect(9);

      const follows = this.store.createRecord('test');
      const followers = A(new Array(3).fill().map((_v, index) => this.store.createRecord('test', { id: Number(index) + 1 })));

      const model = this.store.createRecord('test', {
        firstName: 'Jonathan',
        lastName: 'Palmer',
        follows,
        followers,
      });
      const changeset = new Changeset(model);

      assert.equal(changeset.isDirty, false);

      changeset.set('firstName', 'Lilian');
      assert.equal(changeset.isDirty, true);
      changeset.set('firstName', 'Jonathan');
      assert.equal(changeset.isDirty, false);
      changeset.set('fullName', 'Lilian Portero');
      assert.equal(changeset.isDirty, true, 'attrs and computed properties are ok');

      changeset.rollbackAttributes();
      assert.equal(changeset.isDirty, false);

      changeset.get('followers').removeObject(followers.lastObject);
      assert.equal(changeset.isDirty, true);
      changeset.get('followers').pushObject(followers.lastObject);
      assert.equal(changeset.isDirty, false, 'hasMany relationships are ok');

      changeset.set('follows', null);
      assert.equal(changeset.isDirty, true);
      changeset.set('follows', follows);
      assert.equal(changeset.isDirty, false, 'belongsTo relationships are ok');
    });
  });
});
