import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Receipt', () => {
  it('feedback task should work, and it should be possible to view simple receipt when auto delete is true', () => {
    cy.intercept('**/api/layoutsettings/stateless').as('getLayoutStateless');
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.wait('@getLayoutStateless');
    cy.startStatefulFromStateless();
    cy.intercept('PUT', '**/process/next*').as('nextProcess');
    cy.get(appFrontend.sendinButton).click();
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);

    cy.get('#firmanavn').type('Foo bar AS');
    cy.get('#orgnr').type('12345678901');

    // Making sure a manual navigation to the previous task still works and gives you a message
    cy.url().then((url) => cy.visit(url.replace(/\/Task_2\/1$/, '/Task_1')));
    cy.findByRole('button', { name: 'Gå til riktig prosessteg' }).click();
    cy.get('#firmanavn').should('have.value', 'Foo bar AS');

    cy.get(appFrontend.sendinButton).click();
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);

    cy.get(appFrontend.feedback).should(
      'contain.text',
      'Du må flytte instansen til neste prosess med et API kall til process/next',
    );
    cy.get(appFrontend.feedback).should('contain.text', 'Firmanavn: Foo bar AS');
    cy.get(appFrontend.feedback).should('contain.text', 'Org.nr: 12345678901');

    const userFirstName = Cypress.env('defaultFirstName');
    cy.get(appFrontend.feedback).should('contain.text', `Navn: ${userFirstName}`);
    cy.get(appFrontend.feedback).should('contain.text', 'ID: 1364');

    cy.visualTesting('stateless:feedback');

    cy.reloadAndWait();
    cy.get(appFrontend.feedback).should('contain.text', 'Firmanavn: Foo bar AS');

    cy.moveProcessNext();
    cy.get(appFrontend.feedback).should('not.exist');

    cy.get(appFrontend.receipt.container).should('contain.text', texts.securityReasons);
    cy.visualTesting('stateless:receipt');

    cy.reloadAndWait();

    // TODO: Should this even work? How can we load a deleted instance and confirm that it is, indeed, deleted
    // by observing this text in the receipt page?
    cy.get(appFrontend.receipt.container).should('contain.text', texts.securityReasons);

    // Making sure a manual navigation to the previous task still works and gives you a message
    cy.url().then((url) => cy.visit(url.replace(/\/ProcessEnd$/, '/Task_4')));
    cy.get('body').should(
      'contain.text',
      'Denne delen av skjemaet er ikke tilgjengelig. Du kan ikke gjøre endringer her nå.',
    );
    cy.findByRole('button', { name: 'Gå til riktig prosessteg' }).should('not.exist');
    cy.get(appFrontend.receipt.container).should('not.exist');
  });
});
