import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Changeset from 'ember-simple-changeset/utils/changeset';

export default class DemoComponent extends Component {
  @service store

  model = this.store.createRecord('guest', { firstName: 'Joe' })
  changeset = Changeset.create({ _model: this.model })
}
