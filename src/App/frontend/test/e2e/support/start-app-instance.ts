import escapeRegex from 'escape-string-regexp';

import { cyUserLogin, tenorUserLogin } from 'test/e2e/support/auth';
import type { AppResponseRef } from 'test/e2e/support/auth';

Cypress.Commands.add('startAppInstance', function (appName, options) {
  const {
    cyUser = 'default',
    tenorUser = null,
    evaluateBefore,
    urlSuffix = '',
    authenticationLevel = '1',
  } = options || {};
  cy.log(`Starting app instance: ${appName}`);

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

  // Run this using --env environment=<localtest|tt02>,responseFuzzing=on to simulate an unreliable network. This might
  // help us find bugs (usually race conditions) that only occur requests/responses arrive out of order.
  if (Cypress.env('responseFuzzing') === 'on') {
    const [min, max] = [10, 1000];
    cy.log(`Response fuzzing on, will delay responses randomly between ${min}ms and ${max}ms`);
    cy.enableResponseFuzzing({ min, max, matchingRoutes: '**/api/**' });
    cy.enableResponseFuzzing({ min, max, matchingRoutes: '**/instances/**' });
  } else {
    cy.log(`Response fuzzing off, enable with --env responseFuzzing=on`);
  }

  const targetUrlRaw = getTargetUrl(appName) + urlSuffix;
  const targetUrl = new RegExp(`^${escapeRegex(targetUrlRaw)}/?$`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ranBefore = ((this.currentTest ?? this.test) as any).startAppInstanceRanBefore ?? false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((this.currentTest ?? this.test) as any).startAppInstanceRanBefore = true;

  if (!ranBefore) {
    // This mechanism lets you override what happens in the @app response, for example in a login handler.
    cy.wrap<AppResponseRef>({ current: undefined }).as('appResponse');

    cy.get<AppResponseRef>('@appResponse').then((ref) => {
      cy.intercept({ url: targetUrl }, (req) => {
        const cookies = req.headers['cookie'] || '';
        req.on('response', (res) => {
          if (typeof res.body === 'string' || res.statusCode === 200) {
            if (ref.current) {
              ref.current(res);
              return;
            }

            if (evaluateBefore && !cookies.includes('cy-evaluated-js=true')) {
              res.body = generateHtmlToEval(evaluateBefore);
            }
          }
        });
      }).as('app');
    });
  }

  if (Cypress.env('type') === 'localtest') {
    cy.clearCookies({ domain: 'local.altinn.cloud' });
  } else {
    cy.clearCookies({ domain: 'tt02.altinn.no' });
    cy.clearCookies({ domain: 'ttd.apps.tt02.altinn.no' });
    cy.clearCookies({ domain: 'login.test.idporten.no' });
    cy.clearCookies({ domain: 'platform.tt02.altinn.no' });
  }

  if (tenorUser) {
    tenorUserLogin({ appName, tenorUser, authenticationLevel });
  } else if (cyUser) {
    cyUserLogin({ cyUser, authenticationLevel, appName });
  }

  cy.visit(targetUrlRaw, visitOptions);

  // Make sure the app has started loading before continuing
  cy.findByTestId('presentation').should('exist');
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
