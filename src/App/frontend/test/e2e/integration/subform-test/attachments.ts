import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Attachments', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.subformTest, { authenticationLevel: '1' });
  });

  const mkFile = (fileName: string) => ({
    fileName,
    mimeType: 'image/png',
    lastModified: Date.now(),
    contents: Cypress.Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQAAAAA3bvkkAAAACklEQVR4AWNgAAAAAgABc3UBGAAAAABJRU5ErkJggg==',
      'base64',
    ),
  });

  const anyUuid = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/.source;

  it('should be possible to hook into attachment uploads on the backend and update the data model', () => {
    // This should use the new API where the URL ends with `/data/<data-type>`, not the old API which
    // ends with `/data?dataType=<data-type>`.
    cy.intercept('POST', '**/instances/**/data/attachments*').as('upload');

    function assertAttachments(...names: string[]) {
      cy.get('#form-content-debug-attachmentNames-backend').should('have.text', names.join(', '));
      if (names.length === 0) {
        cy.get('#form-content-debug-attachmentIds-frontend').should('have.text', '');
      } else {
        cy.get('#form-content-debug-attachmentIds-frontend')
          .invoke('text')
          .should(
            'match',
            names.length === 1
              ? new RegExp(`^${anyUuid}$`)
              : new RegExp(`^(${anyUuid}, ){${names.length - 1}}${anyUuid}$`),
          );
      }
    }

    cy.get('#Input-Name').type('debug'); // This will trigger the debug components to show up:
    cy.get('#Input-Age').type('55');
    cy.get('[data-componentid="debug-attachmentIds-frontend"]').should('be.visible');
    cy.get('[data-componentid="debug-attachmentNames-backend"]').should('be.visible');
    assertAttachments();

    // Upload 5 files in quick succession
    cy.get('#altinn-drop-zone-attachments input[type=file]').selectFile(
      [mkFile('test1.png'), mkFile('test2.png'), mkFile('test3.png'), mkFile('test4.png'), mkFile('test5.png')],
      { force: true },
    );

    cy.get('@upload.all').should('have.length', 5);
    assertAttachments('test1.png', 'test2.png', 'test3.png', 'test4.png', 'test5.png');

    cy.get('[data-validation="Input-Name"]').should('have.text', 'You cannot have exactly 5 attachments');

    cy.get('#file-upload-table tr').eq(1).findByRole('button', { name: 'Slett vedlegg' }).click();
    assertAttachments('test2.png', 'test3.png', 'test4.png', 'test5.png');
    cy.get('[data-validation="Input-Name"]').should('not.exist');

    // The backend can also remove attachments (by giving it a command via the name field)
    cy.get('#Input-Name').type(',delete,test2.png');
    assertAttachments('test3.png', 'test4.png', 'test5.png');

    cy.get('#Input-Name').type(',delete,test3.png');
    assertAttachments('test4.png', 'test5.png');

    cy.get('#Input-Name').type(',delete,test4.png');
    assertAttachments('test5.png');

    cy.get('#Input-Name').type(',delete,test5.png');
    assertAttachments();

    cy.get('#altinn-drop-zone-attachments input[type=file]').selectFile(
      [mkFile('whatever.png'), mkFile('idontcare.png')],
      { force: true },
    );

    cy.get('#altinn-fileuploader-attachments')
      .findByRole('alert')
      .should('contain.text', 'Filen idontcare.png kunne ikke lastes opp')
      .and('contain.text', 'You cannot upload a file named idontcare.png');

    assertAttachments('whatever.png');

    // To test the last validation, since it's not bound to the attachment component (yet), we have to fill out the form
    // and assert that the validation message shows up when we try to submit the instance.
    cy.get('#subform-subform-mopeder-add-button').click();
    cy.get('#moped-regno').type('AB1234');
    cy.get('#moped-merke').type('Harley-Davidson');
    cy.get('#moped-modell').type('Sportster');
    cy.get('#moped-produksjonsaar').type('2021');
    cy.get('#custom-button-subform-moped-exitButton').clickAndGone();

    cy.findByRole('button', { name: 'Neste' }).click();
    cy.findByRole('button', { name: 'Send inn' }).click();
    cy.get(appFrontend.errorReport).should('be.visible');
    cy.get(appFrontend.errorReport).should('contain.text', 'You cannot upload a file named whatever.png');

    cy.get('#custom-button-hovedskjema-backButton').click();
    cy.get('#Input-Name').type(',delete,whatever.png');
    assertAttachments();

    cy.findByRole('button', { name: 'Neste' }).click();
    cy.findByRole('button', { name: 'Send inn' }).click();

    cy.get('#ReceiptContainer').should('contain.text', 'Skjemaet er sendt inn');
  });
});
