import './gitea-api';
import './studio';
import './custom';
import 'cypress-plugin-tab';
import './wcag';
import 'cypress-axe';

before(() => {
  Cypress.on('uncaught:exception', (e, runnable) => {
    console.log('error', e);
    console.log('runnable', runnable);
    return false;
  });
});
