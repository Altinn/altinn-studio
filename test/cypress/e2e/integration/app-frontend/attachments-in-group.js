/// <reference types='cypress' />
/// <reference types="../../support" />

import AppFrontend from '../../pageobjects/app-frontend';
import * as texts from '../../fixtures/texts.json';
import { instanceIdExp } from '../../support/util';

const appFrontend = new AppFrontend();

describe('Repeating group attachments', () => {
  // Allows you to toggle reload() tests off. These have the effects of testing mapAttachments() to make sure state is
  // the same even after reloading the instance data, but you can toggle them off to save some time when developing
  // the test.
  const runReloadTests = true;

  const addNewRow = () => {
    cy.get(appFrontend.group.addNewItem).should('be.visible').click();
  };

  const gotoSecondPage = () => {
    cy.get(appFrontend.group.mainGroup)
      .siblings(appFrontend.group.editContainer)
      .find(appFrontend.group.next)
      .should('be.visible')
      .click();
  };

  beforeEach(() => {
    cy.navigateToTask3();
    cy.get(appFrontend.group.showGroupToContinue).then((checkbox) => {
      cy.get(checkbox).should('be.visible').find('input').check();
    });
    addNewRow();
    gotoSecondPage();
  });

  const makeTestFile = (fileName) => ({
    fileName,
    mimeType: 'application/pdf',
    lastModified: Date.now(),
    contents: Cypress.Buffer.from('hello world'),
  });

  const verifyTableRowPreview = (item, fileName, deletedAttachments) => {
    if (deletedAttachments && deletedAttachments.includes(fileName)) {
      cy.get(item.tableRowPreview)
        .should('be.visible')
        .should('not.contain.text', fileName);
    } else {
      cy.get(item.tableRowPreview)
        .should('be.visible')
        .should('contain.text', fileName);
    }
  };

  const uploadFile = ({ item, idx, fileName, verifyTableRow, isTaggedUploader }) => {
    cy.get(item.dropZoneContainer).should('be.visible');
    cy.get(item.dropZone).selectFile(makeTestFile(fileName), { force: true });

    if (isTaggedUploader) {
      cy.get(item.attachments[idx].tagSelector).should('be.visible').select('altinn');
      cy.get(item.attachments[idx].tagSave).click();
    }

    cy.get(item.attachments[idx].status)
      .should('be.visible')
      .should('contain.text', texts.finishedUploading);
    cy.get(item.attachments[idx].name).should('be.visible').should('contain.text', fileName);

    if (verifyTableRow) {
      verifyTableRowPreview(item, fileName);
    }
  };

  const getState = (selector) => {
    return cy.getReduxState((fullState) => {
      const keys = Object.keys(fullState.attachments.attachments);
      const out = {};

      for (const key of keys) {
        if (!key.startsWith('mainUploader') && !key.startsWith('subUploader')) {
          continue;
        }

        out[key] = [];
        for (const attachment of fullState.attachments.attachments[key]) {
          out[key].push(attachment.name);
        }
      }

      return selector ? selector(out) : out;
    });
  };

  const simplifyFormData = (s) => {
    // Find all attachment IDs and add them to a mapping, so we can replace them in formData with their file names,
    // since all our file names are unique anyway, and the UUIDs will change every time.
    const idToNameMapping = {};
    for (const attachmentList of Object.values(s.attachments.attachments)) {
      for (const attachment of attachmentList) {
        if (attachment.id && attachment.name) {
          idToNameMapping[attachment.id] = attachment.name;
        }
      }
    }

    const expectedPrefix = 'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788';
    return Object.keys(s.formData.formData)
      .filter((key) => key.startsWith(expectedPrefix) && key.includes('fileUpload'))
      .map((key) => {
        const uuid = s.formData.formData[key];
        if (idToNameMapping[uuid]) {
          return [key.replace(expectedPrefix, ''), idToNameMapping[uuid]];
        }

        return [key.replace(expectedPrefix, ''), uuid];
      })
      .sort();
  };

  const interceptFormDataSave = () => {
    cy.intercept('PUT', instanceIdExp({ prefix: 'instances', postfix: 'data' })).as('saveInstanceData');
  };

  const waitForFormDataSave = () => {
    cy.wait('@saveInstanceData').its('response.statusCode').should('eq', 201);
  };

  it('Works when uploading attachments to repeating groups, supports deleting attachments and entire rows', () => {
    const filenames = [
      {
        single: 'singleFileInFirstRow.pdf',
        multi: [
          'multiInFirstRow1.pdf',
          'multiInFirstRow2.pdf',
          'multiInFirstRow3.pdf',
        ],
        nested: [
          [
            'nested-row0-sub0-1.pdf',
            'nested-row0-sub0-2.pdf',
            'nested-row0-sub0-3.pdf',
          ],
          [
            'nested-row0-sub1-1.pdf',
            'nested-row0-sub1-2.pdf',
            'nested-row0-sub1-3.pdf',
          ]
        ],
      },
      {
        single: 'singleFileInSecondRow.pdf',
        multi: [
          'multiInSecondRow1.pdf',
          'multiInSecondRow2.pdf',
          'multiInSecondRow3.pdf',
          'multiInSecondRow4.pdf',
        ],
        nested: [
          [
            'nested-row1-sub0-1.pdf',
            'nested-row1-sub0-2.pdf',
            'nested-row1-sub0-3.pdf',
          ],
          [
            'nested-row1-sub1-1.pdf',
            'nested-row1-sub1-2.pdf',
            'nested-row1-sub1-3.pdf',
          ]
        ],
      }
    ];

    uploadFile({
      item: appFrontend.group.rows[0].uploadSingle,
      idx: 0,
      fileName: filenames[0].single,
      verifyTableRow: true,
    });
    getState().should('deep.equal', {
      [appFrontend.group.rows[0].uploadSingle.stateKey]: [filenames[0].single],
    });

    filenames[0].multi.forEach((fileName, idx) => {
      uploadFile({ item: appFrontend.group.rows[0].uploadMulti, idx, fileName, verifyTableRow: true });
      if (idx !== filenames[0].multi.length - 1) {
        cy.get(appFrontend.group.rows[0].uploadMulti.addMoreBtn).click();
      }
    });

    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    addNewRow();
    gotoSecondPage();

    uploadFile({
      item: appFrontend.group.rows[1].uploadSingle,
      idx: 0,
      fileName: filenames[1].single,
      verifyTableRow: true,
    });
    filenames[1].multi.forEach((fileName, idx) => {
      uploadFile({
        item: appFrontend.group.rows[1].uploadMulti,
        idx,
        fileName,
        verifyTableRow: true,
      });
      if (idx !== filenames[1].multi.length - 1) {
        cy.get(appFrontend.group.rows[1].uploadMulti.addMoreBtn).click();
      }
    });
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');

    [0, 1].forEach((row) => {
      cy.get(appFrontend.group.rows[row].editBtn).click();
      gotoSecondPage();
      filenames[row].nested.forEach((nestedRow, nestedRowIdx) => {
        nestedRow.forEach((fileName, idx) => {
          uploadFile({
            item: appFrontend.group.rows[row].nestedGroup.rows[nestedRowIdx].uploadTagMulti,
            idx,
            fileName,
            verifyTableRow: true,
            isTaggedUploader: true,
          });
        });
        cy.get(appFrontend.group.rows[row].nestedGroup.saveBtn).click();
        cy.get(appFrontend.group.rows[row].nestedGroup.saveBtn).should('not.exist');
        if (nestedRowIdx === 0) {
          cy.get(appFrontend.group.rows[row].nestedGroup.groupContainer)
            .parent()
            .find(appFrontend.group.addNewItemSubGroup)
            .click();
        }
      });
      cy.get(appFrontend.group.saveMainGroup).click();
      cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    });

    getState().should('deep.equal', {
      [appFrontend.group.rows[0].uploadSingle.stateKey]: [filenames[0].single],
      [appFrontend.group.rows[0].uploadMulti.stateKey]: filenames[0].multi,
      [appFrontend.group.rows[1].uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.rows[1].uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[0].nested[0],
      [appFrontend.group.rows[0].nestedGroup.rows[1].uploadTagMulti.stateKey]: filenames[0].nested[1],
      [appFrontend.group.rows[1].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.rows[1].nestedGroup.rows[1].uploadTagMulti.stateKey]: filenames[1].nested[1],
    });

    const deletedAttachmentNames = [];
    const verifyPreview = (firstRowDeleted) => {
      let idx = 0;
      if (!firstRowDeleted) {
        verifyTableRowPreview(appFrontend.group.rows[idx].uploadSingle, filenames[0].single, deletedAttachmentNames);
        verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[0].multi[0], deletedAttachmentNames);
        verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[0].multi[1], deletedAttachmentNames);
        verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[0].multi[2], deletedAttachmentNames);
        idx++;
      }

      verifyTableRowPreview(appFrontend.group.rows[idx].uploadSingle, filenames[1].single, deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[1].multi[0], deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[1].multi[1], deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[1].multi[2], deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.rows[idx].uploadMulti, filenames[1].multi[3], deletedAttachmentNames);
    };

    verifyPreview();

    cy.get(appFrontend.group.rows[0].editBtn).click();
    gotoSecondPage();

    interceptFormDataSave();

    // Now that all attachments described above have been uploaded and verified, start deleting the middle attachment
    // of the first-row multi-uploader to verify that the next attachment is shifted upwards.
    cy.get(appFrontend.group.rows[0].uploadMulti.attachments[1].deleteBtn).click();
    deletedAttachmentNames.push(filenames[0].multi[1]);
    waitForFormDataSave();

    // The next attachment filename should now replace the deleted one:
    cy.get(appFrontend.group.rows[0].uploadMulti.attachments[1].name)
      .should('be.visible')
      .should('contain.text', filenames[0].multi[2]);

    // This verifies that the deleted filename is no longer part of the table header preview:
    verifyPreview();

    // Let's also delete one of the nested attachments to verify the same thing happens there.
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    cy.get(appFrontend.group.rows[1].editBtn).click();
    gotoSecondPage();
    cy.get(appFrontend.group.rows[1].nestedGroup.rows[1].editBtn).click();
    cy.get(appFrontend.group.rows[1].nestedGroup.rows[1].uploadTagMulti.attachments[1].editBtn).click();

    cy.get(appFrontend.group.rows[1].nestedGroup.rows[1].uploadTagMulti.attachments[1].deleteBtn).click();
    deletedAttachmentNames.push(filenames[1].nested[1][1]);
    waitForFormDataSave();

    // The next filename should have replaced it:
    cy.get(appFrontend.group.rows[1].nestedGroup.rows[1].uploadTagMulti.attachments[1].name)
      .should('be.visible')
      .should('contain.text', filenames[1].nested[1][2]);

    verifyPreview();

    const expectedAttachmentState = {
      [appFrontend.group.rows[0].uploadSingle.stateKey]: [filenames[0].single],
      [appFrontend.group.rows[0].uploadMulti.stateKey]: [
        filenames[0].multi[0],
        filenames[0].multi[2],
      ],
      [appFrontend.group.rows[1].uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.rows[1].uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[0].nested[0],
      [appFrontend.group.rows[0].nestedGroup.rows[1].uploadTagMulti.stateKey]: filenames[0].nested[1],
      [appFrontend.group.rows[1].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.rows[1].nestedGroup.rows[1].uploadTagMulti.stateKey]: [
        filenames[1].nested[1][0],
        filenames[1].nested[1][2],
      ],
    };

    const expectedFormData = [
      ['[0].fileUpload', filenames[0].single],
      ['[0].fileUploadList[0]', filenames[0].multi[0]],
      ['[0].fileUploadList[1]', filenames[0].multi[2]],

      ['[0].nested-grp-1234[0].fileUploadList[0]', filenames[0].nested[0][0]],
      ['[0].nested-grp-1234[0].fileUploadList[1]', filenames[0].nested[0][1]],
      ['[0].nested-grp-1234[0].fileUploadList[2]', filenames[0].nested[0][2]],

      ['[0].nested-grp-1234[1].fileUploadList[0]', filenames[0].nested[1][0]],
      ['[0].nested-grp-1234[1].fileUploadList[1]', filenames[0].nested[1][1]],
      ['[0].nested-grp-1234[1].fileUploadList[2]', filenames[0].nested[1][2]],

      ['[1].fileUpload', filenames[1].single],
      ['[1].fileUploadList[0]', filenames[1].multi[0]],
      ['[1].fileUploadList[1]', filenames[1].multi[1]],
      ['[1].fileUploadList[2]', filenames[1].multi[2]],
      ['[1].fileUploadList[3]', filenames[1].multi[3]],

      ['[1].nested-grp-1234[0].fileUploadList[0]', filenames[1].nested[0][0]],
      ['[1].nested-grp-1234[0].fileUploadList[1]', filenames[1].nested[0][1]],
      ['[1].nested-grp-1234[0].fileUploadList[2]', filenames[1].nested[0][2]],

      ['[1].nested-grp-1234[1].fileUploadList[0]', filenames[1].nested[1][0]],
      ['[1].nested-grp-1234[1].fileUploadList[1]', filenames[1].nested[1][2]],
    ].sort();

    getState().should('deep.equal', expectedAttachmentState);
    cy.getReduxState(simplifyFormData).should('deep.equal', expectedFormData);

    if (runReloadTests) {
      // Reload tha page at this point to verify that attachments are mapped correctly from formData back to the
      // correct attachment state.
      cy.reload();
      cy.get(appFrontend.group.showGroupToContinue).should('be.visible');

      cy.getReduxState(simplifyFormData).should('deep.equal', expectedFormData);
      getState().should('deep.equal', expectedAttachmentState);
    } else {
      cy.get(appFrontend.group.saveMainGroup).click();
      cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    }

    // Delete the first row of the nested repeating group. This should make the second row in that nested group shift
    // the attachments upwards.
    cy.get(appFrontend.group.rows[0].editBtn).click();
    gotoSecondPage();
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].editBtn).click();

    cy.get(appFrontend.group.rows[0].nestedGroup.groupContainer)
      .parent()
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.delete)
      .click();
    waitForFormDataSave();

    const expectedAttachmentStateAfterDeletingFirstNestedRow = {
      [appFrontend.group.rows[0].uploadSingle.stateKey]: [filenames[0].single],
      [appFrontend.group.rows[0].uploadMulti.stateKey]: [
        filenames[0].multi[0],
        filenames[0].multi[2],
      ],
      [appFrontend.group.rows[1].uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.rows[1].uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[0].nested[1],
      [appFrontend.group.rows[1].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.rows[1].nestedGroup.rows[1].uploadTagMulti.stateKey]: [
        filenames[1].nested[1][0],
        filenames[1].nested[1][2],
      ],
    };

    const expectedFormDataAfterDeletingFirstNestedRow = [
      ['[0].fileUpload', filenames[0].single],
      ['[0].fileUploadList[0]', filenames[0].multi[0]],
      ['[0].fileUploadList[1]', filenames[0].multi[2]],

      ['[0].nested-grp-1234[0].fileUploadList[0]', filenames[0].nested[1][0]],
      ['[0].nested-grp-1234[0].fileUploadList[1]', filenames[0].nested[1][1]],
      ['[0].nested-grp-1234[0].fileUploadList[2]', filenames[0].nested[1][2]],

      ['[1].fileUpload', filenames[1].single],
      ['[1].fileUploadList[0]', filenames[1].multi[0]],
      ['[1].fileUploadList[1]', filenames[1].multi[1]],
      ['[1].fileUploadList[2]', filenames[1].multi[2]],
      ['[1].fileUploadList[3]', filenames[1].multi[3]],

      ['[1].nested-grp-1234[0].fileUploadList[0]', filenames[1].nested[0][0]],
      ['[1].nested-grp-1234[0].fileUploadList[1]', filenames[1].nested[0][1]],
      ['[1].nested-grp-1234[0].fileUploadList[2]', filenames[1].nested[0][2]],

      ['[1].nested-grp-1234[1].fileUploadList[0]', filenames[1].nested[1][0]],
      ['[1].nested-grp-1234[1].fileUploadList[1]', filenames[1].nested[1][2]],
    ].sort();

    // Verify that one of the attachments in the next nested row is visible in the table header. This is also a trick
    // to ensure we wait until the deletion is done before we fetch the redux state.
    cy.get(appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.tableRowPreview)
      .should('contain.text', filenames[0].nested[1][2]);

    cy.getReduxState(simplifyFormData).should('deep.equal', expectedFormDataAfterDeletingFirstNestedRow);
    getState().should('deep.equal', expectedAttachmentStateAfterDeletingFirstNestedRow);

    // Delete the entire first row. This should cascade down and delete all attachments inside that row, and inside
    // nested rows.
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    cy.get(appFrontend.group.rows[0].editBtn).click();

    cy.get(appFrontend.group.delete).click();
    verifyPreview(true);
    waitForFormDataSave();

    const expectedAttachmentStateAfterDeletingFirstRow = {
      [appFrontend.group.rows[0].uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.rows[0].uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.rows[0].nestedGroup.rows[0].uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.rows[0].nestedGroup.rows[1].uploadTagMulti.stateKey]: [
        filenames[1].nested[1][0],
        filenames[1].nested[1][2],
      ],
    };

    const expectedFormDataAfterDeletingFirstRow = [
      ['[0].fileUpload', filenames[1].single],
      ['[0].fileUploadList[0]', filenames[1].multi[0]],
      ['[0].fileUploadList[1]', filenames[1].multi[1]],
      ['[0].fileUploadList[2]', filenames[1].multi[2]],
      ['[0].fileUploadList[3]', filenames[1].multi[3]],

      ['[0].nested-grp-1234[0].fileUploadList[0]', filenames[1].nested[0][0]],
      ['[0].nested-grp-1234[0].fileUploadList[1]', filenames[1].nested[0][1]],
      ['[0].nested-grp-1234[0].fileUploadList[2]', filenames[1].nested[0][2]],

      ['[0].nested-grp-1234[1].fileUploadList[0]', filenames[1].nested[1][0]],
      ['[0].nested-grp-1234[1].fileUploadList[1]', filenames[1].nested[1][2]],
    ].sort();

    getState().should('deep.equal', expectedAttachmentStateAfterDeletingFirstRow);
    cy.getReduxState(simplifyFormData).should('deep.equal', expectedFormDataAfterDeletingFirstRow);

    if (runReloadTests) {
      // Reload the page again to verify that form data still maps attachments correctly after deleting the first row
      cy.reload();
      verifyPreview(true);

      getState().should('deep.equal', expectedAttachmentStateAfterDeletingFirstRow);
      cy.getReduxState(simplifyFormData).should('deep.equal', expectedFormDataAfterDeletingFirstRow);
    }
  });
});
