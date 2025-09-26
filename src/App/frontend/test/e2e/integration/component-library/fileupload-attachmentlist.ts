import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import {
  uploadFileAndVerify,
  uploadFileWithTagAndVerify,
} from 'test/e2e/support/apps/component-library/uploadFileAndVerify';

const appFrontend = new AppFrontend();

describe('FileUpload, FileUploadWithTags, AttachmentList test', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
  });

  it('Shows summary of uploaded files correctly', () => {
    const fileName1 = 'uploadThis1.pdf';
    uploadFileAndVerify(fileName1);

    const fileName2 = 'uploadThis2.pdf';
    const fileType = 'Bil';
    uploadFileWithTagAndVerify(fileName2, fileType);

    cy.gotoNavPage('Vedleggsliste');

    // These should show all uploaded files
    cy.get('#form-content-AttachmentList-Component-all').should('contain.text', fileName1);
    cy.get('#form-content-AttachmentList-Component-all').should('contain.text', fileName2);
    cy.get('#form-content-AttachmentList-Component-all-nolinks').should('contain.text', fileName1);
    cy.get('#form-content-AttachmentList-Component-all-nolinks').should('contain.text', fileName2);
    cy.get('#form-content-AttachmentList-Component-all').findAllByRole('link').should('have.length', 2);
    cy.get('#form-content-AttachmentList-Component-all-nolinks').findAllByRole('link').should('have.length', 0);

    // These should show only the files with tags
    cy.get('#form-content-AttachmentList-Component-tags').should('not.contain.text', fileName1);
    cy.get('#form-content-AttachmentList-Component-tags').should('contain.text', fileName2);
    cy.get('#form-content-AttachmentList-Component-tags-nolinks').should('not.contain.text', fileName1);
    cy.get('#form-content-AttachmentList-Component-tags-nolinks').should('contain.text', fileName2);
    cy.get('#form-content-AttachmentList-Component-tags').findAllByRole('link').should('have.length', 1);
    cy.get('#form-content-AttachmentList-Component-tags-nolinks').findAllByRole('link').should('have.length', 0);
  });
});
