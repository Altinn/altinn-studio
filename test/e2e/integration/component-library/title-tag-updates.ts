import { v4 as uuidv4 } from 'uuid';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Title tag updates', () => {
  it('Should update the title tag when on select instance page', () => {
    const instanceIdExamples = [`512345/${uuidv4()}`, `512345/${uuidv4()}`, `512345/${uuidv4()}`];

    cy.intercept('**/active', [
      {
        id: instanceIdExamples[0],
        lastChanged: '2021-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Ola Nordmann',
      },
      {
        id: instanceIdExamples[1],
        lastChanged: '2022-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Foo Bar',
      },
      {
        id: instanceIdExamples[2],
        lastChanged: '2020-04-06T14:11:02.6893987Z',
        lastChangedBy: 'Bar Baz',
      },
    ]);
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.location('origin').then((origin) => {
      const newUrl = `${origin}/ttd/component-library/#/instance-selection`;
      cy.visit(newUrl);
      cy.title().should('eq', 'Fortsett der du slapp - altinn-apps-all-components - Testdepartementet');
    });
  });

  it('Should update the title tag when changing pages', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('#navigation-menu').find('button').contains('Tabs').click();
    cy.title().should('eq', 'Tabs - altinn-apps-all-components - Testdepartementet');
  });

  it('Should update the title in error page', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('#navigation-menu').find('button').contains('Oppsummering 2.0').click();
    cy.url().then((currentUrl) => {
      cy.log(currentUrl);
      const newUrl = currentUrl.replace('Task_1', 'Task_3');
      cy.visit(newUrl);
      cy.title().should('eq', 'Denne delen av skjemaet finnes ikke. - altinn-apps-all-components - Testdepartementet');
    });
  });
});
