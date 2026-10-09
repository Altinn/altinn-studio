import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { FrontendTestTask } from 'test/e2e/support/global';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

const appFrontend = new AppFrontend();

const n_loads = 5;

describe('Page load times', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
  });

  [false, true].forEach((PDF) => {
    const pageLoadTimes: Record<string, number[]> = {};
    let pageLoadStart = 0;

    describe(PDF ? 'PDF load times' : 'Page load times', () => {
      ['message', 'changename', 'group', 'likert', 'datalist'].forEach((task: FrontendTestTask) => {
        it(task, () => {
          cy.startAppInstance(appFrontend.apps.frontendTest);
          cy.goto(task);

          if (PDF) {
            cy.location('href').then((href) => {
              const regex = getInstanceIdRegExp();
              const instanceId = regex.exec(href)?.[1];
              const before = href.split(regex)[0];
              const visitUrl = `${before}${instanceId}?pdf=1`;
              cy.visit(visitUrl);
            });
          }

          cy.on('window:before:load', () => {
            pageLoadStart = performance.now();
          });

          cy.then(() => {
            pageLoadTimes[task] = [];
          });

          for (let i = 0; i < n_loads; i++) {
            cy.waitUntilSaved();
            cy.reload(false);
            cy.get(PDF ? '#readyForPrint' : '#finishedLoading').should('exist');
            cy.then(() => {
              pageLoadTimes[task].push(performance.now() - pageLoadStart);
            });
          }
        });
      });

      it('results', () => {
        cy.then(() => {
          for (const task of Object.keys(pageLoadTimes)) {
            cy.log(`${PDF ? 'PDF' : 'Page'} load times for ${task}:`);
            for (const time of pageLoadTimes[task]) {
              cy.log(`- ${Math.round(time)}ms`);
            }
            cy.log(
              `Average time for ${task}: ${Math.round(pageLoadTimes[task].reduce((n, c) => n + c, 0) / pageLoadTimes[task].length)}ms`,
            );
          }
          const values = Object.values(pageLoadTimes).flatMap((times) => times);
          cy.log(`Average time in total: ${Math.round(values.reduce((n, c) => n + c, 0) / values.length)}ms`);
        });
      });
    });
  });
});
