import { v4 as uuidv4 } from 'uuid';

import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { cyMockResponses } from 'test/e2e/pageobjects/party-mocks';

import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { InstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import type { ITextResourceResult } from 'src/features/language/textResources';

const appFrontend = new AppFrontend();

describe('Instantiation', () => {
  // See ttd/frontend-test/App/logic/Instantiation/InstantiationValidator.cs
  const invalidParty =
    Cypress.env('type') === 'localtest'
      ? /950474084/ // Localtest: Oslos Vakreste borettslag
      : /310732001/; // TT02: Søvnig Impulsiv Tiger AS

  it('should show an error message when going directly to instantiation', () => {
    cyMockResponses({
      doNotPromptForParty: false,
      onEntryShow: 'new-instance',
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });
    cy.findByRole('button', { name: invalidParty }).click();

    cy.findByText('Du kan ikke starte denne tjenesten').should('be.visible');
    assertErrorMessage();
  });

  it('should show an error message when starting a new instance from instance-selection', () => {
    cyMockResponses({
      doNotPromptForParty: false,
      onEntryShow: 'select-instance',
      activeInstances: [
        { id: 'abc123', lastChanged: '2023-01-01T00:00:00.000Z', lastChangedBy: 'user' },
        { id: 'def456', lastChanged: '2023-01-02T00:00:00.000Z', lastChangedBy: 'user' },
      ],
    });
    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });
    cy.findByRole('button', { name: invalidParty }).click();

    cy.findByText('Du har allerede startet å fylle ut dette skjemaet.').should('be.visible');
    cy.findByRole('button', { name: 'Start på nytt' }).click();

    assertErrorMessage();
    cy.findByText('Du kan ikke starte denne tjenesten').should('not.exist');
  });

  function assertErrorMessage() {
    cy.findByText(
      /Aktøren du valgte kan ikke opprette en instans av dette skjemaet. Dette er en egendefinert feilmelding for akkurat denne appen./,
    ).should('be.visible');
    cy.findByRole('link', { name: 'Vennligst velg en annen aktør' }).click();

    cy.findByRole('button', { name: invalidParty }).should('be.visible');
  }

  it('should show custom error message from instantiation validator when directly instantiating', () => {
    cy.allowFailureOnEnd();
    cy.intercept('GET', '**/api/v1/applicationmetadata', (req) => {
      req.on('response', (res) => {
        const body = res.body as IncomingApplicationMetadata;
        body.onEntry = { show: 'new-instance' };
      });
    });

    cy.intercept('GET', '**/texts/nb', (req) => {
      req.on('response', (res) => {
        const body = res.body as ITextResourceResult;
        body.resources.push({
          id: 'custom_error_too_long',
          value: 'Verdien kan ikke være lengre enn {0}, den er nå {1}',
          variables: [
            {
              key: 'max_length',
              dataSource: 'customTextParameters',
            },
            {
              key: 'current_length',
              dataSource: 'customTextParameters',
            },
          ],
        });
      });
    });

    cy.intercept('POST', '**/instances**', (req) => {
      req.reply({
        statusCode: 403,
        body: {
          valid: false,
          customTextKey: 'custom_error_too_long',
          customTextParameters: {
            max_length: '10',
            current_length: '12',
          },
        } as InstantiationValidationResult,
      });
    });

    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });
    cy.findByText('Du kan ikke starte denne tjenesten').should('be.visible');
    cy.findByText('Verdien kan ikke være lengre enn 10, den er nå 12');
  });

  it('should show custom error message from instantiation validator from instance-selection', () => {
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

    cy.intercept('GET', '**/texts/nb', (req) => {
      req.on('response', (res) => {
        const body = res.body as ITextResourceResult;
        body.resources.push({
          id: 'custom_error_too_long',
          value: 'Verdien kan ikke være lengre enn {0}, den er nå {1}',
          variables: [
            {
              key: 'max_length',
              dataSource: 'customTextParameters',
            },
            {
              key: 'current_length',
              dataSource: 'customTextParameters',
            },
          ],
        });
      });
    });

    cy.intercept('POST', '**/instances**', (req) => {
      req.reply({
        statusCode: 403,
        body: {
          valid: false,
          customTextKey: 'custom_error_too_long',
          customTextParameters: {
            max_length: '10',
            current_length: '22',
          },
        } as InstantiationValidationResult,
      });
    });

    cy.startAppInstance(appFrontend.apps.frontendTest, { cyUser: 'manager' });
    cy.findByText('Du har allerede startet å fylle ut dette skjemaet.').should('be.visible');
    cy.findByRole('button', { name: 'Start på nytt' }).click();
    cy.findByText('Du kan ikke starte denne tjenesten').should('not.exist');
    cy.get(appFrontend.errorReport).should('contain.text', 'Verdien kan ikke være lengre enn 10, den er nå 22');
  });
});
