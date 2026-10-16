import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Summary keyboard focus', () => {
  for (const type of ['Summary', 'Summary2'] as const) {
    it(`keeps the ${type} value visible for keyboard focus without disrupting pointer editing`, () => {
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

      cy.get(second).find('button').blur();
      cy.get(second)
        .find('button')
        .then(($button) => {
          const button = $button[0];
          const win = button.ownerDocument.defaultView!;
          win.scrollTo(0, win.scrollY + button.getBoundingClientRect().bottom - win.innerHeight + 2);
        });
      cy.get(second)
        .find('button')
        .then(async ($button) => {
          // Native pointer events catch focus scrolling that moves the button before pointer-up.
          const button = $button[0];
          const win = button.ownerDocument.defaultView!;
          const bounds = button.getBoundingClientRect();
          const frame = window.top!.document.querySelector('iframe.aut-iframe')!.getBoundingClientRect();
          const scale = frame.width / win.innerWidth;
          const params = {
            x: frame.left + (bounds.left + bounds.width / 2) * scale,
            y: frame.top + (bounds.bottom - 2) * scale,
            button: 'left',
            clickCount: 1,
          };
          for (const type of ['mousePressed', 'mouseReleased']) {
            await Cypress.automation('remote:debugger:protocol', {
              command: 'Input.dispatchMouseEvent',
              params: { type, ...params },
            });
            if (type === 'mousePressed') {
              expect(button, 'the pointer focuses the Edit button').to.equal(button.ownerDocument.activeElement);
            }
          }
        });
      cy.get(appFrontend.changeOfName.newMiddleName).should('be.focused');
    });
  }
});
