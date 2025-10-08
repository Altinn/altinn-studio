import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('sortOrder', () => {
  it('should present an options list in the order it is provided when sortOrder is not specified based on values in textResources', () => {
    const expectedOrder = [
      'Adoptivforelders etternavn eller mellomnavn',
      'Annen begrunnelse ',
      'Ektefelles etternavn eller mellomnavn',
      'Gårdsbruk',
      'Jeg tror navnet er nytt i NorgeDette er en hjelpetekst.',
      'Samboers etternavn eller mellomnavn',
      'Slektskap',
      'Ste- eller fosterforeldres etternavn eller mellomnavn',
      'Tidligere etternavn eller mellomnavn',
    ];
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.findByRole('checkbox', { name: /Ja, jeg bekrefter/ }).click();

    cy.findByRole('radiogroup', { name: /Vennligst oppgi b/ }).within(() => {
      cy.findAllByRole('radio').each((element, i) => {
        cy.get(`label[for="${element.attr('id')}"]`).should('have.text', expectedOrder[i]);
      });
    });
  });

  it('should present the provided options list sorted alphabetically in descending order when providing sortOrder "desc" based on the values in text resources', () => {
    const expectedOrder = [
      'Tidligere etternavn eller mellomnavn',
      'Ste- eller fosterforeldres etternavn eller mellomnavn',
      'Slektskap',
      'Samboers etternavn eller mellomnavn',
      'Jeg tror navnet er nytt i NorgeDette er en hjelpetekst.',
      'Gårdsbruk',
      'Ektefelles etternavn eller mellomnavn',
      'Annen begrunnelse ',
      'Adoptivforelders etternavn eller mellomnavn',
    ];

    cy.interceptLayout('changename', (component) => {
      if (component.type === 'RadioButtons' && component.id === 'reason') {
        component.sortOrder = 'desc';
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('automation');
    cy.findByRole('checkbox', { name: /Ja, jeg bekrefter/ }).click();

    cy.findByRole('radiogroup', { name: /Vennligst oppgi b/ }).within(() => {
      cy.findAllByRole('radio').each((element, i) => {
        cy.get(`label[for="${element.attr('id')}"]`).should('have.text', expectedOrder[i]);
      });
    });
  });
});
