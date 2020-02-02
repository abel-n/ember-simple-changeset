import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import setupSinon from 'ember-sinon-qunit';

import Application from '../app';
import config from '../config/environment';

setApplication(Application.create(config.APP));

setupSinon();

start();
