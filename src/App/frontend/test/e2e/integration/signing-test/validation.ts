import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { signingTestLogin } from 'test/e2e/support/apps/signing-test/signing-login';

const appFrontend = new AppFrontend();

describe('Validation', () => {
  beforeEach(() => {
    cy.intercept('**/active', []).as('noActiveInstances');
  });

  it('Task validations returned from process/next should be visible immediately', () => {
    // Regression test for: waitForValidation() must ensure task validations are processed before
    // returning. The manager's signing step is a natural test case because it has no writable data
    // models and no components that support component-level validation, which are the conditions
    // required to trigger the bug without any mocking of application metadata or layouts.

    // Fill the form as accountant and submit to advance to the signing step
    signingTestLogin('accountant');
    cy.get(appFrontend.signingTest.incomeField).type('4567');
    cy.get(appFrontend.signingTest.submitButton).click();
    cy.get(appFrontend.signingTest.noAccessPanel).should('be.visible');

    // Log in as manager, who lands on the signing step
    signingTestLogin('manager');
    cy.get(appFrontend.signingTest.managerConfirmPanel).should('be.visible');

    // Intercept the signing process/next call to return a task validation error. This bug was specific to a signing
    // task, as it did not happen when you have writable data models and/or components that support validation.
    cy.intercept(
      { method: 'PUT', url: '**/process/next*', times: 1 },
      {
        statusCode: 409,
        body: {
          validationIssues: [
            {
              severity: 1,
              code: 'error',
              description: 'task validation from process next',
              source: 'Whatever',
            },
          ],
        },
      },
    );

    cy.get(appFrontend.signingTest.signingButton).click();

    // Error report should appear immediately, showing the task validation
    cy.get(appFrontend.errorReport).should('contain.text', 'task validation from process next');
  });
});
