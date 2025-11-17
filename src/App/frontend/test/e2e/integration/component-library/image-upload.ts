import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { makeTestFile, uploadImageAndVerify } from 'test/e2e/support/apps/component-library/uploadImageAndVerify';

const appFrontend = new AppFrontend();

const fileName1 = 'uploadThis1.png';

describe('ImageUpload component', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary);
  });

  it('is able to upload image correctly', () => {
    cy.gotoNavPage('Bildeopplasting');
    uploadImageAndVerify(fileName1);
  });

  it('is able to cancel the cropping process', () => {
    cy.gotoNavPage('Bildeopplasting');
    uploadImageAndVerify(fileName1);

    cy.findByRole('button', { name: /Avbryt/i }).click();
    cy.get('canvas').should('not.exist');
    cy.get('[data-componentId="ImageUploadPage-ImageUpload"]').should('be.visible');
  });

  it('is able to upload, crop and save', () => {
    cy.gotoNavPage('Bildeopplasting');
    uploadImageAndVerify(fileName1);

    cy.findByRole('button', { name: /Lagre/i }).click();
    cy.get('canvas').should('not.exist');
    cy.findByRole('img', { name: /uploadThis1.png/ }).should('be.visible');
  });

  it('is able to delete a saved image', () => {
    cy.gotoNavPage('Bildeopplasting');

    uploadImageAndVerify(fileName1);

    cy.findByRole('button', { name: /Lagre/i }).click();
    cy.get('canvas').should('not.exist');
    cy.get('img').should('be.visible');
    cy.findByRole('button', { name: /Slett bildet/i }).click();
    cy.findByRole('img', { name: /uploadThis1.jpg/ }).should('not.exist');
    cy.get('canvas').should('not.exist');
    cy.get('[data-componentId="ImageUploadPage-ImageUpload"]').should('be.visible');
  });

  it('is able to replace an uploaded image before saving', () => {
    cy.gotoNavPage('Bildeopplasting');
    uploadImageAndVerify(fileName1);
    const fileName2 = 'uploadThis2.png';
    const newImageUrl = 'test/e2e/fixtures/test-cat.jpg';
    cy.get('canvas').then(($canvas) => {
      const ctx = $canvas[0].getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      const originalPixels = ctx.getImageData(0, 0, $canvas[0].width, $canvas[0].height).data;

      cy.get('input[type="file"]').selectFile(makeTestFile(fileName2, newImageUrl), { force: true });
      cy.get('canvas').should(($newCanvas) => {
        const ctx2 = $newCanvas[0].getContext('2d');
        if (!ctx2) {
          throw new Error('Could not get canvas context');
        }
        const newPixels = ctx2.getImageData(0, 0, $newCanvas[0].width, $newCanvas[0].height).data;

        const pixelsChanged = newPixels.some((v, i) => v !== originalPixels[i]);
        expect(pixelsChanged).to.be.true;
      });
    });

    cy.findByRole('button', { name: /Lagre/i }).click();
    cy.findByRole('img', { name: /uploadThis2.png/ }).should('be.visible');
  });
});
