import './gitea-api'
import './studio'
import './localtest'
import './app'
import './app-frontend'
import 'cypress-file-upload';
import 'cypress-plugin-tab'
import './start-app-instance'

before(() => {
  if (Cypress.env('environment') != "local") {
    cy.intercept('GET', '/sockjs-node/*', {
      statusCode: 200,
      body: {
        "websocket": false,
        "origins": ["*:*"],
        "cookie_needed": false,
        "entropy": 568571552
      }
    });
  };
  Cypress.on('uncaught:exception', (e, runnable) => {
    console.log('error', e)
    console.log('runnable', runnable)
    return false
  });
})
