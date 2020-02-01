import { module, test } from 'qunit';
import HasManyChange from 'dummy/utils/has-many-change';
import ArrayProxy from '@ember/array/proxy';

function arrayMutationAssertion(methodName, methodParam, assert) {
  const arrayProxy = ArrayProxy.create({ content: [] });
  const hasManyChange = HasManyChange.create({ content: arrayProxy });

  assert.ok(hasManyChange.content.content);

  hasManyChange[methodName](methodParam);

  assert.equal(hasManyChange.content.content, undefined, `transforms when ${methodName} is called`);
}

module('Unit | Utility | has-many-change', () => {
  test('it transforms content into array on mutation', (assert) => {
    assert.expect(8);

    arrayMutationAssertion('pushObject', null, assert);
    arrayMutationAssertion('pushObjects', [], assert);
    arrayMutationAssertion('removeObject', null, assert);
    arrayMutationAssertion('removeObjects', [], assert);
  });
});
