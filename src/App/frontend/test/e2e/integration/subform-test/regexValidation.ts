import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { BackendValidationIssue } from 'src/features/validation';

const appFrontend = new AppFrontend();

function fillInput(selector: string, value: string) {
  cy.get(selector).clear();
  cy.get(selector).type(value);
  cy.get(selector).blur();
}

function instanceUrl() {
  return cy.location('pathname').then((pathname) => {
    const instanceId = getInstanceIdRegExp().exec(pathname)?.[1];
    expect(instanceId).to.be.a('string');
    return `/ttd/subform-test/instances/${instanceId}`;
  });
}

describe('Regular expression validation on decimal subform data', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
    fillInput('#Input-Name', 'Per');
    fillInput('#Input-Age', '28');

    cy.get('#subform-subform-mopeder-add-button').click();
    fillInput('#moped-regno', 'ABC123');
    fillInput('#moped-merke', 'Digdir');
    fillInput('#moped-modell', 'Scooter');
    fillInput('#moped-produksjonsaar', '2024');
    cy.get('#custom-button-subform-moped-exitButton').click();

    cy.get('#subform-subform-boker-add-button').click();
    fillInput('#bok-tittel', 'Testbok');
    fillInput('#bok-forfatter', 'Per');
    fillInput('#bok-serie', 'Testserie');
    fillInput('#bok-publikasjonsaar', '2024');
    cy.waitUntilSaved();
  });

  it('saves fractional values and allows non-validating exit, but rejects submission', () => {
    cy.intercept('PATCH', '**/instances/*/*/data*').as('save');
    fillInput('#bok-copy-count', '323.22');
    cy.wait('@save').its('response.statusCode').should('equal', 200);
    cy.waitUntilSaved();
    cy.get(appFrontend.fieldValidation('bok-copy-count')).should('contain.text', 'Feil format eller verdi');
    cy.window().should((win) => expect(win.onbeforeunload).to.equal(null));

    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').should('be.visible');
    cy.get('#subform-subform-boker-table').findByRole('button', { name: /endre/i }).click();
    cy.get('#bok-copy-count').should('have.value', '323,22');

    instanceUrl().then((url) => {
      cy.request(`${url}/enriched`).then(({ body }) => {
        const book = body.data.find((element: { dataType: string }) => element.dataType === 'bok');
        expect(book).to.exist;
        cy.request({ url: `${url}/data/${book.id}`, headers: { Accept: 'application/json' } })
          .its('body.CopyCount')
          .should('equal', 323.22);
      });

      cy.getCookie('XSRF-TOKEN').then((token) => {
        cy.request({
          method: 'PUT',
          url: `${url}/process/next`,
          headers: { 'X-XSRF-TOKEN': token?.value },
          failOnStatusCode: false,
        }).then(({ status, body }) => {
          expect(status).to.equal(409);
          expect(body.validationIssues).to.have.length(1);
          const issue = body.validationIssues[0];
          expect(issue.source).to.equal('DataAnnotations');
          expect(issue.field).to.equal('CopyCount');
          expect(issue.severity).to.equal(1);
          expect(issue.description).to.contain('regular expression');
        });
      });
    });

    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').should('be.visible');
    cy.changeLayout((component) => {
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: [] };
      }
    });
    cy.findByRole('button', { name: /^Neste$/ }).click();
    cy.url().should('include', '/Task_1/oppsummering');
    cy.findByRole('button', { name: /^Send inn$/i }).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'Det er feil i en eller flere bok oppføringer');
    cy.url().should('include', '/Task_1/oppsummering');
  });

  it('accepts a whole number with decimal zeros and permits submission', () => {
    fillInput('#bok-copy-count', '323.00');
    cy.waitUntilSaved();
    cy.get('#bok-copy-count').should('have.value', '323,00');
    cy.get(appFrontend.fieldValidation('bok-copy-count')).should('not.exist');

    instanceUrl().then((url) => {
      // Preserve decimal scale in the request so the backend also validates the zero decimal part.
      cy.request(`${url}/enriched`).then(({ body }) => {
        const book = body.data.find((element: { dataType: string }) => element.dataType === 'bok');
        cy.getCookie('XSRF-TOKEN').then((token) => {
          cy.request({
            method: 'PUT',
            url: `${url}/data/${book.id}`,
            headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token?.value },
            body: '{"Tittel":"Testbok","Forfatter":"Per","Serie":"Testserie","Publikasjonsaar":2024,"CopyCount":323.00}',
          })
            .its('status')
            .should('equal', 201);
        });
      });
      cy.request<BackendValidationIssue[]>(`${url}/validate`).its('body').should('have.length', 0);
    });

    cy.reload();
    cy.get('#bok-copy-count').should('have.value', '323,00');

    cy.get('#custom-button-subform-bok-cancelButton').click();
    cy.get('#subform-subform-boker-table').should('be.visible');
    cy.findByRole('button', { name: /^Neste$/ }).click();
    cy.url().should('include', '/Task_1/oppsummering');
    cy.intercept('PUT', '**/process/next*').as('submit');
    cy.findByRole('button', { name: /^Send inn$/i }).click();
    cy.wait('@submit', { responseTimeout: 60000 }).its('response.statusCode').should('equal', 200);
    cy.url().should('include', '/ProcessEnd');
    cy.get(appFrontend.errorReport).should('not.exist');
  });
});
