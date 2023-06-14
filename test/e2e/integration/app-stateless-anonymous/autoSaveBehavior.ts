import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Auto save behavior', () => {
  it('onChangeFormData: Should save form data when interacting with form element(input)', () => {
    let postFormDataCounter = 0;
    cy.intercept('POST', '**/data/**', () => {
      postFormDataCounter++;
    }).as('putFormData');
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangeFormData' });
    cy.startAppInstance(appFrontend.apps.anonymousStateless, null);

    cy.get(appFrontend.stateless.name).type('Per');
    cy.wait('@putFormData').then(() => {
      expect(postFormDataCounter).to.be.eq(1);
    });
    cy.findByRole('group', { name: 'Velg kjønn' }).within(() => {
      cy.findByRole('radio', { name: 'mann' }).dsCheck();
    });
    cy.wait('@putFormData').then(() => {
      expect(postFormDataCounter).to.be.eq(2);
    });
    cy.findByRole('button', { name: 'next' }).click();
    cy.findByText('Welcome to page 2');
  });
  it('onChangePage: Should not save form when interacting with form element(input), but should save on navigating between pages', () => {
    let postFormDataCounter = 0;
    cy.intercept('POST', '**/data/**', () => {
      postFormDataCounter++;
    }).as('putFormData');
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });
    cy.startAppInstance(appFrontend.apps.anonymousStateless, null);

    cy.get(appFrontend.stateless.name).type('Per');
    // Doing a hard wait to be sure no request is sent to backend
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000).then(() => {
      expect(postFormDataCounter).to.be.eq(0);
    });
    cy.findByRole('group', { name: 'Velg kjønn' }).within(() => {
      cy.findByRole('radio', { name: 'mann' }).dsCheck();
    });
    cy.findByRole('button', { name: 'next' }).click();
    cy.findByText('Welcome to page 2');
    cy.wait('@putFormData').then(() => {
      expect(postFormDataCounter).to.be.eq(1);
    });
  });
});
