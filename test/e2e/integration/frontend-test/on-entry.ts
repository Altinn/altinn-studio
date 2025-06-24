import { v4 as uuidv4 } from 'uuid';

import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

const appFrontend = new AppFrontend();

describe('On Entry', () => {
  const instanceIdExamples = [`512345/${uuidv4()}`, `512345/${uuidv4()}`, `512345/${uuidv4()}`];
  beforeEach(() => {
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
  });

  function interceptAppMetadata(defaultSelectedOption: number) {
    cy.intercept('**/applicationmetadata', (req) => {
      req.on('response', (res) => {
        const body = res.body as IncomingApplicationMetadata;
        body.onEntry = {
          show: 'select-instance',
          instanceSelection: {
            sortDirection: 'desc',
            rowsPerPageOptions: [1, 2, 3],
            defaultSelectedOption,
          },
        };
        res.send(body);
      });
    });
  }

  it('is possible to select an existing instance', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.get(appFrontend.selectInstance.header).should('contain.text', texts.alreadyStartedForm);
    cy.get(appFrontend.selectInstance.description).should('contain.text', texts.continueOrStartNew);
    cy.get(appFrontend.selectInstance.tableBody).find('tr').should('have.length', instanceIdExamples.length);

    // Verify order of rows (they should be sorted with the latest instance at the bottom)
    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(0).find('td').eq(1).should('contain.text', 'Bar Baz');
    cy.get(appFrontend.selectInstance.tableBody)
      .find('tr')
      .eq(1)
      .find('td')
      .eq(1)
      .should('contain.text', 'Ola Nordmann');
    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(2).find('td').eq(1).should('contain.text', 'Foo Bar');

    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(1).as('tableRow');
    cy.get('@tableRow')
      .find('td')
      .eq(0)
      .contains(/04\/06\/2021|06.04.2021/g);
    cy.get('@tableRow').find('td').eq(1).should('have.text', 'Ola Nordmann');
    cy.snapshot('select-instance');

    // Click to begin working on one of our fake instances
    cy.get('@tableRow').find('td').eq(2).find('button').click();
    cy.url().should('contain', instanceIdExamples[0]);

    // The instance does not actually exist, we pretended it did by mocking
    // the response, so trying to fetch it will fail with a 403
    cy.get(appFrontend.instanceErrorCode).should('have.text', '403 - Forbidden');
    cy.allowFailureOnEnd();
  });

  it('is possible to paginate the instances and select default rows per page', () => {
    interceptAppMetadata(1);
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.get(appFrontend.selectInstance.tableBody).find('tr').should('have.length', 2);

    // Verify order of rows (they should be sorted with the latest instance at the top)
    cy.get(appFrontend.selectInstance.tableBody).find('tr').eq(0).find('td').eq(1).should('contain.text', 'Foo Bar');
    cy.get(appFrontend.selectInstance.tableBody)
      .find('tr')
      .eq(1)
      .find('td')
      .eq(1)
      .should('contain.text', 'Ola Nordmann');

    cy.get(appFrontend.selectInstance.tableBody)
      .find('tr')
      .eq(1)
      .as('tableRow')
      .find('td')
      .eq(1)
      .should('have.text', 'Ola Nordmann');

    cy.findByRole('button', { name: /neste/i }).click();

    cy.get(appFrontend.selectInstance.tableBody)
      .find('tr')
      .eq(0)
      .as('tableRow')
      .find('td')
      .eq(1)
      .should('have.text', 'Bar Baz');
  });

  it('will utilize index 0 when defaultSelectedOption is assigned an invalid index number', () => {
    interceptAppMetadata(5);
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.selectInstance.tableBody).find('tr').should('have.length', 1);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
  });

  it('is possible to create a new instance', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.intercept('POST', `/ttd/frontend-test/instances?instanceOwnerPartyId*`).as('createdInstance');
    cy.get(appFrontend.selectInstance.newInstance).click();
    cy.wait('@createdInstance').its('response.statusCode').should('eq', 201);
    cy.url().should('not.contain', instanceIdExamples[0]);

    cy.get(appFrontend.instanceErrorCode).should('not.exist');
    cy.findByRole('heading', { name: /Appen for test av app frontend/i }).should('exist');
  });

  it('Should show the correct title', () => {
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.selectInstance.container).should('be.visible');
    cy.title().should('eq', 'Fortsett der du slapp - frontend-test - Testdepartementet');
  });

  it('language selector and other page settings still work during instance selection', () => {
    cy.interceptLayoutSetsUiSettings({
      hideCloseButton: true,
      showExpandWidthButton: true,
      showProgress: false,
      showLanguageSelector: true,
    });
    cy.startAppInstance(appFrontend.apps.frontendTest);
    cy.get(appFrontend.selectInstance.header).should('contain.text', texts.alreadyStartedForm);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('not.exist');

    cy.findByRole('button', { name: 'Språkvalg' }).click();
    cy.findByRole('menuitemradio', { name: 'Engelsk' }).click();
    cy.get(appFrontend.selectInstance.header).should('contain.text', 'You have already started filling out this form');
    cy.get(appFrontend.header).should('contain.text', `${appFrontend.apps.frontendTest} ENGLISH`);

    cy.get('[data-testid="presentation"]').should('have.attr', 'data-expanded', 'false');
    cy.findByRole('button', { name: 'Expand width' }).click();
    cy.get('[data-testid="presentation"]').should('have.attr', 'data-expanded', 'true');

    cy.snapshot('wide-instance-selection');
  });
});
