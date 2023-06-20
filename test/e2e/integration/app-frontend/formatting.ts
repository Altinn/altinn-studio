import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { IInputFormatting } from 'src/layout/layout';

const appFrontend = new AppFrontend();

describe('Formatting', () => {
  it('Number formatting', () => {
    cy.goto('changename');
    cy.get('#form-content-newFirstName').siblings().should('have.class', 'MuiGrid-grid-md-6');
    cy.get('#form-content-newFirstName')
      .siblings()
      .parent()
      .should('have.css', 'border-bottom', '1px dashed rgb(148, 148, 148)');
    cy.get(appFrontend.changeOfName.mobilenummer).type('44444444');
    cy.get(appFrontend.changeOfName.mobilenummer).should('have.value', '+47 444 44 444');
    cy.fillOut('changename');
    cy.get(appFrontend.backButton).should('be.visible');
    cy.intercept('**/api/layoutsettings/group').as('getLayoutGroup');
    cy.get(appFrontend.sendinButton).click();
    cy.wait('@getLayoutGroup');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();
    cy.get(appFrontend.group.currentValue).type('1');
    cy.get(appFrontend.group.currentValue).should('have.value', 'NOK 1').and('have.css', 'text-align', 'right');
    cy.get(appFrontend.group.newValue).type('-2');
    cy.get(appFrontend.group.newValue).should('not.contain.value', '-').and('have.css', 'text-align', 'right');
  });

  const changeToLang = (option: 'en' | 'nb') => {
    cy.findByRole('combobox', { name: option === 'en' ? 'Språk' : 'Language' }).click();
    cy.findByRole('option', { name: option === 'en' ? 'Engelsk' : 'Norwegian bokmål' }).click();

    // Verify that the language has changed
    cy.findByRole('combobox', { name: option === 'en' ? 'Language' : 'Språk' }).should('be.visible');
  };

  it('Dynamic number formatting', () => {
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).should('be.visible');
    cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
    cy.get(appFrontend.group.addNewItem).click();

    cy.get(appFrontend.group.currentValue).numberFormatClear();
    cy.get(appFrontend.group.currentValue).type('10000');

    const alternatives: { format: IInputFormatting; expected: any }[] = [
      {
        format: { currency: 'NOK', number: { prefix: 'SEK ' } },
        expected: { nb: 'SEK 10 000', en: 'SEK 10,000' },
      },
      {
        format: { currency: 'NOK', position: 'prefix' },
        expected: { nb: 'kr 10 000', en: 'NOK 10,000' },
      },
      {
        format: { currency: 'NOK', position: 'suffix' },
        expected: { nb: '10 000 kr', en: '10,000 NOK' },
      },
      {
        format: { currency: 'NOK' },
        expected: { nb: 'kr 10 000', en: 'NOK 10,000' },
      },
      {
        format: { unit: 'kilogram', position: 'prefix' },
        expected: { nb: 'kg 10 000', en: 'kg 10,000' },
      },
      {
        format: { unit: 'kilogram' },
        expected: { nb: '10 000 kg', en: '10,000 kg' },
      },
    ];

    for (const { format, expected } of alternatives) {
      cy.changeLayout((component) => {
        if (component.type === 'Input' && component.formatting && component.id === 'currentValue') {
          component.formatting = format;
        }
      });

      for (const lang of ['en', 'nb'] as const) {
        changeToLang(lang);
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces(expected[lang]);
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText(expected[lang]);
        cy.get(appFrontend.group.edit).click();
      }
    }
  });
});
