import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import Changeset from 'ember-simple-changeset/utils/changeset';
import Model, { attr } from '@ember-data/model';
import { fillIn, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

class TestModel extends Model {
  @attr() firstName
}

module('Integration | Util | changeset', (hooks) => {
  setupRenderingTest(hooks);

  test('it interacts with template', async function(assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');

    this.owner.register('model:test', TestModel);

    this.changeset = Changeset.create({
      _model: store.createRecord('test', { firstName: 'Doris' }),
    });

    await render(hbs`<Input @value={{this.changeset.firstName}} />`);
    assert.dom('input').hasValue('Doris');

    await fillIn('input', '');
    assert.equal(this.changeset.get('firstName'), '');
  });
});
