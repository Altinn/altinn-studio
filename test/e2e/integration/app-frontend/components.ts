import path from 'path';

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
    cy.snapshot('components:attachment');
    cy.get(appFrontend.changeOfName.deleteAttachment).click();
    cy.get(appFrontend.changeOfName.deleteAttachment).should('not.exist');
  });

  it('is possible to download attachments that are uploaded', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadDropZone).should('be.visible');
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });

    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadingAnimation).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadSuccess).should('exist');

    const loadScript = '<script> setTimeout(() => location.reload(), 1000); </script>';
    cy.get('body').invoke('append', loadScript);
    cy.get(appFrontend.changeOfName.downloadAttachment).click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'test.pdf');

    cy.readFile(downloadedFilename, 'binary', { timeout: 10000 }).should((buffer) => expect(buffer.length).equal(299));
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
    cy.snapshot('components:attachment-with-tags');
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).find('button:contains("Slett")').click();
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('not.exist');
  });

  it('is possible to download attachments with tags that are uploaded', () => {
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

    const loadScript = '<script> setTimeout(() => location.reload(), 1000); </script>';
    cy.get('body').invoke('append', loadScript);

    cy.get(appFrontend.changeOfName.downloadAttachment).click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'test.pdf');

    cy.readFile(downloadedFilename, 'binary', { timeout: 10000 }).should((buffer) => expect(buffer.length).equal(299));
  });

  it('is possible to navigate between pages using navigation bar', () => {
    cy.goto('changename');
    cy.get(appFrontend.navMenuButtons).should('have.length', 3);
    cy.navPage('form')
      .should('have.attr', 'aria-current', 'page')
      .and('have.css', 'background-color', 'rgb(2, 47, 81)');
    cy.navPage('summary').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
    cy.navPage('summary').click();
    cy.navPage('form').should('not.have.attr', 'aria-current', 'page');
    cy.navPage('summary')
      .should('have.attr', 'aria-current', 'page')
      .and('have.css', 'background-color', 'rgb(2, 47, 81)');
    cy.get(appFrontend.changeOfName.summaryNameChanges).should('be.visible');

    cy.viewport('samsung-s10');
    cy.get(appFrontend.navMenu).should('not.exist');
    cy.get('[data-testid="NavigationBar"]').find('button:contains("form")').should('not.exist');
    cy.get('[data-testid="NavigationBar"]').find('button:contains("summary")').should('be.visible');
    cy.viewport('macbook-16');
    cy.changeLayout((component) => {
      if (component.type === 'NavigationBar') {
        component.compact = true;
      }
    });
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

  it('radios, checkboxes and other components can be readOnly', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'confirmChangeName' && component.type === 'Checkboxes') {
        component.readOnly = [
          'or',
          ['equals', ['component', 'newMiddleName'], 'checkbox_readOnly'],
          ['equals', ['component', 'newMiddleName'], 'all_readOnly'],
        ];
      } else if (component.id === 'reason' && component.type === 'RadioButtons') {
        component.readOnly = [
          'or',
          ['equals', ['component', 'newMiddleName'], 'radio_readOnly'],
          ['equals', ['component', 'newMiddleName'], 'all_readOnly'],
        ];
      } else {
        component.readOnly = ['equals', ['component', 'newMiddleName'], 'all_readOnly'];
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

    // Make all components on the page readOnly, and snapshot the effect
    cy.get(appFrontend.changeOfName.newMiddleName).clear();
    cy.get(appFrontend.changeOfName.newMiddleName).type('all_readOnly');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').should('be.disabled');
    cy.get(appFrontend.changeOfName.reasons).find('input').should('be.disabled');
    cy.snapshot('components:read-only');
  });

  it('description and helptext for options in radio and checkbox groups', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();

    cy.get(appFrontend.changeOfName.confirmChangeName).findByText('Dette er en beskrivelse.').should('be.visible');
    cy.get(appFrontend.changeOfName.confirmChangeName).findByRole('button').click();
    cy.get(appFrontend.changeOfName.confirmChangeName).findByText('Dette er en hjelpetekst.').should('be.visible');

    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');

    cy.get(appFrontend.changeOfName.reasons).findByText('Dette er en beskrivelse.').should('be.visible');
    cy.get(appFrontend.changeOfName.reasons).findByRole('button').click();
    cy.get(appFrontend.changeOfName.reasons).findByText('Dette er en hjelpetekst.').should('be.visible');
  });

  it('should render components as summary', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();

    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();

    cy.get(appFrontend.changeOfName.newMiddleName).type('Larsen');
    cy.get(appFrontend.changeOfName.newMiddleName).blur();

    cy.get(appFrontend.changeOfName.address.street_name).type('Testveien 1');
    cy.get(appFrontend.changeOfName.address.street_name).blur();

    cy.get(appFrontend.changeOfName.componentSummary).contains('Per');
    cy.get(appFrontend.changeOfName.componentSummary).contains('Larsen');
    cy.get(appFrontend.changeOfName.componentSummary).contains('Hansen');
    cy.get(appFrontend.changeOfName.componentSummary).contains('Testveien 1');
  });

  it('button group with navigation, printbutton and go-to-task', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();

    cy.get('#form-content-button-group-1').within(() => {
      cy.get(appFrontend.printButton).should('be.visible');
      cy.get(appFrontend.nextButton).should('be.visible');
      cy.get('button#toNextTask').should('be.visible');
    });

    // Check that the buttons are moved inside the error paper
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport).within(() => {
      cy.get('#form-content-button-group-1').within(() => {
        cy.get(appFrontend.printButton).should('be.visible');
        cy.get(appFrontend.nextButton).should('be.visible');
        cy.get('button#toNextTask').should('be.visible');
      });
    });
  });

  it('should countdown remaining letters', () => {
    cy.goto('changename');
    cy.get('#form-content-newFirstName').contains('Du har 4 tegn igjen');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get('#form-content-newFirstName').contains('Du har 1 tegn igjen');
    cy.get(appFrontend.changeOfName.newFirstName).type('r');
    cy.get('#form-content-newFirstName').contains('Du har 0 tegn igjen');
    cy.get(appFrontend.changeOfName.newFirstName).type('r');
    cy.get('#form-content-newFirstName').contains('Du har overskredet maks antall tegn med 1');
    cy.snapshot('components:text-countdown');
  });
});
