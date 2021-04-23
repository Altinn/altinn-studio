import './gitea-api';
import './studio';
import './localtest';
import './app';
import './app-frontend';
import 'cypress-file-upload';
import 'cypress-plugin-tab';
import './start-app-instance';

before(() => {
  Cypress.on('uncaught:exception', (e, runnable) => {
    console.log('error', e);
    console.log('runnable', runnable);
    return false;
  });
});
