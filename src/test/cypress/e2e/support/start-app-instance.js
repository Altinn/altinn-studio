/// <reference types='cypress' />
import AppFrontend from '../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

Cypress.Commands.add('startAppInstance', () => {
  cy.visit('/');
  if (Cypress.env('environment') === 'local') {
    cy.get(appFrontend.appSelection).select(Cypress.env('localTestAppName'));
    cy.get(appFrontend.startButton).click();
  } else {
    authenticateAltinnII(Cypress.env('testUserName'), Cypress.env('testUserPwd'));
    cy.visit(`https://ttd.apps.${Cypress.env(Cypress.env('environment'))}/ttd/${Cypress.env('localTestAppName')}/`);
  }
});

function authenticateAltinnII(userName, userPwd) {
  cy.request({
    method: 'POST',
    url: `${Cypress.config('baseUrl')}/api/authentication/authenticatewithpassword`,
    headers: {
      'Content-Type': 'application/hal+json',
    },
    body: JSON.stringify({
      UserName: userName,
      UserPassword: userPwd,
    }),
  });
}
