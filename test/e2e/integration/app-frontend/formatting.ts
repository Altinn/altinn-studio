import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

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
    cy.gotoAndComplete('changename');
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

  [
    { currency: { valuta: 'NOK' }, number: { prefix: 'SEK ' } },
    { valuta: 'NOK', position: 'prefix' },
    { valuta: 'NOK', position: 'suffix' },
    { valuta: 'NOK' },
    { unitType: 'kilogram', position: 'prefix' },
    { unitType: 'kilogram' },
  ].forEach((dynamicFormatting) => {
    const init = () => {
      cy.goto('group');
      cy.get(appFrontend.nextButton).click();
      cy.get(appFrontend.group.showGroupToContinue).should('be.visible');
      cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
      cy.get(appFrontend.group.addNewItem).click();
    };
    const changeToEnglishLang = () => {
      cy.findByRole('combobox', { name: 'Språk' }).click();
      cy.findByRole('option', { name: 'Engelsk' }).click();
    };
    it('Dynamic number formatting', () => {
      cy.interceptLayout('group', (component) => {
        if (component.type === 'Input' && component.formatting) {
          delete component.formatting.number;
          if (dynamicFormatting.valuta) {
            component.formatting.currency = dynamicFormatting;
          }
          if (dynamicFormatting.unitType) {
            component.formatting.unit = dynamicFormatting;
          }
          // Testing if config in number overrides dynamic formatting
          if (dynamicFormatting.number) {
            component.formatting.currency = dynamicFormatting.currency;
            component.formatting.number = dynamicFormatting.number;
          }
        }
      });
      init();
      cy.get(appFrontend.group.currentValue).type('10000');
      if (dynamicFormatting.valuta && dynamicFormatting.position === 'prefix') {
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('kr 10 000');
        changeToEnglishLang();
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('NOK 10,000');
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText('NOK 10,000');
      }
      if (dynamicFormatting.valuta && dynamicFormatting.position === 'suffix') {
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('10 000 kr');
        changeToEnglishLang();
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('10,000 NOK');
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText('10,000 NOK');
      }
      if (dynamicFormatting.valuta && !dynamicFormatting.position) {
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('kr 10 000');
        changeToEnglishLang();
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('NOK 10,000');
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText('NOK 10,000');
      }
      if (dynamicFormatting.unitType && dynamicFormatting.position === 'prefix') {
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('kg 10 000');
        changeToEnglishLang();
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('kg 10,000');
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText('kg 10,000');
      }
      if (dynamicFormatting.unitType && !dynamicFormatting.position) {
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('10 000 kg');
        changeToEnglishLang();
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('10,000 kg');
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText('10,000 kg');
      }
      if (dynamicFormatting.number) {
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('SEK 10 000');
        changeToEnglishLang();
        cy.get(appFrontend.group.currentValue).assertTextWithoutWhiteSpaces('SEK 10,000');
        cy.get(appFrontend.group.saveMainGroup).click();
        cy.findByText('SEK 10,000');
      }
    });
  });
});
