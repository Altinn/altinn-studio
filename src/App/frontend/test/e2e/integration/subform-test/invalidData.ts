import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

function fillInput(selector: string, value: string) {
  cy.get(selector).clear();
  cy.get(selector).type(value);
  cy.get(selector).blur();
}

describe('Unsaved invalid subform data', () => {
  beforeEach(() => {
    cy.interceptLayout(
      'bok-subform',
      (component) => {
        if (component.id === 'bok-publikasjonsaar' && component.type === 'Input') {
          delete component.formatting;
          component.showValidations = ['All'];
        }
      },
      undefined,
      { times: 10 },
    );
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
    cy.get('#subform-subform-boker-add-button').click();
    fillInput('#bok-page-count', '123');
    cy.waitUntilSaved();
  });

  it('prevents a non-validating close button from discarding invalid numeric input', () => {
    fillInput('#bok-page-count', '323.22');
    cy.get('#custom-button-subform-bok-cancelButton').click();

    cy.get('#bok-page-count').should('have.value', '323.22');
    cy.get(appFrontend.errorReport).should('contain.text', 'Feil format eller verdi');
    cy.get(appFrontend.fieldValidation('bok-page-count')).should('contain.text', 'Feil format eller verdi');

    fillInput('#bok-page-count', '323');
    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').findByRole('button', { name: /endre/i }).click();
    cy.get('#bok-page-count').should('have.value', '323');
  });

  it('reveals unsaveable input without revealing unrelated schema errors on exit', () => {
    cy.changeLayout((component) => {
      if (component.type === 'Input' && ['bok-page-count', 'bok-publikasjonsaar'].includes(component.id)) {
        component.showValidations = [];
      }
    });
    fillInput('#bok-publikasjonsaar', '2024.22');
    fillInput('#bok-page-count', '323.22');
    cy.waitUntilSaved();
    cy.get(appFrontend.fieldValidation('bok-page-count')).should('not.exist');
    cy.get(appFrontend.fieldValidation('bok-publikasjonsaar')).should('not.exist');

    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Feil format eller verdi');
    cy.get(appFrontend.fieldValidation('bok-page-count')).should('contain.text', 'Feil format eller verdi');
    cy.get(appFrontend.fieldValidation('bok-publikasjonsaar')).should('not.exist');
    cy.get(appFrontend.errorReport).should('not.contain.text', 'Publikasjonsår');

    fillInput('#bok-page-count', '323');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').should('be.visible');
  });

  it('supports separate Invalid and Schema visibility in layout configuration', () => {
    cy.changeLayout((component) => {
      if (component.type === 'Input' && component.id === 'bok-page-count') {
        component.showValidations = ['Schema'];
      }
      if (component.type === 'Input' && component.id === 'bok-publikasjonsaar') {
        component.showValidations = ['Invalid'];
      }
    });
    fillInput('#bok-page-count', '323.22');
    fillInput('#bok-publikasjonsaar', '2024.22');
    cy.waitUntilSaved();
    cy.get(appFrontend.fieldValidation('bok-page-count')).should('not.exist');
    cy.get(appFrontend.fieldValidation('bok-publikasjonsaar')).should('not.exist');

    cy.changeLayout((component) => {
      if (component.type === 'Input' && component.id === 'bok-page-count') {
        component.showValidations = ['Invalid'];
      }
      if (component.type === 'Input' && component.id === 'bok-publikasjonsaar') {
        component.showValidations = ['Schema'];
      }
    });
    cy.get(appFrontend.fieldValidation('bok-page-count')).should('contain.text', 'Feil format eller verdi');
    cy.get(appFrontend.fieldValidation('bok-publikasjonsaar')).should('contain.text', 'Feil format eller verdi');
    fillInput('#bok-page-count', '323');
  });

  it('warns before leaving the browser with invalid input after other changes have saved', () => {
    cy.intercept('PATCH', '**/instances/*/*/data*').as('save');
    fillInput('#bok-page-count', '2147483648');
    fillInput('#bok-tittel', 'Lagret tittel');
    cy.wait('@save');
    cy.waitUntilSaved();

    cy.window().should((win) => {
      expect(win.onbeforeunload).to.be.a('function');
    });
    cy.window().then((win) => {
      const event = new win.Event('beforeunload', { cancelable: true });
      win.dispatchEvent(event);
      expect(event.defaultPrevented).to.equal(true);
    });

    fillInput('#bok-page-count', '123');
    cy.waitUntilSaved();
    cy.window().should((win) => {
      expect(win.onbeforeunload).to.equal(null);
    });
  });

  it('checks invalid input on earlier subform pages when closing from the summary', () => {
    cy.changeLayout((component) => {
      if (component.id === 'subform-bok-nextButton' && component.type === 'CustomButton') {
        for (const action of component.actions) {
          delete action.validation;
        }
      }
    });
    fillInput('#bok-page-count', '323.22');
    cy.get('#custom-button-subform-bok-nextButton').click();
    cy.get('#custom-button-subform-bok-exitButton').click();

    cy.url().should('include', '/bok-oppsummering');
    cy.get(appFrontend.errorReport).should('contain.text', 'Feil format eller verdi');

    cy.get('#custom-button-subform-bok-backButton').click();
    cy.get('#bok-page-count').should('have.value', '323.22');
    fillInput('#bok-page-count', '323');
    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').should('be.visible');
  });

  it('allows leaving with a saved value that fails JSON Schema validation', () => {
    fillInput('#bok-publikasjonsaar', '2024.22');
    cy.waitUntilSaved();
    cy.get(appFrontend.fieldValidation('bok-publikasjonsaar')).should('contain.text', 'Feil format eller verdi');
    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').should('be.visible');
    cy.get('#subform-subform-boker-table').findByRole('button', { name: /endre/i }).click();
    cy.get('#bok-publikasjonsaar').should('have.value', '2024.22');
  });
});
