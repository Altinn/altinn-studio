import dotenv from 'dotenv';

import { cyUserLogin, tenorUserLogin } from 'test/e2e/support/auth';

Cypress.Commands.add('startAppInstance', (appName, options) => {
  const { cyUser = 'default', tenorUser = null, urlSuffix = '', authenticationLevel = '1' } = options || {};
  const env = dotenv.config({ quiet: true }).parsed || {};
  const targetHost = Cypress.env('host') || env.CYPRESS_HOST || 'localhost:8080';
  const targetUrlRaw = getTargetUrl(appName) + urlSuffix;

  const protocol = targetUrlRaw.startsWith('https://') ? 'https' : 'http';
  const frontendUrl = `${protocol}://${targetHost}`;

  cy.log(`Starting app instance: ${appName}`);
  cy.log(`frontendUrl: ${frontendUrl}`);

  if (tenorUser) {
    tenorUserLogin({ appName, tenorUser, authenticationLevel });
  } else if (cyUser) {
    cyUserLogin({ cyUser, authenticationLevel });
  }

  cy.setCookie('frontendVersion', frontendUrl);
  const visitOptions: Partial<Cypress.VisitOptions> = {
    onBeforeLoad: (win) => {
      const wrap =
        (name: string, spy: (...args: unknown[]) => unknown) =>
        (...args: unknown[]) => {
          Cypress.log({
            name,
            message: args.join(' '),
          });
          spy(...args);
        };

      // These have all been spied on by cypress-fail-on-console-error, so we wrap them and log to Cypress.log()
      // before the spy is called. This way, we can see the log message in the Cypress test runner output before
      // they potentially fail the test.
      win.console.log = wrap('console.log', win.console.log);
      win.console.warn = wrap('console.warn', win.console.warn);
      win.console.error = wrap('console.error', win.console.error);
    },
    onLoad: (win) => {
      if (win.logError !== undefined) {
        cy.spy(win, 'logError').as('window.logError');
        cy.spy(win, 'logWarn').as('window.logWarn');
        cy.spy(win, 'logInfo').as('window.logInfo');

        cy.spy(win, 'logErrorOnce').as('window.logErrorOnce');
        cy.spy(win, 'logWarnOnce').as('window.logWarnOnce');
        cy.spy(win, 'logInfoOnce').as('window.logInfoOnce');
      }
    },
  };

  cy.visit(targetUrlRaw, visitOptions);

  // If we landed on instance-selection, click the new instance button
  cy.url().then((url) => {
    if (url.includes('instance-selection')) {
      cy.get('#new-instance-button').click();
    }
  });

  // You can override the host we load css/js from, using multiple methods:
  //   1. Start Cypress with --env environment=<docker|podman|tt02>,host=<host>
  //   2. Set CYPRESS_HOST=<host> in your .env file
  // This is useful, for example if you want to run a Cypress test locally in the background while working on
  // other things. Build the app-frontend with `yarn build` and serve it with `yarn serve 8081`, then run
  // Cypress using a command like this:x
  //   npx cypress run --env environment=tt02,host=localhost:8081 -s 'test/e2e/integration/*/*.ts'

  // Run this using --env environment=<docker|podman|tt02>,responseFuzzing=on to simulate an unreliable network. This might
  // help us find bugs (usually race conditions) that only occur requests/responses arrive out of order.
  if (Cypress.env('responseFuzzing') === 'on') {
    const [min, max] = [10, 1000];
    cy.log(`Response fuzzing on, will delay responses randomly between ${min}ms and ${max}ms`);
    cy.enableResponseFuzzing({ min, max, matchingRoutes: '**/api/**' });
    cy.enableResponseFuzzing({ min, max, matchingRoutes: '**/instances/**' });
  } else {
    cy.log(`Response fuzzing off, enable with --env responseFuzzing=on`);
  }

  cy.intercept('GET', `http://${targetHost}/altinn-app-frontend.js`).as('js');
  cy.intercept('GET', `http://${targetHost}/altinn-app-frontend.css`).as('css');

  cy.intercept('https://altinncdn.no/toolkits/altinn-app-frontend/*/altinn-app-frontend.*', (req) => {
    req.destroy();
    throw new Error('Requested asset from altinncdn.no, our rewrite code is apparently not working, aborting test');
  });

  // Make sure the app has started loading before continuing
  cy.findByTestId('presentation').should('exist');
  cy.injectAxe();

  // Url suffix is used when logging in as another user in an existing instance. In those cases we might load assets
  // multiple times, and that's OK.
  if (!urlSuffix) {
    // This guards against loading the app multiple times. This can happen if any of the login procedures end up
    // visiting the app before we call cy.visit() above. In those cases the app might be loaded twice, and requests will
    // be cancelled mid-flight, which may cause unexpected failures and lots of empty instances. The browser can also
    // cache these requests, so they can be 0, which is also OK.
    cy.get('@js.all').should('have.length.below', 2);
    cy.get('@css.all').should('have.length.below', 2);
  }
});

export function getTargetUrl(appName: string) {
  return Cypress.env('type') === 'localtest'
    ? `${Cypress.config('baseUrl')}/ttd/${appName}`
    : `https://ttd.apps.${Cypress.config('baseUrl')?.slice(8)}/ttd/${appName}`;
}
