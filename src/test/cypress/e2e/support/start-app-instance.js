/// <reference types='cypress' />
import AppFrontend from '../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

Cypress.Commands.add('startAppInstance', (appName) => {
  cy.visit('/');
  if (Cypress.env('environment').includes('local')) {
    cy.get(appFrontend.appSelection).select(appName);
    cy.get(appFrontend.startButton).click();
  } else {
    authenticateAltinnII(Cypress.env('testUserName'), Cypress.env('testUserPwd'));
    cy.visit(`https://ttd.apps.${Cypress.config('baseUrl').slice(8)}/ttd/${appName}/`);
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
