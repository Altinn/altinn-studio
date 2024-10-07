import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import {
  uploadFileAndVerify,
  uploadFileWithTagAndVerify,
} from 'test/e2e/support/apps/component-library/uploadFileAndVerify';

const appFrontend = new AppFrontend();

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
