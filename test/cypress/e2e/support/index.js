import './localtest';
import './app';
import './app-frontend';
import './custom';
import 'cypress-plugin-tab';
import './start-app-instance';
import './wcag';
import 'cypress-axe';
import chaiExtensions from './chai-extensions';

before(() => {
  chai.use(chaiExtensions);
  Cypress.on('uncaught:exception', (e, runnable) => {
    console.log('error', e);
    console.log('runnable', runnable);
    return false;
  });
});
