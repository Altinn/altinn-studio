import './gitea-api';
import './studio';
import './localtest';
import './app';
import './app-frontend';
import './custom';
import 'cypress-plugin-tab';
import './start-app-instance';
import 'cypress-axe';

before(() => {
  Cypress.on('uncaught:exception', (e, runnable) => {
    console.log('error', e);
    console.log('runnable', runnable);
    return false;
  });
});
