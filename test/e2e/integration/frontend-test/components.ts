import path from 'path';

import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('UI Components', () => {
  it('Image component with help text', () => {
    cy.goto('message');
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

    cy.window().then((win) => {
      setTimeout(() => win.location.reload(), 1000);
    });

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
    cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).dsSelect('Adresse');
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click();
    cy.wait('@saveTags');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploaded).then((table) => {
      cy.wrap(table).should('be.visible');
      cy.wrap(table).find('tbody').find('tr').should('have.length', 1);
      cy.wrap(table).find('tbody > tr > td').eq(2).should('have.text', 'Adresse');
      cy.wrap(table).find('tbody > tr > td').last().find('button').click();
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
    cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).dsSelect('Adresse');
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click();
    cy.wait('@saveTags');

    cy.window().then((win) => {
      setTimeout(() => win.location.reload(), 1000);
    });

    cy.get(appFrontend.changeOfName.downloadAttachment).click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'test.pdf');

    cy.readFile(downloadedFilename, 'binary', { timeout: 10000 }).should((buffer) => expect(buffer.length).equal(299));
  });

  it('should implement delete confirmation for both file upload components and require user confirmation', () => {
    const components = [
      {
        type: 'FileUpload' as const,
        uploader: appFrontend.changeOfName.upload,
        shouldExist: appFrontend.changeOfName.uploadedTable,
      },
      {
        type: 'FileUploadWithTag' as const,
        uploader: appFrontend.changeOfName.uploadWithTag.uploadZone,
        shouldExist: appFrontend.changeOfName.uploadWithTag.editWindow,
      },
    ];
    cy.interceptLayout('changename', (component) => {
      for (const { type } of components) {
        if (component.type === type) {
          component.alertOnDelete = true;
        }
      }
    });
    cy.goto('changename');
    for (const { uploader, shouldExist } of components) {
      cy.get(uploader).selectFile('test/e2e/fixtures/test.pdf', { force: true });
      cy.get(appFrontend.changeOfName.uploadSuccess).should('exist');
      cy.get(appFrontend.changeOfName.deleteAttachment).click();
      cy.get(appFrontend.changeOfName.popOverCancelButton).click();
      cy.get(shouldExist).should('exist');
      cy.get(appFrontend.changeOfName.deleteAttachment).click();
      cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
      cy.get(shouldExist).should('not.exist');
    }
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

    // Mock zip code API, so that we don't rely on external services for our tests
    cy.intercept('GET', 'https://api.bring.com/shippingguide/api/postalCode.json**', (req) => {
      req.reply((res) => {
        res.send({
          body: {
            postalCodeType: 'NORMAL',
            result: 'KARDEMOMME BY', // Intentionally wrong, to test that our mock is used
            valid: true,
          },
        });
      });
    }).as('zipCodeApi');

    cy.get(appFrontend.changeOfName.address.street_name).type('Sesame Street 1A');
    cy.get(appFrontend.changeOfName.address.street_name).blur();
    cy.get(appFrontend.changeOfName.address.zip_code).type('0123');
    cy.get(appFrontend.changeOfName.address.zip_code).blur();
    cy.get(appFrontend.changeOfName.address.post_place).should('have.value', 'KARDEMOMME BY');
    cy.get('@zipCodeApi').its('request.url').should('include', '0123');
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
        (component as any).readOnly = ['equals', ['component', 'newMiddleName'], 'all_readOnly'];
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
    cy.get(appFrontend.changeOfName.confirmChangeName)
      .findByRole('tooltip', { name: 'Dette er en hjelpetekst.' })
      .should('be.visible');

    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');

    cy.get(appFrontend.changeOfName.reasons).findByText('Dette er en beskrivelse.').should('be.visible');
    cy.get(appFrontend.changeOfName.reasons).findByRole('button').click();
    cy.get(appFrontend.changeOfName.reasons)
      .findByRole('tooltip', { name: 'Dette er en hjelpetekst.' })
      .should('be.visible');
  });

  it("alert on change if radioButton or checkBox has 'alertOnChange' set to true", () => {
    cy.interceptLayout('changename', (component) => {
      if (
        (component.type === 'RadioButtons' && component.id === 'reason') ||
        (component.type === 'Checkboxes' && component.id === 'confirmChangeName')
      ) {
        component.alertOnChange = true;
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();

    //CheckBoxes: try to uncheck the checkbox to see if we get an alert
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');

    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();

    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.get(appFrontend.changeOfName.reasons).should('not.exist');

    //RadioButtons: try to change the radiobutton to see if we get an alert
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();

    cy.get(appFrontend.changeOfName.reasons).find('input[type="radio"]:eq(0)').should('be.checked');

    cy.get(appFrontend.changeOfName.reasons).find('input[type="radio"]:eq(1)').click();
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.get(appFrontend.changeOfName.reasons).find('input[type="radio"]:eq(0)').should('be.checked');

    cy.get(appFrontend.changeOfName.reasons).find('input[type="radio"]:eq(1)').click();
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.get(appFrontend.changeOfName.reasons).find('input[type="radio"]:eq(1)').should('be.checked');
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

  it('button group with navigation, printbutton', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();

    cy.get('#form-content-button-group1').within(() => {
      cy.get(appFrontend.printButton).should('be.visible');
      cy.get(appFrontend.nextButton).should('be.visible');
    });

    // Check that the buttons are moved inside the error paper
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.errorReport).within(() => {
      cy.get('#form-content-button-group1').within(() => {
        cy.get(appFrontend.printButton).should('be.visible');
        cy.get(appFrontend.nextButton).should('be.visible');
      });
    });
  });

  [4, 5].forEach((maxLength) => {
    it(`should countdown remaining letters of ${maxLength} and display validation`, () => {
      cy.interceptLayout('changename', (component) => {
        if (component.type === 'Input' && component.id === 'newFirstName') {
          component.maxLength = maxLength;
        }
      });

      cy.goto('changename');
      cy.get('#form-content-newFirstName').contains(`Du har ${maxLength} av ${maxLength} tegn igjen`);
      cy.get(appFrontend.changeOfName.newFirstName).type('Per');
      cy.get('#form-content-newFirstName').contains(`Du har ${maxLength - 3} av ${maxLength} tegn igjen`);
      cy.get(appFrontend.changeOfName.newFirstName).type('r');
      cy.get('#form-content-newFirstName').contains(`Du har ${maxLength - 4} av ${maxLength} tegn igjen`);
      cy.get(appFrontend.changeOfName.newFirstName).type('rrr');
      cy.get('#form-content-newFirstName').contains(`Du har overskredet maks antall tegn med ${7 - maxLength}`);

      // Display data model validation below component if maxLength in layout and datamodel is different
      if (maxLength !== 4) {
        cy.get('#form-content-newFirstName').should('contain', 'Bruk 4 eller færre tegn');
      } else {
        cy.get('#form-content-newFirstName').should('not.contain', 'Bruk 4 eller færre tegn');
      }
      cy.get(appFrontend.errorReport).should('be.visible');
      cy.get(appFrontend.errorReport).should('contain.text', 'Må summeres opp til 100%');
      cy.get(appFrontend.errorReport).should('contain.text', 'Bruk 4 eller færre tegn');
    });
  });

  it('should remember values after refreshing', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.dateOfEffect).should('have.value', '');
    cy.fillOut('changename');
    cy.gotoNavPage('form');

    cy.get(appFrontend.changeOfName.sources).dsSelect('Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).dsSelect('Sophie Salt');
    cy.get(appFrontend.changeOfName.reference2).dsSelect('Dole');
    cy.reloadAndWait();

    cy.get(appFrontend.changeOfName.newFirstName).should('have.value', 'a');
    cy.get(appFrontend.changeOfName.newLastName).should('have.value', 'a');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').should('be.checked');
    cy.get(appFrontend.changeOfName.reasonRelationship).should('have.value', 'test');
    cy.get(appFrontend.changeOfName.dateOfEffect).should('not.have.value', '');
    cy.get('#form-content-fileUpload-changename').find('td').first().should('contain.text', 'test.pdf');

    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Sophie Salt');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Dole');
  });
});
