import path from 'path';

import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompExternal } from 'src/layout/layout';

const appFrontend = new AppFrontend();

describe('UI Components', () => {
  const newFirstNameNb = /nytt fornavn/i;
  const newMiddleNameNb = /nytt mellomnavn/i;
  const newLastNameNb = /nytt etternavn/i;
  const confirmChangeOfName = /ja, jeg bekrefter at navnet er riktig og slik jeg ønsker det dette er en hjelpetekst\./i;

  it('Image component with help text', () => {
    cy.goto('message');
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
    cy.get(appFrontend.closeButton).should('be.visible');
    cy.get(appFrontend.header).should('contain.text', appFrontend.apps.frontendTest).and('contain.text', texts.ttd);
    cy.get(appFrontend.message.logo).then((image) => {
      cy.wrap(image).find('img').should('have.attr', 'alt', 'Altinn logo');
      cy.wrap(image)
        .parentsUntil(appFrontend.message.logoFormContent)
        .eq(1)
        .should('have.css', 'justify-content', 'center');
    });
    cy.findByRole('button', { name: /Hjelpetekst for Altinn logo/i }).click();
    cy.get(appFrontend.helpText.alert).should('contain.text', 'Altinn logo');
    cy.get(appFrontend.helpText.alert).trigger('keydown', { keyCode: 27 }); // Press ESC key
    cy.get(appFrontend.helpText.alert).should('not.exist');
    cy.get('body').should('have.css', 'background-color', 'rgb(239, 239, 239)');
  });

  it('Text component with helptext containing markdown', () => {
    cy.goto('message');
    cy.findByRole('button', { name: /Hjelpetekst for Appen for test av app frontend/i }).click();
    // check that the markdown is rendered correctly with a list, bold text and a link
    cy.get(appFrontend.helpText.alert).then((alert) => {
      cy.wrap(alert).find('li').should('have.length', 5);
      cy.wrap(alert).find('b').should('have.length', 1);
      cy.wrap(alert).find('a').should('have.length', 1);
    });
    cy.snapshot('helptext');
  });

  it('while file upload is in progress, the animation should be visible', () => {
    cy.intercept({ url: '**/instances/**/data?dataType=fileUpload-changename' }, (req) => {
      req.reply((res) => {
        res.setDelay(500);
      });
    }).as('uploadWithDelay');

    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadDropZone).should('be.visible');
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.uploadedTable)
      .find(appFrontend.changeOfName.uploadingAnimation)
      .should('be.visible');
    cy.wait('@uploadWithDelay');
    cy.get(appFrontend.changeOfName.fileUploadSuccess).should('exist');
    cy.get(appFrontend.changeOfName.uploadedTable)
      .find(appFrontend.changeOfName.uploadingAnimation)
      .should('not.exist');
  });

  it('is possible to upload and delete attachments', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'newFirstName') {
        // TODO(Validation): Once it is possible to treat custom validations as required, this can be removed.
        (component as CompInputExternal).showValidations = [];
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.uploadDropZone).should('be.visible');
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.fileUploadSuccess).should('exist');
    cy.snapshot('components:attachment');
    cy.get(appFrontend.changeOfName.deleteAttachment).click();
    cy.get(appFrontend.changeOfName.deleteAttachment).should('not.exist');
    cy.get('[role=alert]').should('not.exist');
  });

  it('is possible to download attachments that are uploaded', () => {
    cy.goto('changename');
    cy.intercept({ url: '**/instances/**/data?dataType=fileUpload-changename' }, (req) => {
      req.reply((res) => {
        res.setDelay(500);
      });
    }).as('uploadWithDelay');

    cy.get(appFrontend.changeOfName.uploadDropZone).should('be.visible');
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });

    cy.get(appFrontend.changeOfName.uploadedTable).should('be.visible');
    cy.get(appFrontend.changeOfName.fileUploadSuccess).should('exist');

    cy.intercept({ url: '**/instances/**/data/**', method: 'GET' }).as('downloadAttachment');
    cy.get(appFrontend.changeOfName.downloadAttachment).click();
    cy.wait('@downloadAttachment');

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'test.pdf');
    cy.readFile(downloadedFilename, 'binary', { timeout: 10000 }).should((buffer) => expect(buffer?.length).equal(299));
  });

  it('is possible to upload attachments with tags', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'newFirstName') {
        // TODO(Validation): Once it is possible to treat custom validations as required, this can be removed.
        (component as CompInputExternal).showValidations = [];
      }
    });
    cy.goto('changename');
    cy.intercept('POST', '**/tags').as('saveTags');
    cy.intercept('POST', '**/instances/**/data?dataType=*').as('upload');
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('not.exist');
    cy.get(appFrontend.changeOfName.uploadWithTag.uploadZone).selectFile('test/e2e/fixtures/test.pdf', { force: true });
    cy.wait('@upload');
    cy.waitUntilNodesReady();
    cy.get(appFrontend.changeOfName.uploadWithTag.editWindow).should('be.visible');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.uploadWithTag.uploadZone)).should('not.exist');
    cy.dsReady(appFrontend.changeOfName.uploadWithTag.saveTag);
    cy.get(appFrontend.changeOfName.uploadWithTag.saveTag).click();
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.uploadWithTag.uploadZone)).should(
      'contain.text',
      'Du må velge file type',
    );
    cy.dsSelect(appFrontend.changeOfName.uploadWithTag.tagsDropDown, 'Adresse');
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
    cy.get(appFrontend.changeOfName.uploadWithTag.tagsDropDown).should('not.be.disabled');
    cy.dsSelect(appFrontend.changeOfName.uploadWithTag.tagsDropDown, 'Adresse');
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
      cy.get(appFrontend.changeOfName.fileUploadSuccess).should('exist');
      cy.get(appFrontend.changeOfName.deleteAttachment).click();
      cy.get(appFrontend.changeOfName.popOverCancelButton).click();
      cy.get(shouldExist).should('exist');
      cy.get(appFrontend.changeOfName.deleteAttachment).click();
      cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
      cy.get(shouldExist).should('not.exist');
    }
  });
  it('minNumberOfAttachments should validate like required', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.type === 'FileUpload' || component.type === 'FileUploadWithTag') {
        component.minNumberOfAttachments = 1;
      }
    });
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.errorReport).should('not.exist');
    cy.gotoNavPage('grid');
    cy.get(appFrontend.sendinButton).click();
    cy.get(appFrontend.errorReport).should('contain.text', 'For å fortsette må du laste opp 1 vedlegg');
    cy.gotoNavPage('form');
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.upload)).should(
      'contain.text',
      'For å fortsette må du laste opp 1 vedlegg',
    );
    cy.get(appFrontend.fieldValidation(appFrontend.changeOfName.uploadWithTag.uploadZone)).should(
      'contain.text',
      'For å fortsette må du laste opp 1 vedlegg',
    );
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

  it('should not be possible to check a readonly checkbox', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.type === 'Checkboxes') {
        component.readOnly = true;
      }
    });

    cy.goto('changename');
    cy.findByRole('textbox', { name: newFirstNameNb }).type('Per');
    cy.findByRole('textbox', { name: newFirstNameNb }).blur();
    cy.findAllByRole('checkbox').should('have.attr', 'readonly');

    cy.findByRole('checkbox', { name: confirmChangeOfName }).should('not.be.checked');
    cy.findByRole('checkbox', { name: confirmChangeOfName }).check();
    cy.findByRole('checkbox', { name: confirmChangeOfName }).should('not.be.checked');
  });

  it('should not be possible to check a readonly radio button', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.type === 'RadioButtons') {
        component.readOnly = true;
      }
    });

    cy.goto('changename');
    cy.findByRole('textbox', { name: newFirstNameNb }).type('Per');
    cy.findByRole('textbox', { name: newFirstNameNb }).blur();
    cy.findByRole('checkbox', { name: confirmChangeOfName }).check();

    cy.findAllByRole('radio').should('have.attr', 'readonly');
    cy.findByRole('radio', { name: /slektskap/i }).should('be.checked');
    cy.findByRole('radio', { name: /gårdsbruk/i }).check();
    cy.findByRole('radio', { name: /slektskap/i }).should('be.checked');
  });

  it('should be possible to set all elements as readonly and snapshot', () => {
    cy.interceptLayout('changename', (component) => {
      const formTypes: CompExternal['type'][] = [
        'Address',
        'Checkboxes',
        'Datepicker',
        'Dropdown',
        'FileUpload',
        'FileUploadWithTag',
        'Input',
        'RadioButtons',
        'TextArea',
        'MultipleSelect',
      ];
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
      } else if (formTypes.includes(component.type)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).readOnly = ['equals', ['component', 'newMiddleName'], 'all_readOnly'];
      }
    });
    cy.goto('changename');

    cy.findByRole('textbox', { name: newFirstNameNb }).type('Per');
    cy.findByRole('checkbox', { name: confirmChangeOfName }).check();

    // Make all components on the page readOnly, and snapshot the effect
    cy.findByRole('textbox', { name: newMiddleNameNb }).clear();
    cy.findByRole('textbox', { name: newMiddleNameNb }).type('all_readOnly');
    cy.findByRole('checkbox', {
      name: /ja, jeg bekrefter at navnet er riktig og slik jeg ønsker det dette er en hjelpetekst\./i,
    }).should('have.attr', 'readonly');
    cy.get(appFrontend.changeOfName.reasons).find('input').should('have.attr', 'readonly');
    cy.snapshot('components:read-only');
  });

  it('description and helptext for options in radio and checkbox groups', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.findByRole('tab', { name: newLastNameNb }).click();

    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();

    cy.get(appFrontend.changeOfName.confirmChangeName).findByText('Dette er en beskrivelse.').should('be.visible');
    cy.get(appFrontend.changeOfName.confirmChangeName).findByRole('button').click();
    cy.get(appFrontend.changeOfName.confirmChangeName)
      .findByRole('dialog')
      .should('contain.text', 'Dette er en hjelpetekst.');

    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');

    cy.get(appFrontend.changeOfName.reasons).findByText('Dette er en beskrivelse.').should('be.visible');
    cy.get(appFrontend.changeOfName.reasons).findByRole('button').click();
    cy.get(appFrontend.changeOfName.reasons).findByRole('dialog').should('contain.text', 'Dette er en hjelpetekst.');
  });

  it('should display alert on changing radio button', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'reason' && component.type === 'RadioButtons') {
        component.alertOnChange = true;
        component.preselectedOptionIndex = undefined;
      }
    });

    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.findByRole('checkbox', { name: confirmChangeOfName }).check();

    cy.findByRole('radio', { name: /Slektskap/ }).should('not.be.checked');
    cy.findByRole('radio', { name: /Slektskap/ }).check();
    cy.findByRole('radio', { name: /Slektskap/ }).should('be.checked');

    cy.findByRole('radio', { name: /Gårdsbruk/ }).check();
    //makes sure that textresources from active radiobutton are displayed in the alert dialog
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil endre fra Slektskap?');
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.findByRole('radio', { name: /Slektskap/ }).should('be.checked');

    cy.findByRole('radio', { name: /Gårdsbruk/ }).check();
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.findByRole('radio', { name: /Gårdsbruk/ }).should('be.checked');
  });

  it('should display alert on changing dropdown', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'sources' && component.type === 'Dropdown') {
        component.alertOnChange = true;
      }
    });

    cy.goto('changename');
    cy.waitForLoad();
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');

    cy.get(appFrontend.changeOfName.sources).click();
    cy.findByRole('option', { name: /digitaliseringsdirektoratet/i }).click();
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil endre til Digitaliseringsdirektoratet?');
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Altinn');

    cy.get(appFrontend.changeOfName.sources).click();
    cy.findByRole('option', { name: /digitaliseringsdirektoratet/i }).click();
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil endre til Digitaliseringsdirektoratet?');
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');
  });

  it('should display alert on changing multiple-select', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'colorsCheckboxes' && component.type === 'Checkboxes') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).type = 'MultipleSelect';
        component.alertOnChange = true;
      }
    });

    cy.goto('changename');
    cy.waitForLoad();
    cy.findByRole('checkbox', { name: /label databindings/i }).dsCheck();
    cy.gotoNavPage('label-data-bindings');

    cy.findByRole('combobox', { name: /velg noen farger/i }).click();
    cy.findByRole('option', { name: /blå/i }).click();
    cy.findByRole('option', { name: /blå/i }).should('have.attr', 'aria-selected', 'true');
    cy.findByRole('option', { name: /cyan/i }).click();
    cy.findByRole('option', { name: /cyan/i }).should('have.attr', 'aria-selected', 'true');
    cy.findByRole('option', { name: /grønn/i }).click();
    cy.findByRole('option', { name: /grønn/i }).should('have.attr', 'aria-selected', 'true');
    cy.findByRole('option', { name: /gul/i }).click();
    cy.findByRole('option', { name: /gul/i }).should('have.attr', 'aria-selected', 'true');

    cy.findByRole('button', { name: /slett grønn/i, hidden: true }).click();
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil slette Grønn?');
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.findByRole('button', { name: /slett grønn/i, hidden: true }).should('be.visible');

    cy.findByRole('button', { name: /slett gul/i, hidden: true }).click();
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil slette Gul?');
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.findByRole('button', { name: /slett gul/i, hidden: true }).should('not.exist');

    cy.findByRole('button', { name: /fjern alle valgte/i, hidden: true }).click();
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil slette Blå, Cyan, Grønn?');
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.findByRole('button', { name: /slett blå/i, hidden: true }).should('be.visible');
    cy.findByRole('button', { name: /slett cyan/i, hidden: true }).should('be.visible');
    cy.findByRole('button', { name: /slett grønn/i, hidden: true }).should('be.visible');

    cy.findByRole('button', { name: /fjern alle valgte/i, hidden: true }).click();
    cy.findByRole('dialog').should('contain.text', 'Er du sikker på at du vil slette Blå, Cyan, Grønn?');
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.findByRole('button', { name: /slett blå/i, hidden: true }).should('not.exist');
    cy.findByRole('button', { name: /slett cyan/i, hidden: true }).should('not.exist');
    cy.findByRole('button', { name: /slett grønn/i, hidden: true }).should('not.exist');
  });

  it('should display alert when unchecking checkbox', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'confirmChangeName' && component.type === 'Checkboxes') {
        component.alertOnChange = true;
      }
    });

    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').dblclick();
    cy.get(appFrontend.changeOfName.popOverCancelButton).click();
    cy.get(appFrontend.changeOfName.reasons).should('be.visible');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('label').click();
    cy.get(appFrontend.changeOfName.popOverDeleteButton).click();
    cy.get(appFrontend.changeOfName.reasons).should('not.exist');
  });

  it('should display alert unchecking checkbox in checkbox group', () => {
    cy.interceptLayout('changename', (component) => {
      if (component.id === 'innhentet-studie' && component.type === 'Checkboxes') {
        component.alertOnChange = true;
      }
    });

    cy.goto('changename');
    cy.navPage('grid').click();
    // dialog pops up when unchecking a checkbox
    cy.get('[data-testid="checkboxes-fieldset"]').find('label').contains('Ja').dblclick();
    //Make sure that the alert popover for only one checkbox is displayed, if several dialogs are displayed, the test will fail
    cy.findByRole('dialog');
  });

  it('should render components as summary', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('Per');
    cy.get(appFrontend.changeOfName.newFirstName).blur();

    cy.findByRole('tab', { name: newLastNameNb }).click();

    cy.get(appFrontend.changeOfName.newLastName).type('Hansen');
    cy.get(appFrontend.changeOfName.newLastName).blur();

    cy.findByRole('tab', { name: newMiddleNameNb }).click();

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

    cy.findByRole('tab', { name: newLastNameNb }).click();

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
      cy.get(appFrontend.errorReport).should('contain.text', 'Bruk 4 eller færre tegn');
    });
  });

  it('should remember values after refreshing', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.dateOfEffect).should('have.value', '');
    cy.fillOut('changename');
    cy.gotoNavPage('form');

    cy.dsSelect(appFrontend.changeOfName.sources, 'Digitaliseringsdirektoratet');
    cy.dsSelect(appFrontend.changeOfName.reference, 'Sophie Salt');
    cy.dsSelect(appFrontend.changeOfName.reference2, 'Dole');
    cy.reloadAndWait();

    cy.get(appFrontend.changeOfName.newFirstName).should('have.value', 'a');
    cy.findByRole('tab', { name: newLastNameNb }).click();
    cy.get(appFrontend.changeOfName.newLastName).should('have.value', 'a');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').should('be.checked');
    cy.get(appFrontend.changeOfName.reasonRelationship).should('have.value', 'test');
    cy.get(appFrontend.changeOfName.dateOfEffect).should('not.have.value', '');
    cy.get('#form-content-fileUpload-changename').find('td').first().should('contain.text', 'test.pdf');

    cy.get(appFrontend.changeOfName.sources).should('have.value', 'Digitaliseringsdirektoratet');
    cy.get(appFrontend.changeOfName.reference).should('have.value', 'Sophie Salt');
    cy.get(appFrontend.changeOfName.reference2).should('have.value', 'Dole');
  });

  it('should be possible to change language back and forth and reflect the change in the UI', () => {
    cy.goto('changename');

    const changeLang = (lang: string, elName: string) => {
      cy.findByRole('combobox', { name: elName }).click();
      cy.findByRole('option', { name: lang }).click();
    };

    cy.findByRole('textbox', { name: newFirstNameNb }).should('exist');
    cy.findByRole('textbox', { name: /new first name/i }).should('not.exist');
    changeLang('Engelsk', 'Språk');
    cy.findByRole('textbox', { name: newFirstNameNb }).should('not.exist');
    cy.findByRole('textbox', { name: /new first name/i }).should('exist');
    changeLang('Norwegian bokmål', 'Language');
    cy.findByRole('textbox', { name: newFirstNameNb }).should('exist');
    cy.findByRole('textbox', { name: /new first name/i }).should('not.exist');
  });

  interface Field {
    targets: string[];
    suffix: string;
  }

  interface TestNumber {
    number: string; // The number we type in
    withoutTrailing?: string; // The number as it should appear in the string-formatted field, if different from the number we typed
    withoutLeading?: string; // The number as it should appear in the string-formatted field, if different from the number we typed
    formatted: string; // The number as it should appear in the number-formatted field
    invalidFor: string[]; // Which types the number should be invalid for
  }

  it('number conversion in regular form fields and number-formatted fields', () => {
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newFirstName).type('123');
    cy.get('#choose-extra').findByText('Tall-input').click();
    cy.gotoNavPage('numeric-fields');
    cy.get(appFrontend.errorReport).should('not.exist');

    const fields: { [key: string]: Field } = {
      decimal: { targets: ['#decimalAsNumber', '#decimalAsString'], suffix: ' flis' },
      int32: { targets: ['#int32AsNumber', '#int32AsString'], suffix: ' ganger' },
      int64: { targets: ['#int64AsNumber', '#int64AsString'], suffix: ' ganger' },
      int16: { targets: ['#int16AsNumber', '#int16AsString'], suffix: ' stikk' },
    };

    const testNumbers: TestNumber[] = [
      { number: '123', formatted: '123', invalidFor: [] },
      { number: '123.456', formatted: '123,456', invalidFor: ['int32', 'int16', 'int64'] },
      { number: '0', formatted: '0', invalidFor: [] },
      { number: '-123', formatted: '-123', invalidFor: [] },
      { number: '-123.456', formatted: '-123,456', invalidFor: ['int32', 'int16', 'int64'] },
      { number: '123456', formatted: '123 456', invalidFor: ['int16'] },
      { number: '12345678901', formatted: '12 345 678 901', invalidFor: ['int16', 'int32'] },
      {
        number: '123456789012345678901',
        formatted: '123 456 789 012 345 678 901',
        invalidFor: ['int16', 'int32', 'int64', 'decimal'],
      },
      { number: '123456789012.345', formatted: '123 456 789 012,345', invalidFor: ['int16', 'int32', 'int64'] },
      {
        number: '123.4560',
        withoutTrailing: '123.456',
        formatted: '123,4560',
        invalidFor: ['int32', 'int16', 'int64'],
      },
      {
        number: '123.456000',
        withoutTrailing: '123.456',
        formatted: '123,456000',
        invalidFor: ['int32', 'int16', 'int64'],
      },
      { number: '000123', withoutLeading: '123', formatted: '123', invalidFor: [] },
      { number: '01', withoutLeading: '1', formatted: '1', invalidFor: [] },
      {
        number: '01.23',
        withoutLeading: '1.23',
        formatted: '1,23',
        invalidFor: ['int32', 'int16', 'int64'],
      },
    ];

    // Initialize the fields in the form data by typing 0 into the first field. this should create
    // the object in the data model and initialize the rest of the fields to 0.
    cy.get('#decimalAsNumber').type('0');
    cy.get('#decimalAsNumber').should('have.value', '0 flis');
    cy.get('#decimalAsString').should('have.value', '0');
    cy.get('#int32AsString').should('have.value', '0');
    cy.get('#int32AsNumber').should('have.value', '0 ganger');
    cy.get('#int64AsString').should('have.value', '0');
    cy.get('#int64AsNumber').should('have.value', '0 ganger');
    cy.get('#int16AsString').should('have.value', '0');
    cy.get('#int16AsNumber').should('have.value', '0 stikk');

    for (const { number, withoutTrailing, withoutLeading, formatted, invalidFor } of testNumbers) {
      for (const [type, value] of Object.entries(fields)) {
        const { targets, suffix } = value;
        const [asNumber, asString] = targets;
        const isValid = !invalidFor.includes(type);

        // Type into the number-formatted field
        cy.get(asNumber).type(`{selectall}${number}`);
        cy.get(asNumber).should('have.value', formatted + suffix);

        // Test that the string-formatted field is updated correctly
        if (isValid) {
          cy.get(asString).should('have.value', withoutTrailing ?? withoutLeading ?? number);
          cy.get(`[data-validation="${asNumber.substring(1)}"]`).should('not.exist');
        } else {
          // react-number-format removes leading zeroes for invalid numbers, but keeps trailing zeroes
          cy.get(asString).should('have.value', withoutLeading ?? number);
          cy.get(`[data-validation="${asNumber.substring(1)}"]`).should('contain.text', 'Feil format eller verdi');
        }
      }

      for (const type of invalidFor) {
        // Validation messages are only shown for the first target of each type
        const target = fields[type].targets[0];
        cy.get(`[data-validation="${target.substring(1)}"]`).should('contain.text', 'Feil format eller verdi');
      }
      for (const [type, { targets }] of Object.entries(fields)) {
        if (!invalidFor.includes(type)) {
          cy.get(`[data-validation="${targets[0].substring(1)}"]`).should('not.exist');
        }
      }
    }
  });
});
