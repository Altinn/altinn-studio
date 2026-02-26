import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

type BadMessageAppeared = {
  appeared: boolean;
};

describe('Feedback task', () => {
  it('feedback task can fail and go to data task', () => {
    cy.startAppInstance(appFrontend.apps.stateless);

    cy.wrap<BadMessageAppeared>({ appeared: false }).as('badMessage');
    cy.document().then(function (doc) {
      // Observe if the target text ever appeared. We've been having a recurring issue where this text briefly
      // flashes over the screen when doing a process/next, but regular Cypress assertions like should('not.exist')
      // won't catch it since it disappears so fast. Instead we register a mutation observer to catch the message
      // if it appears and fail the test in case that happens.
      const obs = new doc.defaultView!.MutationObserver(() => {
        if (doc.body.innerText.includes('Denne delen av skjemaet er ikke tilgjengelig')) {
          this.badMessage.appeared = true;
        }
      });
      obs.observe(doc.body, { childList: true, subtree: true, characterData: true });
    });

    cy.startStatefulFromStateless();

    cy.intercept('PUT', '**/process/next*').as('nextProcess');
    cy.get(appFrontend.sendinButton).click();
    cy.findByText('Denne delen av skjemaet er ikke tilgjengelig', { timeout: 0 }).should('not.exist');
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);

    cy.get('#firmanavn').type('Foo bar AS');
    cy.get('#orgnr').type('12345678901');
    cy.get('#gatewayShouldFail').find('[value="true"]').click();
    cy.waitUntilSaved();
    cy.get(appFrontend.sendinButton).click();
    cy.findByText('Denne delen av skjemaet er ikke tilgjengelig').should('not.exist');
    cy.wait('@nextProcess').its('response.statusCode').should('eq', 200);

    cy.get(appFrontend.feedback).should(
      'contain.text',
      'Du må flytte instansen til neste prosess med et API kall til process/next',
    );
    cy.get(appFrontend.feedback).should('contain.text', 'Firmanavn: Foo bar AS');
    cy.get(appFrontend.feedback).should('contain.text', 'Org.nr: 12345678901');

    cy.moveProcessNext();
    cy.get(appFrontend.feedback).should('not.exist');

    cy.findByText('Det forrige prosess-steget feilet. Trykk på knappen under for å prøve på nytt.').should('exist');
    cy.findByRole('button', { name: 'Prøv igjen' }).click();
    cy.get('#gatewayShouldFail').find('[value="true"]').should('be.checked');
    cy.get('#gatewayShouldFail').find('[value="false"]').click();
    cy.waitUntilSaved();
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.feedback).should(
      'contain.text',
      'Du må flytte instansen til neste prosess med et API kall til process/next',
    );
    cy.moveProcessNext();

    cy.get(appFrontend.receipt.container).should('contain.text', texts.securityReasons);
  });

  afterEach(() => {
    cy.get<BadMessageAppeared>('@badMessage').then((badMessage) => {
      expect(badMessage.appeared, 'Forbidden message should never appear').to.be.false;
    });
  });
});
