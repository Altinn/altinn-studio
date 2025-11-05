import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { ILayoutSettings } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';

const appFrontend = new AppFrontend();

function fillTwoSubforms() {
  cy.findByRole('textbox', { name: /navn/i }).type('Per');
  cy.findByRole('textbox', { name: /alder/i }).type('28');

  cy.findByRole('button', { name: /legg til moped/i }).clickAndGone();
  cy.findByRole('textbox', { name: /registreringsnummer/i }).type('ABC123');
  cy.findByRole('textbox', { name: /merke/i }).type('Digdir');
  cy.findByRole('textbox', { name: /modell/i }).type('Scooter2000');
  cy.findByRole('textbox', { name: /produksjonsår/i }).type('2024');
  cy.findByRole('button', { name: /ferdig/i }).clickAndGone();

  cy.findByRole('button', { name: /legg til moped/i }).clickAndGone();
  cy.findByRole('textbox', { name: /registreringsnummer/i }).type('XYZ987');
  cy.findByRole('textbox', { name: /merke/i }).type('Altinn');
  cy.findByRole('textbox', { name: /modell/i }).type('3.0');
  cy.findByRole('textbox', { name: /produksjonsår/i }).type('2030');
  cy.findByRole('button', { name: /ferdig/i }).clickAndGone();
}

describe('Subform test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
  });

  it('PDF should include subforms + single-subform PDFs should work', { retries: 0 }, () => {
    fillTwoSubforms();
    cy.testPdf({
      snapshotName: 'subform',
      enableResponseFuzzing: true,
      returnToForm: true,
      callback: () => {
        cy.getSummary('Navn').should('contain.text', 'Per');
        cy.getSummary('Alder').should('contain.text', '28 år');

        cy.getSummary('Registreringsnummer').eq(0).should('contain.text', 'ABC123');
        cy.getSummary('Merke').eq(0).should('contain.text', 'Digdir');
        cy.getSummary('Modell').eq(0).should('contain.text', 'Scooter2000');
        cy.getSummary('Produksjonsår').eq(0).should('contain.text', '2024');

        cy.getSummary('Registreringsnummer').eq(1).should('contain.text', 'XYZ987');
        cy.getSummary('Merke').eq(1).should('contain.text', 'Altinn');
        cy.getSummary('Modell').eq(1).should('contain.text', '3.0');
        cy.getSummary('Produksjonsår').eq(1).should('contain.text', '2030');
      },
    });

    cy.findAllByRole('button', { name: /endre/i }).first().clickAndGone();
    cy.findByRole('textbox', { name: /registreringsnummer/i }).should('have.value', 'ABC123');

    cy.testPdf({
      snapshotName: 'single-subform',
      returnToForm: true,
      buildUrl: buildUrlForSingleSubform,
      callback: () => {
        cy.get('#moped-blurb').should(
          'contain.text',
          'Fyll inn dette skjemaet for å registrere en moped i din garasje',
        );
        cy.getSummary('Navn').should('not.exist');
        cy.getSummary('Alder').should('not.exist');

        cy.getSummary('Registreringsnummer').should('contain.text', 'ABC123');
        cy.getSummary('Registreringsnummer').should('not.contain.text', 'XYZ987');
        cy.getSummary('Merke').should('contain.text', 'Digdir');
        cy.getSummary('Modell').should('contain.text', 'Scooter2000');
        cy.getSummary('Produksjonsår').should('contain.text', '2024');
      },
    });

    cy.intercept('GET', '**/api/layoutsettings/moped-subform', (req) => {
      req.on('response', (res) => {
        const body = JSON.parse(res.body) as ILayoutSettings;
        body.pages.pdfLayoutName = 'moped-pdf'; // Forces PDF engine to use a tailor-made layout
        res.send(body);
      });
    }).as('settings');

    cy.testPdf({
      snapshotName: 'single-subform-custom',
      buildUrl: buildUrlForSingleSubform,
      callback: () => {
        cy.get('#moped-blurb').should('not.exist');
        cy.getSummary('Navn').should('not.exist');
        cy.getSummary('Alder').should('not.exist');

        cy.getSummary('Registreringsnummer').should('contain.text', 'ABC123');
        cy.getSummary('Registreringsnummer').should('not.contain.text', 'XYZ987');
        cy.getSummary('Merke').should('contain.text', 'Digdir');
        cy.getSummary('Modell').should('contain.text', 'Scooter2000');
        cy.getSummary('Produksjonsår').should('contain.text', '2024');
      },
    });
  });

  it('should render PDF with summary2 layoutset with subform and subform table', { retries: 0 }, () => {
    const pdfLayoutName = 'CustomPDF';
    cy.intercept('GET', '**/layoutsettings/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutSettings = JSON.parse(res.body);
        res.send({
          ...body,
          pages: { ...body.pages, pdfLayoutName },
        });
      }),
    );

    cy.intercept('GET', '**/layouts/**', (req) =>
      req.on('response', (res) => {
        const body: ILayoutCollection = JSON.parse(res.body);
        res.send({
          ...body,
          [pdfLayoutName]: {
            data: {
              layout: [
                {
                  id: 'title',
                  type: 'Header',
                  textResourceBindings: { title: 'This is a custom PDF' },
                  size: 'L',
                },
                {
                  id: 'summary2-layoutset',
                  type: 'Summary2',
                  target: {
                    taskId: 'Task_1',
                    type: 'layoutSet',
                  },
                  showPageInAccordion: false,
                  overrides: [
                    {
                      componentId: 'subform-mopeder',
                      display: 'table',
                    },
                  ],
                },
              ],
            },
          },
        });
      }),
    );

    cy.waitUntilSaved();
    fillTwoSubforms();

    cy.testPdf({
      snapshotName: 'subform',
      enableResponseFuzzing: true,
      callback: () => {
        cy.getSummary('Navn').should('contain.text', 'Per');
        cy.getSummary('Alder').should('contain.text', '28 år');

        cy.findByRole('columnheader', { name: 'Regnummer' });
        cy.findByRole('columnheader', { name: 'Merke' });
        cy.findByRole('columnheader', { name: 'Ekstra info' });

        cy.findByRole('cell', { name: 'ABC123' });
        cy.findByRole('cell', { name: 'Digdir' });
        cy.findByRole('cell', { name: 'XYZ987' });
        cy.findByRole('cell', { name: 'Altinn' });
      },
    });
  });
});

function buildUrlForSingleSubform(href: string) {
  if (!href.includes('/utfylling/') && !href.includes('/whatever/')) {
    // We replace this with 'whatever' to make sure we can still load the PDF whatever the main page
    // name is. It should not matter inside this subform.
    throw new Error('Expected URL to contain /utfylling/ but it was not found');
  }

  if (!href.endsWith('/moped-utfylling')) {
    throw new Error('Expected URL to end with /moped-utfylling but it was not found');
  }

  return href.replace('/utfylling/', '/whatever/').replace('/moped-utfylling', '/?pdf=1');
}
