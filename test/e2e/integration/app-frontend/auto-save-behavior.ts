import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { Triggers } from 'src/types';

const appFrontend = new AppFrontend();

describe('Auto save behavior', () => {
  it('onChangeFormData: Should save form data when interacting with form element(checkbox) but not on navigation', () => {
    let putFormDataCounter = 0;
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangeFormData' });
    cy.goto('group').then(() => {
      cy.intercept('PUT', '**/data/**', () => {
        putFormDataCounter++;
      }).as('putFormData');
      cy.get(appFrontend.group.prefill.liten).dsCheck();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.get(appFrontend.backButton).clickAndGone();
      // Doing a hard wait to be sure no request is sent to backend
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000).then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });
    });
  });

  it('onChangePage: Should not save form when interacting with form element(checkbox), but should save on navigating between pages', () => {
    let putFormDataCounter = 0;
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });

    cy.goto('group').then(() => {
      cy.intercept('PUT', '**/data/**', () => {
        putFormDataCounter++;
      }).as('putFormData');
      cy.get(appFrontend.group.prefill.liten).dsCheck();
      // Doing a hard wait to be sure no request is sent to backend
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000).then(() => {
        expect(putFormDataCounter).to.be.eq(0);
      });

      // NavigationButtons
      cy.get(appFrontend.nextButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(1);
      });
      cy.get(appFrontend.backButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(2);
      });

      // NavigationBar
      cy.get(appFrontend.navMenu).findByRole('button', { name: '2. repeating' }).click();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(3);
      });

      // Icon previous button
      cy.get(appFrontend.prevButton).clickAndGone();
      cy.wait('@putFormData').then(() => {
        expect(putFormDataCounter).to.be.eq(4);
      });
    });
  });

  it('onChangePage: Should save data when NavigationButton has triggered calculatePageOrder', () => {
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });
    cy.interceptLayout(
      'group',
      (component) => {
        if (component.type === 'NavigationButtons') {
          if (!component.triggers) {
            component.triggers = [Triggers.CalculatePageOrder];
          } else if (!component.triggers?.includes(Triggers.CalculatePageOrder)) {
            component.triggers.push(Triggers.CalculatePageOrder);
          }
        }
      },
      (layoutSet) => {
        layoutSet.hide.data.hidden = ['equals', ['component', 'choose-group-prefills'], 'stor'];
        layoutSet.repeating.data.hidden = ['equals', ['component', 'choose-group-prefills'], 'stor'];
      },
    );

    cy.goto('group');
    cy.intercept('POST', '**/pages/order*').as('getPageOrder');
    cy.intercept('PUT', '**/data/**').as('putFormData');
    cy.get(appFrontend.navMenuButtons).should('have.length', 4);

    cy.get(appFrontend.group.prefill.stor).dsCheck();
    cy.get(appFrontend.nextButton).click();

    // Wait for both endpoints to be called
    cy.wait('@getPageOrder');
    cy.wait('@putFormData');

    // Both pages the 'repeating' and 'hide' pages are now hidden
    cy.get(appFrontend.navMenuCurrent).should('have.text', '2. summary');
    cy.get(appFrontend.navMenuButtons).should('have.length', 2);
  });
});
