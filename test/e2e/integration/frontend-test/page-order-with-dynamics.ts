import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Calculate Page Order', () => {
  it('Testing pageOrder with hidden next page via dynamics', () => {
    cy.interceptLayout(
      'group',
      () => {},
      (layoutSet) => {
        layoutSet.hide.data.hidden = ['equals', ['component', 'choose-group-prefills'], 'stor'];
        layoutSet.repeating.data.hidden = ['equals', ['component', 'choose-group-prefills'], 'stor'];
      },
    );
    cy.goto('group');
    cy.get(appFrontend.navMenuButtons).should('have.length', 5);

    cy.get(appFrontend.group.prefill.stor).check();
    cy.get(appFrontend.navMenuCurrent).should('have.text', '1. prefill');

    // Both pages the 'repeating' and 'hide' pages are now hidden
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);

    cy.get(appFrontend.nextButton).clickAndGone();
    cy.get(appFrontend.navMenuCurrent).should('have.text', '2. Kjæledyr');
    cy.get(appFrontend.nextButton).clickAndGone();
    cy.get(appFrontend.navMenuCurrent).should('have.text', '3. summary');
  });
});
