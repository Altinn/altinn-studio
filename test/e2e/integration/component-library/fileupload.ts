import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const makeTestFile = (fileName: string) => ({
  fileName,
  mimeType: 'application/pdf',
  lastModified: Date.now(),
  contents: Cypress.Buffer.from('hello world'),
});

export const uploadFileAndVerify = (fileName: string) => {
  cy.gotoNavPage('FileUploadPage');
  cy.get('[data-componenttype="FileUpload"]').first().should('be.visible');

  cy.get('[data-componenttype="FileUpload"]')
    .first()
    .find('input[type="file"]')
    .selectFile(makeTestFile(fileName), { force: true });

  cy.get('[data-testid="file-upload-table-summary"]').first().should('be.visible');
  cy.get('[data-testid="file-upload-table-summary"]')
    .first()
    .find('tr')
    .find('td')
    .contains('td', 'uploadThis.pdf')
    .should('exist');
};

export const uploadFileWithTagAndVerify = (fileName: string, fileType: string) => {
  cy.gotoNavPage('FileUploadPage');
  cy.get('[data-componenttype="FileUploadWithTag"]').first().should('be.visible');
  cy.get('[data-componenttype="FileUploadWithTag"]')
    .first()
    .find('input[type="file"]')
    .selectFile(makeTestFile(fileName), { force: true });
  cy.contains('label', 'Filtype').click();
  cy.get('div[role="listbox"]').contains('span', fileType).click();
  cy.get('input[id^="attachment-tag-dropdown-"]').should(($input) => {
    expect($input.val()).to.eq(fileType);
  });
  cy.get('button[id^=attachment-save-tag-button]').click();

  cy.get('[data-testid="tagFile-summary"]').first().should('be.visible');
  cy.get('[data-testid="tagFile-summary"]').first().find('tr').find('td').contains('td', fileName).should('exist');

  cy.get('[data-testid="tagFile-summary"]').first().find('tr').find('td').contains('td', fileType).should('exist');
};

describe('FileUpload summary test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
  });

  it('Shows summary of uploaded files correctly', () => {
    const fileName = 'uploadThis.pdf';
    uploadFileAndVerify(fileName);
  });

  it('Shows summary of uploaded files with tag correctly', () => {
    const fileName = 'uploadThis.pdf';
    const fileType = 'Bil';
    uploadFileWithTagAndVerify(fileName, fileType);
  });
});
