import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

type BadMessageAppeared = {
  appeared: boolean;
};

function watchForForbiddenMessage() {
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
}

describe('Feedback task', () => {
  it('feedback task can fail and go to data task', () => {
    cy.startAppInstance(appFrontend.apps.stateless);

    watchForForbiddenMessage();

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

  it('follows a feedback task when another reader refreshes the instance before its poll', () => {
    cy.startAppInstance(appFrontend.apps.stateless);
    watchForForbiddenMessage();
    cy.startStatefulFromStateless();
    cy.get(appFrontend.sendinButton).click();

    cy.get('#firmanavn').type('Foo bar AS');
    cy.get('#orgnr').type('12345678901');
    cy.get('#gatewayShouldFail').find('[value="true"]').click();
    cy.waitUntilSaved();

    let releaseFeedbackResponse: (() => void) | undefined;
    let feedbackResponseReleased = false;
    let markFeedbackRead: (() => void) | undefined;
    const feedbackRead = new Promise<void>((resolve) => {
      markFeedbackRead = resolve;
    });
    cy.intercept('PUT', '**/process/next*', (req) => {
      req.continue(
        () =>
          new Promise<void>((resolve) => {
            releaseFeedbackResponse = resolve;
          }),
      );
    }).as('showFeedback');
    cy.intercept('GET', '**/instances/*/*/enriched*', (req) => {
      if (!feedbackResponseReleased) {
        return;
      }
      req.on('after:response', (res) => {
        if (res.body.process?.currentTask?.elementId === 'Task_3') {
          markFeedbackRead?.();
        }
      });
    });
    cy.get(appFrontend.sendinButton).click();
    cy.wrap(null).should(() => expect(releaseFeedbackResponse).to.be.a('function'));

    // Install the clock before Feedback mounts, so its first poll is controlled too.
    // Client validation has finished and the unchanged process response is ready to release.
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
    cy.then(() => {
      feedbackResponseReleased = true;
      releaseFeedbackResponse?.();
    });
    cy.wait('@showFeedback').its('response.statusCode').should('eq', 200);
    cy.tick(0);
    cy.wrap(feedbackRead);
    cy.tick(0);
    cy.get(appFrontend.feedback).should('be.visible');

    cy.intercept('GET', '**/instances/*/*/enriched*').as('refreshedInstance');
    cy.moveProcessNext();
    cy.window().then((win) => win.queryClient.refetchQueries({ queryKey: ['instanceData'] }));
    cy.wait('@refreshedInstance').its('response.body.process.currentTask.elementId').should('eq', 'Task_4');
    cy.tick(200);
    cy.tick(200);
    cy.clock().invoke('restore');

    cy.findByText('Det forrige prosess-steget feilet. Trykk på knappen under for å prøve på nytt.').should(
      'be.visible',
    );
    cy.location('pathname').should('include', '/Task_4/');
    cy.findByText('Denne delen av skjemaet er ikke tilgjengelig', { timeout: 0 }).should('not.exist');
  });

  afterEach(() => {
    cy.get<BadMessageAppeared>('@badMessage').then((badMessage) => {
      expect(badMessage.appeared, 'Forbidden message should never appear').to.be.false;
    });
  });
});

describe('Stale feedback task URL', () => {
  it('keeps manual recovery when opened after the process moved on', () => {
    cy.startAppInstance(appFrontend.apps.stateless);
    cy.startStatefulFromStateless();
    cy.get(appFrontend.sendinButton).click();
    cy.get('#firmanavn').type('Foo bar AS');
    cy.get('#orgnr').type('12345678901');
    cy.get('#gatewayShouldFail').find('[value="true"]').click();
    cy.waitUntilSaved();
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.feedback).should('be.visible');

    cy.location('href').then((feedbackUrl) => {
      cy.moveProcessNext();
      cy.visit(feedbackUrl);
    });

    cy.findByText('Denne delen av skjemaet er ikke tilgjengelig. Du kan ikke gjøre endringer her nå.').should(
      'be.visible',
    );
    cy.location('pathname').should('include', '/Task_3');
    cy.findByRole('button', { name: 'Gå til riktig prosessteg' }).click();
    cy.findByText('Det forrige prosess-steget feilet. Trykk på knappen under for å prøve på nytt.').should(
      'be.visible',
    );
    cy.location('pathname').should('include', '/Task_4/');
  });
});
