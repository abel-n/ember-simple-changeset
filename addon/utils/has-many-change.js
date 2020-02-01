import ArrayProxy from '@ember/array/proxy';
import { set } from '@ember/object';

export default class HasManyChange extends ArrayProxy {
  pushObject(...args) {
    this._transformContent();
    return super.pushObject(...args);
  }

  pushObjects(...args) {
    this._transformContent();
    return super.pushObjects(...args);
  }

  removeObject(...args) {
    this._transformContent();
    return super.removeObject(...args);
  }

  removeObjects(...args) {
    this._transformContent();
    return super.removeObjects(...args);
  }

  _transformContent() {
    const { content } = this;
    if (content.content) {
      set(this, 'content', content.toArray());
    }
  }
}
