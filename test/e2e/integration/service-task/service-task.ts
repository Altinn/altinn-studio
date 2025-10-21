import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { SearchParams } from 'src/core/routing/types';
import type { ILayoutSets } from 'src/layout/common.generated';

const appFrontend = new AppFrontend();

describe('Service task', () => {
  it('should display the default service task layout when failing', { retries: 0 }, () => {
    startAppAndFillToFailure();

    // This message comes from a custom layout-set showing an error in this service-task
    cy.findByText('Uff da! Her tryna denne service-tasken, men det var jo du som valgte at det skulle skje.').should(
      'be.visible',
    );

    assertAndDismissNotification('Service task fail returned a failed result!');

    // This layout-set does not have a pdfLayoutName, so it will auto-generate a PDF
    cy.testPdf({
      snapshotName: 'service-task-with-layout',
      returnToForm: true,
      enableResponseFuzzing: false,
      callback: () => {
        // This is not a great-looking PDF, but when overriding it is the responsibility of the
        // developer to make a good PDF.
        cy.findByText(
          'Uff da! Her tryna denne service-tasken, men det var jo du som valgte at det skulle skje.',
        ).should('be.visible');
      },
    });

    goBackAndAchieveSuccess();
  });

  it('should display something sensible when there is no layout-set for the service task', { retries: 0 }, () => {
    cy.intercept('**/layoutsets', (req) => {
      req.on('response', (res) => {
        // We do some trickery here. Ordinarily it's the PDF service task we would test, but we can't really reach
        // that from the test (it will only be reached from the real PDF generator). However, the 'Fail' task is also
        // a service task, so we can remove the custom layout-set here to simulate what happens in the PDF generator
        // for a PDF-generating service-task.
        const layoutSets: ILayoutSets = JSON.parse(res.body);
        layoutSets.sets = layoutSets.sets.filter((set) => set.id !== 'Fail');
        res.send(layoutSets);
      });
    }).as('LayoutSets');

    startAppAndFillToFailure();

    cy.findByText(/En feil oppstod under automatisk behandling av skjemaet/).should('be.visible');
    cy.findByText(/Du kan prøve å utføre behandlingen på nytt/).should('be.visible');
    cy.visualTesting('service-task-no-layout-set');
    assertAndDismissNotification('Service task fail returned a failed result!');

    cy.testPdf({
      snapshotName: 'service-task-with-multiple-tasks',
      returnToForm: true,
      enableResponseFuzzing: false,
      buildUrl: (href) => {
        const queryArgs = new URLSearchParams();
        queryArgs.append(SearchParams.Pdf, '1');
        for (const task of ['Task_Utfylling1', 'Task_Utfylling2']) {
          queryArgs.append(SearchParams.PdfForTask, task);
        }

        const baseUrl = href.split('?')[0];
        return `${baseUrl}?${queryArgs.toString()}`;
      },
      callback: () => {
        cy.expectPageBreaks(2);
        cy.findByText('En hilsen fra Task_Utfylling1').should('be.visible');
        cy.findByText('Lykkeønsker fra et underskjema').should('be.visible');
        cy.findByText('Himling med øyne og skuldertrekk fra Task_Utfylling2').should('be.visible');
      },
    });

    goBackAndAchieveSuccess();
  });
});

function startAppAndFillToFailure() {
  cy.startAppInstance(appFrontend.apps.serviceTask, { cyUser: 'manager' });
  cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling1' }).type('En hilsen fra Task_Utfylling1');
  cy.waitUntilSaved();

  cy.get('#subform-Subform-z8we7d-add-button').click();
  cy.get('#finishedLoading').should('exist');
  cy.findByRole('textbox', { name: 'Subform tekstfelt' }).type('Lykkeønsker fra et underskjema');
  cy.findByRole('button', { name: 'Ferdig' }).click();

  cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling1' }).should(
    'have.value',
    'En hilsen fra Task_Utfylling1',
  );
  cy.waitUntilSaved();
  cy.findByRole('button', { name: 'Neste' }).click();

  cy.findByRole('heading', { name: 'Task_Utfylling2' }).should('be.visible');
  cy.get('#finishedLoading').should('exist');
  cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling2' }).type(
    'Himling med øyne og skuldertrekk fra Task_Utfylling2',
  );
  cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling2' }).should(
    'have.value',
    'Himling med øyne og skuldertrekk fra Task_Utfylling2',
  );
  cy.findByRole('radiogroup', { name: /Skal Task_Fail servicetask feile\?/ })
    .findByRole('radio', { name: 'Ja' })
    .click();
  cy.waitUntilSaved();
  cy.findByRole('button', { name: 'Neste' }).click();
}

function assertAndDismissNotification(notificationText: string) {
  cy.findByRole('region', { name: /Notifications/ }).should('be.visible');
  cy.findByRole('region', { name: /Notifications/ })
    .findByText(notificationText)
    .should('exist');
  cy.findByRole('region', { name: /Notifications/ })
    .findByRole('button', { name: 'close' })
    .click();
  cy.findByRole('region', { name: /Notifications/ }).should('not.be.visible');
}

function goBackAndAchieveSuccess() {
  cy.waitUntilSaved();
  cy.findByRole('button', { name: 'Prøv igjen' }).should('be.visible');
  cy.findByRole('button', { name: 'Gå tilbake' }).click();

  cy.findByRole('radiogroup', { name: /Skal Task_Fail servicetask feile\?/ })
    .findByRole('radio', { name: 'Nei' })
    .click();
  cy.waitUntilSaved();
  cy.findByRole('button', { name: 'Neste' }).click();

  cy.findByText('Skjemaet er sendt inn').should('be.visible');
  cy.findAllByRole('link', { name: /\.pdf$/ }).should('have.length', 2);
  cy.findByRole('link', { name: /Autogenerert PDF av Task_Utfylling1 og Task_Utfylling2\.pdf$/ }).should('be.visible');
  cy.findByRole('link', { name: /PDF basert på layout-set\.pdf$/ }).should('be.visible');
}
