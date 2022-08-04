/// <reference types='cypress' />
import AppFrontend from '../pageobjects/app-frontend';

const appFrontend = new AppFrontend();

Cypress.Commands.add('startAppInstance', (appName, anonymous=false) => {
  const visitOptions = {
    onBeforeLoad: (win) => {
      cy.spy(win.console, 'log').as('console.log');
      cy.spy(win.console, 'warn').as('console.warn');
      cy.spy(win.console, 'error').as('console.error');
    },
  };

  cy.visit('/', visitOptions);
  if (Cypress.env('environment') === 'local') {
    if (anonymous) {
      cy.visit(`${Cypress.config('baseUrl')}/ttd/${appName}`, visitOptions);
    } else {
      cy.get(appFrontend.appSelection).select(appName);
      cy.get(appFrontend.startButton).click();
    }
  } else {
    if (!anonymous)
    {
      authenticateAltinnII(Cypress.env('testUserName'), Cypress.env('testUserPwd'));
    }
    cy.visit(`https://ttd.apps.${Cypress.config('baseUrl').slice(8)}/ttd/${appName}/`, visitOptions);
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
