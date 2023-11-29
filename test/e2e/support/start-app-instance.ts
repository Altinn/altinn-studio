import dotenv from 'dotenv';
import escapeRegex from 'escape-string-regexp';

import { cyUserCredentials } from 'test/e2e/support/auth';
import type { CyUser } from 'test/e2e/support/auth';
import Response = Cypress.Response;

function login(user: CyUser) {
  cy.clearCookies();

  if (Cypress.env('environment') === 'local') {
    const { localPartyId } = cyUserCredentials[user];

    const formData = new FormData();
    formData.append('UserSelect', localPartyId);
    formData.append('AuthenticationLevel', '1');

    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/Home/LogInTestUser`,
      body: formData,
    }).as('login');
  } else {
    const { userName, userPassword } = cyUserCredentials[user];
    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/api/authentication/authenticatewithpassword`,
      headers: {
        'Content-Type': 'application/hal+json',
      },
      body: JSON.stringify({
        UserName: userName,
        UserPassword: userPassword,
      }),
    }).as('login');
  }

  cy.get('@login').should((response) => {
    const r = response as unknown as Response<any>;
    expect(r.status).to.eq(200);
  });
}

Cypress.Commands.add('startAppInstance', (appName, options) => {
  const { user = 'default', evaluateBefore, urlSuffix = '' } = options || {};
  const env = dotenv.config().parsed || {};
  cy.log(`Starting app instance: ${appName}`);
  if (user) {
    cy.log(`Logging in as user: ${user}`);
  }

  // You can override the host we load css/js from, using multiple methods:
  //   1. Start Cypress with --env environment=<local|tt02>,host=<host>
  //   2. Set CYPRESS_HOST=<host> in your .env file
  // This is useful, for example if you want to run a Cypress test locally in the background while working on
  // other things. Build the app-frontend with `yarn build` and serve it with `yarn serve 8081`, then run
  // Cypress using a command like this:
  //   npx cypress run --env environment=tt02,host=localhost:8081 -s 'test/e2e/integration/*/*.ts'
  const targetHost = Cypress.env('host') || env.CYPRESS_HOST || 'localhost:8080';

  const visitOptions = {
    onBeforeLoad: (win) => {
      cy.spy(win.console, 'log').as('console.log');
      cy.spy(win.console, 'warn').as('console.warn');
      cy.spy(win.console, 'error').as('console.error');
    },
    onLoad: (win) => {
      if (win.logError) {
        cy.spy(win, 'logError').as('window.logError');
        cy.spy(win, 'logWarn').as('window.logWarn');
        cy.spy(win, 'logInfo').as('window.logInfo');
      }
    },
  };

  // Run this using --env environment=<local|tt02>,responseFuzzing=on to simulate an unreliable network. This might
  // help us find bugs (usually race conditions) that only occur requests/responses arrive out of order.
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

  const targetUrlRaw = getTargetUrl(appName) + urlSuffix;
  const targetUrl = new RegExp(`^${escapeRegex(targetUrlRaw)}/?$`);

  // Rewrite all references to the app-frontend with a local URL
  // We cannot just intercept and redirect (like we did before), because Percy reads this DOM to figure out where
  // to download assets from. If we redirect, Percy will download from altinncdn.no, which will cause the test to
  // use outdated CSS.
  // https://docs.percy.io/docs/debugging-sdks#asset-discovery
  cy.intercept({ url: targetUrl }, (req) => {
    const cookies = req.headers['cookie'] || '';
    req.on('response', (res) => {
      if (typeof res.body === 'string' || res.statusCode === 200) {
        if (evaluateBefore && !cookies.includes('cy-evaluated-js=true')) {
          res.body = generateHtmlToEval(evaluateBefore);
          return;
        }

        const source = /https?:\/\/.*?\/altinn-app-frontend\./g;
        const target = `http://${targetHost}/altinn-app-frontend.`;
        res.body = res.body.replace(source, target);
      }
    });
  }).as('app');

  cy.intercept('https://altinncdn.no/toolkits/altinn-app-frontend/*/altinn-app-frontend.*', (req) => {
    req.destroy();
    throw new Error('Requested asset from altinncdn.no, our rewrite code is apparently not working, aborting test');
  });

  user && login(user);
  !user && cy.clearCookies();
  cy.visit(targetUrlRaw, visitOptions);

  if (evaluateBefore) {
    cy.get('#cy-evaluating-js').should('not.exist');
  }

  cy.injectAxe();
});

export function getTargetUrl(appName: string) {
  return Cypress.env('environment') === 'local'
    ? `${Cypress.config('baseUrl')}/ttd/${appName}`
    : `https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}/ttd/${appName}`;
}

function generateHtmlToEval(javascript: string) {
  return `
    <html lang="en">
    <head>
      <title>Evaluating JavaScript before starting app</title>
      <script>
        async function toEvaluate() {
          ${javascript}
        }

        window.addEventListener('DOMContentLoaded', async () => {
          const maybeReturnUrl = await toEvaluate();
          document.cookie = 'cy-evaluated-js=true';
          if (maybeReturnUrl && typeof maybeReturnUrl === 'string') {
            window.location.href = maybeReturnUrl;
          } else {
            window.location.reload();
          }
        });
      </script>
    </head>
    <body>
      <div id="cy-evaluating-js"></div>
    </body>
  </html>
  `.trim();
}
