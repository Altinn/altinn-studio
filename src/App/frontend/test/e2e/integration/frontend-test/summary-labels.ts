import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const labels = [
  { id: 'newFirstName', title: 'Oppsummert fornavn' },
  { id: 'confirmChangeName', title: 'Oppsummert bekreftelse' },
  { id: 'fileUpload-changename', title: 'Oppsummerte vedlegg' },
  { id: 'reference-group', title: 'Oppsummerte referanser' },
];

describe('Summary2 labels', () => {
  for (const isCompact of [false, true]) {
    it(`shows descriptions and help with ${isCompact ? 'compact' : 'regular'} labels`, () => {
      cy.interceptLayout(
        'Task_2',
        undefined,
        (layouts) => {
          for (const { id, title } of labels) {
            const component = layouts.form!.data.layout.find((item) => item.id === id)!;
            component.hidden = false;
            component.textResourceBindings = {
              ...component.textResourceBindings,
              summaryTitle: title,
              description: `Beskrivelse for ${title}`,
              help: `Hjelp for ${title}`,
            };
          }
          layouts.summary!.data.layout = [
            { id: 'nav-summary', type: 'NavigationBar' },
            ...labels.map(({ id }) => ({
              id: `summary-${id}`,
              type: 'Summary2' as const,
              target: { type: 'component' as const, id },
              isCompact,
              hideEmptyFields: false,
            })),
          ];
        },
        {},
      );
      cy.goto('changename');
      cy.get(appFrontend.changeOfName.newFirstName).type('Ada');
      cy.gotoNavPage('summary');
      for (const { id, title } of labels) {
        cy.get(`[data-summary-target="${id}"]`).within(() => {
          cy.contains(title).should('be.visible');
          cy.contains(`Beskrivelse for ${title}`).should('be.visible');
          cy.findByRole('button', { name: `Hjelpetekst for ${title}` }).click();
          cy.findByTestId('helptext').should('contain.text', `Hjelp for ${title}`).and('be.visible');
        });
      }
      cy.get('[data-summary-target="newFirstName"]')
        .findByRole('button', { name: 'Hjelpetekst for Oppsummert fornavn' })
        .focus();
      cy.press('Tab');
      cy.get('[data-summary-target="newFirstName"]')
        .findByRole('button', { name: /^Endre/ })
        .should('be.focused');
      cy.get('[data-summary-target="newFirstName"]').should('contain.text', 'Ada');
      if (isCompact) {
        cy.get('[data-summary-target="newFirstName"]').should(($summary) => {
          const label = $summary.find('.ds-label')[0].getBoundingClientRect();
          const value = $summary
            .find('span')
            .filter((_, element) => element.textContent === 'Ada')
            .last()[0]
            .getBoundingClientRect();
          expect(value.top, 'compact values stay beside their label').to.be.closeTo(label.top, 2);
        });
      }
      if (!isCompact) {
        cy.testPdf({
          callback: () => {
            cy.get('[data-summary-target="newFirstName"]', { timeout: 0 })
              .should('contain.text', 'Beskrivelse for Oppsummert fornavn')
              .and('contain.text', 'Ada');
          },
        });
      }
    });
  }
});
