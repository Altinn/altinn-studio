import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import {
  uploadFileAndVerify,
  uploadFileWithTagAndVerify,
} from 'test/e2e/support/apps/component-library/uploadFileAndVerify';

import { FileScanResults } from 'src/features/attachments/types';

const appFrontend = new AppFrontend();

describe('FileUpload with and without tags, AttachmentList test', () => {
  it('shows an infected file inline before revealing the error report on blocked navigation', () => {
    let uploadedDataElementId: string | undefined;
    let scanPolls = 0;

    cy.interceptLayout('Task_1', (component) => {
      if (component.type === 'NavigationButtons') {
        component.validateOnNext = { page: 'current', show: ['All'] };
      }
      if (component.type === 'NavigationBar') {
        component.validateOnBackward = { page: 'current', show: ['All'] };
        component.validateOnForward = { page: 'current', show: ['All'] };
      }
    });

    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });

    // Mock the response to indicate we're scanning the file
    cy.intercept('POST', '**/instances/**/data/FileUpload*?*', (req) => {
      req.continue((res) => {
        uploadedDataElementId = res.body.newDataElementId;
        const uploadedFile = res.body.instance.data.find(
          (dataElement: { id: string }) => dataElement.id === uploadedDataElementId,
        );
        uploadedFile.fileScanResult = FileScanResults.Pending;
      });
    }).as('infectedFileUpload');

    cy.intercept('GET', '**/instances/**/enriched', (req) => {
      req.alias = uploadedDataElementId ? 'fileScanPoll' : 'instanceData';
      req.continue((res) => {
        if (uploadedDataElementId) {
          const uploadedFile = res.body.data.find(
            (dataElement: { id: string }) => dataElement.id === uploadedDataElementId,
          );
          if (!uploadedFile) {
            return;
          }

          // Mark the file as infected after a few polls
          scanPolls += 1;
          uploadedFile.fileScanResult = scanPolls >= 2 ? FileScanResults.Infected : FileScanResults.Pending;
        }
      });
    });

    uploadFileAndVerify('infected.pdf');
    cy.wait('@infectedFileUpload');
    cy.wait('@fileScanPoll', { timeout: 20000 });
    cy.wait('@fileScanPoll', { timeout: 20000 });

    cy.get('#FileUpload-N6frPq-validations').should('contain.text', 'Fjern infiserte filer før du fortsetter');

    // Even though there is an error, the errorReport should not be visible yet since we haven't tried to navigate
    cy.get(appFrontend.errorReport).should('not.exist');

    cy.navPage('Vedleggsliste').click();
    cy.navPage('Filopplasting').should('have.attr', 'aria-current', 'page');
    cy.get(appFrontend.errorReport).should('be.visible').and('have.focus');
    cy.get(appFrontend.errorReport).should('contain.text', 'Fjern infiserte filer før du fortsetter');
    cy.get('#FileUpload-N6frPq-validations').should('contain.text', 'Fjern infiserte filer før du fortsetter');
  });

  it('Shows summary of uploaded files correctly', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });

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
