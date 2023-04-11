import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';

const appFrontend = new AppFrontend();
const mui = new Common();

describe('UI Components', () => {
  it('Image component with help text', () => {
    cy.gotoAndComplete('message');
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.loadingAnimation).should('be.visible');
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.header).should('contain.text', appFrontend.apps.frontendTest).and('contain.text', texts.ttd);
    cy.get(appFrontend.message.logo).then((image) => {
      cy.wrap(image).find('img').should('have.attr', 'alt', 'Altinn logo');
      cy.wrap(image)
        .parentsUntil(appFrontend.message.logoFormContent)
        .eq(1)
        .should('have.css', 'justify-content', 'center');
      cy.wrap(image).parent().siblings().find(appFrontend.helpText.open).click();
      cy.get(appFrontend.helpText.alert).contains('Altinn logo').type('{esc}');
      cy.get(appFrontend.helpText.alert).should('not.exist');
    });
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

  it('is possible to upload and delete attachments', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadDropZone).should('be.visible');
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadingAnimation).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadSuccess).should('exist');
    cy.get(appFrontend.changeOfName.deleteAttachment).should('have.length', 1);
    cy.get(appFrontend.changeOfName.deleteAttachment).click();
    cy.get(appFrontend.changeOfName.deleteAttachment).should('not.exist');
  });

  it('is possible to upload attachments with tags', () => {
    cy.goto('changename');
    cy.intercept('POST', '**/tags').as('saveTags');
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('not.exist');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', {
      force: true,
    });
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).select('address');
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click();
    cy.wait('@saveTags');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploaded).then((table) => {
      cy.wrap(table).should('be.visible');
      cy.wrap(table).find(mui.tableBody).find('tr').should('have.length', 1);
      cy.wrap(table).find(mui.tableBody).find(mui.tableElement).eq(1).should('have.text', 'Adresse');
      cy.wrap(table).find(mui.tableBody).find(mui.tableElement).last().find('button').click();
    });
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow)
      .find('button:contains("Slett")')

      .click();
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('not.exist');
  });

  it('is possible to navigate between pages using navigation bar', () => {
    cy.goto('changename');
    cy.get(appFrontend.navMenu)

      .find('li > button')

      .and('have.length', 2)
      .then((navButtons) => {
        cy.wrap(navButtons)
          .first()
          .should('have.attr', 'aria-current', 'page')
          .and('have.css', 'background-color', 'rgb(2, 47, 81)');
        cy.wrap(navButtons).last().should('have.css', 'background-color', 'rgba(0, 0, 0, 0)').click();
      });
    cy.get(`${appFrontend.navMenu} li:first-child > button`).should('not.have.attr', 'aria-current', 'page');
    cy.get(appFrontend.navMenu)
      .find('li > button')
      .then((navButtons) => {
        cy.wrap(navButtons).should('be.visible');
        cy.wrap(navButtons)
          .last()
          .should('have.attr', 'aria-current', 'page')
          .and('have.css', 'background-color', 'rgb(2, 47, 81)');
        cy.get(appFrontend.changeOfName.summaryNameChanges).should('be.visible');
      });
    cy.viewport('samsung-s10');
    cy.get(appFrontend.navMenu).should('not.exist');
    cy.get('[data-testid="NavigationBar"]').find('button:contains("form")').should('not.exist');
    cy.get('[data-testid="NavigationBar"]').find('button:contains("summary")').should('be.visible');
    cy.viewport('macbook-16');
    cy.interceptLayout('changename', (component) => {
      if (component.type === 'NavigationBar') {
        component.compact = true;
      }
    });
    cy.reload();
    cy.get(appFrontend.navMenu).should('not.exist');
    cy.get('[data-testid="NavigationBar"]').find('button:contains("form")').should('not.exist');
    cy.get('[data-testid="NavigationBar"]').find('button:contains("summary")').should('be.visible');
  });

  it('address component fetches post place from zip code', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.address.street_name).type('Sesame Street 1A');
    cy.get(appFrontend.changeOfName.address.street_name).blur();
    cy.get(appFrontend.changeOfName.address.zip_code).type('0174');
    cy.get(appFrontend.changeOfName.address.zip_code).blur();
    cy.get(appFrontend.changeOfName.address.post_place).should('have.value', 'OSLO');
  });

  it('radios and checkboxes can be readOnly', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'confirmChangeName' && component.type === 'Checkboxes') {
        component.readOnly = ['equals', ['component', 'newMiddleName'], 'checkbox_readOnly'];
      }
      if (component.id === 'reason' && component.type === 'RadioButtons') {
        component.readOnly = ['equals', ['component', 'newMiddleName'], 'radio_readOnly'];
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');

    cy.get(appFrontend.changeOfName.newMiddleName).type('checkbox_readOnly');
    cy.get(appFrontend.changeOfName.newMiddleName).blur();

    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click(); // No effect

    // Assert the last click had no effect
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');

    cy.get(appFrontend.changeOfName.reasons).findByText('Gårdsbruk').click();

    cy.get(appFrontend.changeOfName.newMiddleName).clear();
    cy.get(appFrontend.changeOfName.newMiddleName).type('radio_readOnly');
    cy.get(appFrontend.changeOfName.newMiddleName).blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('not.exist');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
    cy.get(appFrontend.changeOfName.reasons).findByText('Slektskap').click(); // No effect

    // Assert the last click had no effect
    cy.get('#form-content-reasonFarm3').should('be.visible');
  });
});
