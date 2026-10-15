import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Summary keyboard focus', () => {
  for (const type of ['Summary', 'Summary2'] as const) {
    it(`keeps the ${type} value and Edit button visible when tabbing near the viewport edge`, () => {
      cy.interceptLayout('Task_2', undefined, (layouts) => {
        layouts.summary!.data.layout = [
          { id: 'nav-summary', type: 'NavigationBar' },
          ...['newFirstName', 'newMiddleName'].map((id, index) =>
            type === 'Summary'
              ? { id: `focus-${index === 0 ? 'first' : 'second'}`, type, componentRef: id }
              : { id: `focus-${index === 0 ? 'first' : 'second'}`, type, target: { type: 'component' as const, id } },
          ),
          {
            id: 'more-content',
            type: 'Paragraph',
            textResourceBindings: { title: 'More content below the summaries. '.repeat(100) },
          },
        ];
      });
      cy.goto('changename');
      cy.get(appFrontend.changeOfName.newFirstName).type('Anne');
      cy.get(appFrontend.changeOfName.newMiddleName).type('Marie');
      cy.viewport(768, 500);
      cy.gotoNavPage('summary');
      const first = type === 'Summary' ? '[data-testid="summary-focus-first"]' : '[data-summary-target="newFirstName"]';
      const second =
        type === 'Summary' ? '[data-testid="summary-focus-second"]' : '[data-summary-target="newMiddleName"]';
      cy.get(first).find('button').focus();
      cy.get(second)
        .find('button')
        .then(($button) => {
          cy.window().then((win) => {
            win.scrollTo(0, win.scrollY + $button[0].getBoundingClientRect().bottom - win.innerHeight + 2);
          });
        });
      cy.press('Tab');
      cy.get(second).find('button').should('be.focused');
      cy.get(second).should(($summary) => {
        const rect = $summary[0].getBoundingClientRect();
        const win = $summary[0].ownerDocument.defaultView!;
        expect(rect.top).to.be.at.least(0);
        expect(rect.bottom, 'the value remains in the viewport').to.be.at.most(win.innerHeight);
        expect(rect.right, 'the Edit button stays inside the viewport').to.be.at.most(win.innerWidth);
      });
    });
  }
});
