import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { fillInAddressAndVerify } from 'test/e2e/support/apps/component-library/fillAddressAndVerify';

const appFrontend = new AppFrontend();

describe('Address component', () => {
  it('Should focus the correct element when navigating from an error', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.get('ul#navigation-menu > li').last().click();
    cy.contains('button', 'Send inn').click();
    cy.contains('button', 'Du må fylle ut postnr').click();
    cy.url().should('include', '/Task_1/AddressPage');
    cy.get('input[data-bindingkey="zipCode"]').should('exist').and('have.focus');
  });

  it('Renders the summary2 component with correct text', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    const address = 'Anders Gate 1';
    const co = 'C/O Jonas Støre';
    const zip = '0666';
    const houseNumber = 'U0101';
    fillInAddressAndVerify(address, co, zip, houseNumber);
  });

  it('should pass accessibility tests', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.findByRole('button', { name: /adresse/i }).click();
    cy.testWcag();
  });

  it('should show error messages when validated, required and empty and remove them when filled out', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.findByRole('button', { name: /adresse/i }).should('be.visible');
    cy.changeLayout((component) => {
      if (component.type === 'Address') {
        component.required = true;
      }
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
    });

    cy.gotoNavPage('Adresse');
    cy.findByRole('textbox', { name: /gateadresse/i }).should('be.visible');
    cy.findByText('Du må fylle ut gateadresse').should('not.exist');
    cy.findByText('Du må fylle ut C/O eller annen tilleggsadresse').should('not.exist');
    cy.findByText('Du må fylle ut postnr').should('not.exist');
    cy.findByText('Du må fylle ut bolignummer').should('not.exist');

    cy.findByRole('button', { name: /next/i }).click();

    cy.findAllByText('Du må fylle ut gateadresse').first().should('exist');
    cy.findAllByText('Du må fylle ut C/O eller annen tilleggsadresse').first().should('exist');
    cy.findAllByText('Du må fylle ut postnr').first().should('exist');
    cy.findAllByText('Du må fylle ut bolignummer').first().should('exist');

    cy.visualTesting('Required and validated address with empty fields');

    cy.findByRole('textbox', { name: /gateadresse/i }).type('Anders Gate 1');
    cy.findByRole('textbox', { name: /c\/o/i }).type('C/O Jonas Støre');
    cy.findByRole('textbox', { name: /postnr/i }).type('0666');
    cy.findByRole('textbox', { name: /bolignummer/i }).type('U0101');

    cy.findByText('Du må fylle ut gateadresse').should('not.exist');
    cy.findByText('Du må fylle ut C/O eller annen tilleggsadresse').should('not.exist');
    cy.findByText('Du må fylle ut postnr').should('not.exist');
    cy.findByText('Du må fylle ut bolignummer').should('not.exist');
  });
});
