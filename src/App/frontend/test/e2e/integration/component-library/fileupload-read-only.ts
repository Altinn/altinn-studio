import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import {
  makeTestFile,
  uploadFileAndVerify,
  uploadFileWithTagAndVerify,
} from 'test/e2e/support/apps/component-library/uploadFileAndVerify';

const appFrontend = new AppFrontend();
const plainUploader = '[data-componentid="FileUpload-N6frPq"]';
const taggedUploader = '[data-componentid="FileUploadWithTag-UvbEiL"]';
const uploaders = [plainUploader, taggedUploader];
const summaries = ['[data-componentid="FileUploadSummary"]', '[data-componentid="FileUploadSummaryWithTag"]'];

function configureUploaders(displayMode: 'simple' | 'list', readOnly: boolean | 'expression') {
  cy.interceptLayout(
    'Task_1',
    (component) => {
      if (component.type === 'FileUpload') {
        component.displayMode = displayMode;
        component.readOnly =
          readOnly === 'expression' ? ['equals', ['dataModel', 'shortAnswerInput'], 'locked'] : readOnly;
      }
    },
    (layouts) => {
      if (readOnly === 'expression') {
        layouts.FileUploadPage.data.layout.unshift({
          id: 'lock-attachments',
          type: 'Checkboxes',
          dataModelBindings: { simpleBinding: { dataType: 'model', field: 'shortAnswerInput' } },
          textResourceBindings: { title: 'Vedlegg' },
          options: [{ label: 'Lås vedlegg', value: 'locked' }],
        });
      }
    },
    {},
  );
}

function expectReadOnly() {
  for (const uploader of uploaders) {
    cy.get(uploader).should('contain.text', 'Vedleggene kan ikke endres.');
    cy.get(uploader).find('input[type="file"]').should('not.exist');
    cy.get(uploader).findByRole('button', { name: 'Legg til flere vedlegg' }).should('not.exist');
    cy.get(uploader)
      .findAllByRole('button', { name: /Slett vedlegg|Rediger/ })
      .should('not.exist');
    cy.get(uploader).findByRole('combobox').should('not.exist');
    cy.get(uploader).find('button[id^="attachment-save-tag-button"]').should('not.exist');
    cy.get(uploader)
      .findByRole('columnheader', { name: /Slett|Rediger/ })
      .should('not.exist');
  }
  for (const summary of summaries) {
    cy.get(summary).findByRole('button', { name: 'Endre' }).should('not.exist');
    cy.get(summary)
      .findByRole('columnheader', { name: /Slett|Rediger|Endre/ })
      .should('not.exist');
  }
}

function expectDownload(uploader: string, fileName: string) {
  cy.get(uploader)
    .findByRole('link', { name: new RegExp(fileName.replace('.pdf', '')) })
    .should('be.visible')
    .invoke('attr', 'href')
    .then((href) => {
      cy.request(href!).its('body').should('eq', 'hello world');
    });
}

describe('Read-only FileUpload', () => {
  for (const displayMode of ['simple', 'list'] as const) {
    it(`shows empty read-only ${displayMode} uploaders without inviting uploads or summary edits`, () => {
      configureUploaders(displayMode, true);
      cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
      cy.gotoNavPage('Filopplasting');

      expectReadOnly();
      for (const uploader of uploaders) {
        cy.get(uploader).should('contain.text', 'Antall filer 0.');
        cy.get(uploader).findAllByRole('link').should('not.exist');
      }
      for (const summary of summaries) {
        cy.get(summary).should('contain.text', 'Du har ikke lagt inn informasjon her');
      }
    });

    for (const viewport of ['desktop', 'mobile'] as const) {
      it(`keeps ${displayMode} attachments downloadable and prevents mutations when an expression makes them read-only on ${viewport}`, () => {
        configureUploaders(displayMode, 'expression');
        cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
        uploadFileAndVerify('readonly-plain.pdf');
        uploadFileWithTagAndVerify('readonly-tagged.pdf', 'Bil');
        cy.waitUntilSaved();

        if (displayMode === 'simple') {
          for (const uploader of uploaders) {
            cy.get(uploader).findByRole('button', { name: 'Legg til flere vedlegg' }).should('be.visible');
          }
        } else {
          for (const uploader of uploaders) {
            cy.get(uploader).find('input[type="file"]').should('exist');
          }
        }
        cy.get(plainUploader).findByRole('button', { name: 'Slett vedlegg' }).should('be.visible');
        cy.get(taggedUploader).findByRole('button', { name: 'Rediger' }).click();
        cy.get(taggedUploader).findByRole('combobox').should('be.visible');

        let mutationsWhileReadOnly = 0;
        cy.intercept({ method: '+(POST|PUT|DELETE)', url: '**/instances/**/data/**' }, () => {
          mutationsWhileReadOnly++;
        });
        if (viewport === 'mobile') {
          cy.viewport('iphone-x');
        }
        cy.findByRole('checkbox', { name: 'Lås vedlegg' }).check();
        expectReadOnly();
        expectDownload(plainUploader, 'readonly-plain.pdf');
        expectDownload(taggedUploader, 'readonly-tagged.pdf');
        cy.get(taggedUploader).should('contain.text', 'Bil');
        cy.get(summaries[0]).should('contain.text', 'readonly-plain');
        cy.get(summaries[1]).should('contain.text', 'readonly-tagged').and('contain.text', 'Bil');
        cy.waitUntilSaved();
        cy.then(() => expect(mutationsWhileReadOnly).to.equal(0));

        cy.reload();
        cy.findByRole('checkbox', { name: 'Lås vedlegg' }).should('be.checked');
        expectReadOnly();
        expectDownload(plainUploader, 'readonly-plain.pdf');
        expectDownload(taggedUploader, 'readonly-tagged.pdf');
        cy.then(() => expect(mutationsWhileReadOnly).to.equal(0));

        cy.findByRole('checkbox', { name: 'Lås vedlegg' }).uncheck();
        cy.get(plainUploader).findByRole('button', { name: 'Slett vedlegg' }).should('be.visible');
        cy.get(taggedUploader).findByRole('button', { name: 'Rediger' }).click();
        cy.dsSelect(`${taggedUploader} input.ds-input`, 'Moped');
        cy.get(taggedUploader).find('button[id^="attachment-save-tag-button"]').click();
        cy.get(taggedUploader).should('contain.text', 'Moped');
        cy.get(summaries[1]).should('contain.text', 'Moped');

        if (displayMode === 'simple') {
          cy.get(plainUploader).findByRole('button', { name: 'Legg til flere vedlegg' }).click();
        }
        cy.get(plainUploader)
          .find('input[type="file"]')
          .selectFile(makeTestFile('editable-again.pdf'), { force: true });
        cy.get(plainUploader)
          .findByRole('link', { name: /editable-again/ })
          .should('be.visible');
        cy.get(plainUploader)
          .findByRole('row', { name: /readonly-plain/ })
          .findByRole('button', { name: 'Slett vedlegg' })
          .click();
        cy.get(plainUploader)
          .findByRole('link', { name: /readonly-plain/ })
          .should('not.exist');
        cy.get(summaries[0]).should('not.contain.text', 'readonly-plain').and('contain.text', 'editable-again');
        cy.get(taggedUploader).should('contain.text', 'Moped');
      });
    }
  }
});
