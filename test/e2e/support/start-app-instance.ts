import dotenv from 'dotenv';
import escapeRegex from 'escape-string-regexp';

import { cyUserCredentials } from 'test/e2e/support/auth';
import type { CyUser } from 'test/e2e/support/auth';

function login(user: CyUser, authenticationLevel: string = '1') {
  cy.clearCookies();

  if (Cypress.env('type') === 'localtest') {
    const { localPartyId } = cyUserCredentials[user];

    const formData = new FormData();
    formData.append('UserSelect', localPartyId);
    formData.append('AuthenticationLevel', authenticationLevel);

    cy.request({
      method: 'POST',
      url: `${Cypress.config('baseUrl')}/Home/LogInTestUser`,
      body: formData,
    }).as('login');
    waitForLogin();
  } else {
    const { userName, userPassword } = cyUserCredentials[user];
    if (userName === cyUserCredentials.selfIdentified.userName) {
      tt02_loginSelfIdentified(userName, userPassword);
    } else {
      tt02_login(userName, userPassword);
    }
  }
}

function tt02_login(user: string, pwd: string) {
  cy.request({
    method: 'POST',
    url: `${Cypress.config('baseUrl')}/api/authentication/authenticatewithpassword`,
    headers: {
      'Content-Type': 'application/hal+json',
    },
    body: JSON.stringify({
      UserName: user,
      UserPassword: pwd,
    }),
  }).as('login');
  waitForLogin();
}

function waitForLogin() {
  cy.get('@login').should((response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = response as unknown as Cypress.Response<any>;
    expect(r.status).to.eq(200);
  });
}

function tt02_loginSelfIdentified(user: string, pwd: string) {
  const loginUrl = 'https://tt02.altinn.no/ui/Authentication/SelfIdentified';
  cy.intercept('POST', loginUrl).as('login');
  cy.visit(loginUrl);
  cy.findByRole('textbox', { name: /Brukernavn/i }).type(user);
  cy.get('input[type=password]').type(pwd);
  cy.findByRole('button', { name: /Logg inn/i }).click();
}

Cypress.Commands.add('startAppInstance', (appName, options) => {
  const { user = 'default', evaluateBefore, urlSuffix = '', authenticationLevel } = options || {};
  const env = dotenv.config().parsed || {};
  cy.log(`Starting app instance: ${appName}`);
  if (user) {
    cy.log(`Logging in as user: ${user}`);
  }

  // You can override the host we load css/js from, using multiple methods:
  //   1. Start Cypress with --env environment=<docker|podman|tt02>,host=<host>
  //   2. Set CYPRESS_HOST=<host> in your .env file
  // This is useful, for example if you want to run a Cypress test locally in the background while working on
  // other things. Build the app-frontend with `yarn build` and serve it with `yarn serve 8081`, then run
  // Cypress using a command like this:
  //   npx cypress run --env environment=tt02,host=localhost:8081 -s 'test/e2e/integration/*/*.ts'
  const targetHost = Cypress.env('host') || env.CYPRESS_HOST || 'localhost:8080';

  const visitOptions = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onBeforeLoad: (win: any) => {
      cy.spy(win.console, 'log').as('console.log');
      cy.spy(win.console, 'warn').as('console.warn');
      cy.spy(win.console, 'error').as('console.error');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLoad: (win: any) => {
      if (win.logError) {
        cy.spy(win, 'logError').as('window.logError');
        cy.spy(win, 'logWarn').as('window.logWarn');
        cy.spy(win, 'logInfo').as('window.logInfo');

        cy.spy(win, 'logErrorOnce').as('window.logErrorOnce');
        cy.spy(win, 'logWarnOnce').as('window.logWarnOnce');
        cy.spy(win, 'logInfoOnce').as('window.logInfoOnce');
      }
    },
  };

  // Run this using --env environment=<docker|podman|tt02>,responseFuzzing=on to simulate an unreliable network. This might
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

  user && login(user, authenticationLevel);
  !user && cy.clearCookies();
  cy.visit(targetUrlRaw, visitOptions);

  if (evaluateBefore) {
    cy.get('#cy-evaluating-js').should('not.exist');
  }

  cy.injectAxe();
});

export function getTargetUrl(appName: string) {
  return Cypress.env('type') === 'localtest'
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
