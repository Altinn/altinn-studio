import AppFrontend from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

Cypress.Commands.add('startAppInstance', (appName, anonymous = false) => {
  const visitOptions = {
    onBeforeLoad: (win) => {
      cy.spy(win.console, 'log').as('console.log');
      cy.spy(win.console, 'warn').as('console.warn');
      cy.spy(win.console, 'error').as('console.error');
    },
  };

  if (Cypress.env('responseFuzzing') === 'on') {
    const [min, max] = [10, 1000];
    cy.log(`Response fuzzing on, will delay responses randomly between ${min}ms and ${max}ms`);

    const rand = () => {
      return Math.floor(Math.random() * (max - min + 1) + min);
    };

    const randomDelays = (req) => {
      req.on('response', (res) => {
        res.setDelay(rand());
      });
    };
    cy.intercept('**/api/**', randomDelays);
    cy.intercept('**/instances/**', randomDelays);
  } else {
    cy.log(`Response fuzzing off, enable with --env responseFuzzing=on`);
  }

  // Rewrite all references to the app-frontend with a local URL
  cy.intercept(/\/altinn-app-frontend\.(css|js)$/, (req) => {
    if (req.url.match(/localhost:8080/)) {
      req.continue();
    } else {
      const extension = req.url.endsWith('.css') ? 'css' : 'js';
      req.redirect(`http://localhost:8080/altinn-app-frontend.${extension}`);
    }
  }).as('frontend');

  cy.visit('/', visitOptions);

  if (Cypress.env('environment') === 'local') {
    if (anonymous) {
      cy.visit(`${Cypress.config('baseUrl')}/ttd/${appName}/`, visitOptions);
    } else {
      cy.get(appFrontend.appSelection).select(appName);
      cy.get(appFrontend.startButton).click();
    }
  } else {
    if (!anonymous) {
      authenticateAltinnII(Cypress.env('testUserName'), Cypress.env('testUserPwd'));
    }
    cy.visit(`https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}/ttd/${appName}/`, visitOptions);
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
