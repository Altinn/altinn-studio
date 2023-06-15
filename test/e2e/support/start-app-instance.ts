import { login } from 'test/e2e/support/auth';
import type { user } from 'test/e2e/support/auth';

Cypress.Commands.add('startAppInstance', (appName, user: user | null = 'default') => {
  const anonymous = user === null;

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

    const rand = () => Math.floor(Math.random() * (max - min + 1) + min);

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

  const targetUrl =
    Cypress.env('environment') === 'local'
      ? `${Cypress.config('baseUrl')}/ttd/${appName}`
      : `https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}/ttd/${appName}`;

  // Rewrite all references to the app-frontend with a local URL
  // We cannot just intercept and redirect (like we did before), because Percy reads this DOM to figure out where
  // to download assets from. If we redirect, Percy will download from altinncdn.no, which will cause the test to
  // use outdated CSS.
  // https://docs.percy.io/docs/debugging-sdks#asset-discovery
  cy.intercept(targetUrl, (req) => {
    req.on('response', (res) => {
      if (typeof res.body === 'string' || res.statusCode === 200) {
        const source = /https?:\/\/.*?\/altinn-app-frontend\./g;
        const target = `http://localhost:8080/altinn-app-frontend.`;
        res.body = res.body.replace(source, target);
      }
    });
  }).as('app');

  cy.intercept('https://altinncdn.no/toolkits/altinn-app-frontend/*/altinn-app-frontend.*', (req) => {
    req.destroy();
    throw new Error('Requested asset from altinncdn.no, our rewrite code is apparently not working, aborting test');
  });

  if (!anonymous) {
    login(user);
  }

  cy.visit(targetUrl, visitOptions);
});
