import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IBackendFeaturesState } from 'src/features/applicationMetadata';

const appFrontend = new AppFrontend();

describe('Double signing', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
    cy.intercept('POST', `**/instances?instanceOwnerPartyId*`).as('createInstance');
    cy.intercept('GET', '**/applicationmetadata', (req) => {
      req.on('response', (res) => {
        res.body.features = {
          processActions: true,
        } as IBackendFeaturesState;
      });
    });
    cy.interceptPermissions();
  });

  it('accountant -> manager -> auditor', () => {
    cy.setPermissions('rw');
    cy.startAppInstance(appFrontend.apps.signingTest, 'accountant');
    cy.assertUser('accountant');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.setPermissions('r');
    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.noAccessPanel).should('exist').and('be.visible');

    cy.setPermissions('rsj');
    cy.switchUser('manager');
    cy.assertUser('manager');

    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');

    cy.setPermissions('r');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    cy.setPermissions('rsj');
    cy.switchUser('auditor');
    cy.assertUser('auditor');

    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });

  it('manager -> manager -> auditor', () => {
    cy.setPermissions('rw');
    cy.startAppInstance(appFrontend.apps.signingTest, 'manager');
    cy.assertUser('manager');

    cy.get(appFrontend.signingTest.incomeField).type('4567');

    cy.setPermissions('rsj');
    cy.get(appFrontend.signingTest.submitButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');

    cy.setPermissions('r');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.signingTest.sentToAuditor).should('exist').and('be.visible');

    cy.setPermissions('rsj');
    cy.switchUser('auditor');
    cy.assertUser('auditor');

    cy.get(appFrontend.signingTest.auditorConfirmPanel).should('exist').and('be.visible');
    cy.get(appFrontend.signingTest.incomeField).should('contain.value', '4 567 000 NOK');
    cy.get(appFrontend.signingTest.signingButton).should('not.be.disabled').click();
    cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  });
});
