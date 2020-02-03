import Model, { attr } from '@ember-data/model';

export default class GuestModel extends Model {
  @attr() firstName
  @attr() lastName
}
