import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { makeUploaderSelectors } from 'test/e2e/pageobjects/app-frontend';

import { isAttachmentUploaded } from 'src/features/attachments';
import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';

const appFrontend = new AppFrontend();

interface IUploadFileArgs {
  item: ReturnType<typeof makeUploaderSelectors>;
  idx: number;
  fileName: string;
  verifyTableRow: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableRow: any;
  secondPage?: boolean;
}

describe('Repeating group attachments', () => {
  // Allows you to toggle reload() tests off. These have the effects of testing mapAttachments() to make sure state is
  // the same even after reloading the instance data, but you can toggle them off to save some time when developing
  // the test.
  const runReloadTests = true;

  const addNewRow = () => {
    cy.get(appFrontend.group.addNewItem).click();
  };

  const gotoSecondPage = () => {
    cy.get(appFrontend.group.mainGroup).find(appFrontend.group.editContainer).find(appFrontend.group.next).click();
  };

  beforeEach(() => {
    cy.goto('group');
    cy.get(appFrontend.nextButton).click();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    addNewRow();
    gotoSecondPage();
  });

  const makeTestFile = (fileName: string) => ({
    fileName,
    mimeType: 'application/pdf',
    lastModified: Date.now(),
    contents: Cypress.Buffer.from('hello world'),
  });

  const verifyTableRowPreview = (
    item: ReturnType<typeof makeUploaderSelectors>,
    fileName: string,
    deletedAttachments: string[] = [],
  ) => {
    if (deletedAttachments.includes(fileName)) {
      cy.get(item.tableRowPreview).should('not.contain.text', fileName);
    } else {
      cy.get(item.tableRowPreview).should('contain.text', fileName);
    }
  };

  const uploadFile = ({ item, idx, fileName, verifyTableRow, tableRow, secondPage = false }: IUploadFileArgs) => {
    cy.get(item.fileUploader).then((fileUploader) => {
      const dropZoneContainer = fileUploader.find(item.dropZoneContainer);
      if (!dropZoneContainer.length) {
        cy.get(item.addMoreBtn).click();
      }
    });
    cy.get(item.dropZoneContainer).should('be.visible');
    cy.get(item.dropZone).selectFile(makeTestFile(fileName), { force: true });
    cy.wait('@upload');

    const attachment = item.attachments(idx);
    if (attachment.tagSelector !== undefined && attachment.tagSave !== undefined) {
      cy.dsSelect(attachment.tagSelector, 'Altinn');
      cy.get(attachment.tagSave).click();
    }

    cy.get(attachment.status).should('contain.text', texts.finishedUploading);
    cy.get(attachment.name).should('contain.text', fileName);

    if (verifyTableRow) {
      cy.waitUntilSaved();
      cy.get(tableRow.editBtn).click();
      verifyTableRowPreview(item, fileName);
      cy.get(tableRow.editBtn).click();
      if (secondPage) {
        gotoSecondPage();
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expectAttachmentsToBe = (expected: any) => {
    cy.log('Waiting until attachments equals', expected);
    return cy.waitUntil(() =>
      cy.window().then((win) => {
        const attachments = win.CypressState?.attachments || {};
        const keys = Object.keys(attachments);
        const actual: { [componentId: string]: string[] } = {};

        for (const componentId of keys) {
          if (!componentId.startsWith('mainUploader') && !componentId.startsWith('subUploader')) {
            continue;
          }

          const attachmentsForComponent = attachments[componentId] || [];
          for (const attachment of attachmentsForComponent) {
            actual[componentId] = actual[componentId] || [];
            actual[componentId].push(attachment.data.filename || '');
          }
        }

        return deepEqual(expected, actual);
      }),
    );
  };

  const expectFormDataToBe = (expected: string[][]) => {
    cy.log('Waiting until formData equals', expected);
    return cy.waitUntil(() =>
      cy.window().then((win) => {
        const formData = win.CypressState?.formData || {};
        const actual: [string, string][] = [];
        const idToNameMapping: { [attachmentId: string]: string } = {};

        for (const attachmentList of Object.values(win.CypressState?.attachments || {})) {
          for (const attachment of attachmentList || []) {
            if (isAttachmentUploaded(attachment)) {
              const id = attachment.data.id;
              idToNameMapping[id] = attachment.data.filename ?? id;
            }
          }
        }

        const expectedPrefix = 'Endringsmelding-grp-9786.OversiktOverEndringene-grp-9788';
        const innerObj = dot.pick(expectedPrefix, formData);
        const innerFlat = dot.dot(innerObj);
        for (const key of Object.keys(innerFlat)) {
          if (key.includes('fileUpload')) {
            const uuid = innerFlat[key];
            if (idToNameMapping[uuid]) {
              actual.push([key.replace(expectedPrefix, ''), idToNameMapping[uuid]]);
            } else if (uuid !== null) {
              actual.push([key.replace(expectedPrefix, ''), uuid]);
            }
          }
        }

        const actualSorted = actual.sort();
        return deepEqual(expected, actualSorted);
      }),
    );
  };

  const interceptFormDataSave = () => {
    cy.intercept('PATCH', getInstanceIdRegExp({ prefix: 'instances', postfix: 'data' })).as('saveInstanceData');
  };

  const waitForFormDataSave = () => {
    cy.wait('@saveInstanceData').its('response.statusCode').should('eq', 200);
  };

  it('Works when uploading attachments to repeating groups, supports deleting attachments and entire rows', () => {
    cy.intercept('POST', '**/instances/**/data?dataType=*').as('upload');

    const filenames = [
      {
        single: 'singleFileInFirstRow.pdf',
        multi: ['multiInFirstRow1.pdf', 'multiInFirstRow2.pdf', 'multiInFirstRow3.pdf'],
        nested: [
          ['nested-row0-sub0-1.pdf', 'nested-row0-sub0-2.pdf', 'nested-row0-sub0-3.pdf'],
          ['nested-row0-sub1-1.pdf', 'nested-row0-sub1-2.pdf', 'nested-row0-sub1-3.pdf'],
        ],
      },
      {
        single: 'singleFileInSecondRow.pdf',
        multi: ['multiInSecondRow1.pdf', 'multiInSecondRow2.pdf', 'multiInSecondRow3.pdf', 'multiInSecondRow4.pdf'],
        nested: [
          ['nested-row1-sub0-1.pdf', 'nested-row1-sub0-2.pdf', 'nested-row1-sub0-3.pdf'],
          ['nested-row1-sub1-1.pdf', 'nested-row1-sub1-2.pdf', 'nested-row1-sub1-3.pdf'],
        ],
      },
    ];

    uploadFile({
      item: appFrontend.group.row(0).uploadSingle,
      idx: 0,
      fileName: filenames[0].single,
      verifyTableRow: true,
      tableRow: appFrontend.group.row(0),
      secondPage: true,
    });
    expectAttachmentsToBe({
      [appFrontend.group.row(0).uploadSingle.stateKey]: [filenames[0].single],
    });

    filenames[0].multi.forEach((fileName, idx) => {
      uploadFile({
        item: appFrontend.group.row(0).uploadMulti,
        idx,
        fileName,
        verifyTableRow: true,
        tableRow: appFrontend.group.row(0),
        secondPage: true,
      });
      if (idx !== filenames[0].multi.length - 1) {
        cy.get(appFrontend.group.row(0).uploadMulti.addMoreBtn).click();
      }
    });

    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    addNewRow();
    gotoSecondPage();

    uploadFile({
      item: appFrontend.group.row(1).uploadSingle,
      idx: 0,
      fileName: filenames[1].single,
      verifyTableRow: true,
      tableRow: appFrontend.group.row(1),
      secondPage: true,
    });
    filenames[1].multi.forEach((fileName, idx) => {
      uploadFile({
        item: appFrontend.group.row(1).uploadMulti,
        idx,
        fileName,
        verifyTableRow: true,
        tableRow: appFrontend.group.row(1),
        secondPage: true,
      });
      if (idx !== filenames[1].multi.length - 1) {
        cy.get(appFrontend.group.row(1).uploadMulti.addMoreBtn).click();
      }
    });
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');

    [0, 1].forEach((row) => {
      cy.get(appFrontend.group.row(row).editBtn).click();
      gotoSecondPage();
      filenames[row].nested.forEach((nestedRow, nestedRowIdx) => {
        if (nestedRowIdx === 0) {
          cy.get(appFrontend.group.row(row).nestedGroup.row(nestedRowIdx).editBtn).click();
        }
        nestedRow.forEach((fileName, idx) => {
          uploadFile({
            item: appFrontend.group.row(row).nestedGroup.row(nestedRowIdx).uploadTagMulti,
            idx,
            fileName,
            verifyTableRow: true,
            tableRow: appFrontend.group.row(row).nestedGroup.row(nestedRowIdx),
          });
        });
        cy.get(appFrontend.group.row(row).nestedGroup.saveBtn).click();
        cy.get(appFrontend.group.row(row).nestedGroup.saveBtn).should('not.exist');
        if (nestedRowIdx === 0) {
          cy.get(appFrontend.group.row(row).nestedGroup.groupContainer)
            .parent()
            .find(appFrontend.group.addNewItemSubGroup)
            .click();
        }
      });
      cy.get(appFrontend.group.saveMainGroup).click();
      cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    });

    expectAttachmentsToBe({
      [appFrontend.group.row(0).uploadSingle.stateKey]: [filenames[0].single],
      [appFrontend.group.row(0).uploadMulti.stateKey]: filenames[0].multi,
      [appFrontend.group.row(1).uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.row(1).uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[0].nested[0],
      [appFrontend.group.row(0).nestedGroup.row(1).uploadTagMulti.stateKey]: filenames[0].nested[1],
      [appFrontend.group.row(1).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.row(1).nestedGroup.row(1).uploadTagMulti.stateKey]: filenames[1].nested[1],
    });

    const deletedAttachmentNames: string[] = [];
    const verifyPreview = (firstRowDeleted = false) => {
      let idx = 0;
      if (!firstRowDeleted) {
        verifyTableRowPreview(appFrontend.group.row(idx).uploadSingle, filenames[0].single, deletedAttachmentNames);
        verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[0].multi[0], deletedAttachmentNames);
        verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[0].multi[1], deletedAttachmentNames);
        verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[0].multi[2], deletedAttachmentNames);
        idx++;
      }

      verifyTableRowPreview(appFrontend.group.row(idx).uploadSingle, filenames[1].single, deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[1].multi[0], deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[1].multi[1], deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[1].multi[2], deletedAttachmentNames);
      verifyTableRowPreview(appFrontend.group.row(idx).uploadMulti, filenames[1].multi[3], deletedAttachmentNames);
    };

    verifyPreview();

    cy.get(appFrontend.group.row(0).editBtn).click();
    gotoSecondPage();

    interceptFormDataSave();

    // We haven't filled in anything in the first form inputs, so these labels will be the same. The options will be
    // deduplicated so two rows becomes one option.
    cy.get('#reduxOptions-expressions-radiobuttons').findAllByRole('radio').should('have.length', 1);

    cy.snapshot('attachments-in-group');

    // Now that all attachments described above have been uploaded and verified, start deleting the middle attachment
    // of the first-row multi-uploader to verify that the next attachment is shifted upwards.
    cy.get(appFrontend.group.row(0).uploadMulti.attachments(1).deleteBtn).click();
    deletedAttachmentNames.push(filenames[0].multi[1]);
    waitForFormDataSave();

    // The next attachment filename should now replace the deleted one:
    cy.get(appFrontend.group.row(0).uploadMulti.attachments(1).name).should('contain.text', filenames[0].multi[2]);

    // This verifies that the deleted filename is no longer part of the table header preview:
    cy.get(appFrontend.group.row(0).editBtn).click();
    verifyPreview();

    // Let's also delete one of the nested attachments to verify the same thing happens there.
    cy.get(appFrontend.group.row(0).editBtn).click();
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    cy.get(appFrontend.group.row(1).editBtn).click();
    gotoSecondPage();
    cy.get(appFrontend.group.row(1).nestedGroup.row(1).editBtn).click();
    cy.get(appFrontend.group.row(1).nestedGroup.row(1).uploadTagMulti.attachments(1).editBtn || '').click();

    cy.get(appFrontend.group.row(1).nestedGroup.row(1).uploadTagMulti.attachments(1).deleteBtn).click();
    deletedAttachmentNames.push(filenames[1].nested[1][1]);
    waitForFormDataSave();

    // The next filename should have replaced it:
    cy.get(appFrontend.group.row(1).nestedGroup.row(1).uploadTagMulti.attachments(1).name).should(
      'contain.text',
      filenames[1].nested[1][2],
    );

    cy.get(appFrontend.group.row(1).editBtn).click();
    verifyPreview();
    cy.get(appFrontend.group.row(1).editBtn).click();

    const attachmentState = {
      [appFrontend.group.row(0).uploadSingle.stateKey]: [filenames[0].single],
      [appFrontend.group.row(0).uploadMulti.stateKey]: [filenames[0].multi[0], filenames[0].multi[2]],
      [appFrontend.group.row(1).uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.row(1).uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[0].nested[0],
      [appFrontend.group.row(0).nestedGroup.row(1).uploadTagMulti.stateKey]: filenames[0].nested[1],
      [appFrontend.group.row(1).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.row(1).nestedGroup.row(1).uploadTagMulti.stateKey]: [
        filenames[1].nested[1][0],
        filenames[1].nested[1][2],
      ],
    };

    const formData = [
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

    expectAttachmentsToBe(attachmentState);
    expectFormDataToBe(formData);

    if (runReloadTests) {
      // Reload tha page at this point to verify that attachments are mapped correctly from formData back to the
      // correct attachment state.
      cy.reload();
      cy.get(appFrontend.group.showGroupToContinue).should('be.visible');

      expectFormDataToBe(formData);
      expectAttachmentsToBe(attachmentState);
    } else {
      cy.get(appFrontend.group.saveMainGroup).click();
      cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    }

    // Delete the first row of the nested repeating group. This should make the second row in that nested group shift
    // the attachments upwards.
    cy.get(appFrontend.group.row(0).editBtn).click();
    gotoSecondPage();
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).deleteBtn).click();

    waitForFormDataSave();

    const attachmentStateAfterDeletingFirstNestedRow = {
      [appFrontend.group.row(0).uploadSingle.stateKey]: [filenames[0].single],
      [appFrontend.group.row(0).uploadMulti.stateKey]: [filenames[0].multi[0], filenames[0].multi[2]],
      [appFrontend.group.row(1).uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.row(1).uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[0].nested[1],
      [appFrontend.group.row(1).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.row(1).nestedGroup.row(1).uploadTagMulti.stateKey]: [
        filenames[1].nested[1][0],
        filenames[1].nested[1][2],
      ],
    };

    const formDataAfterDeletingFirstNestedRow = [
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
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.tableRowPreview).should(
      'contain.text',
      filenames[0].nested[1][2],
    );
    cy.get(appFrontend.group.row(0).nestedGroup.row(0).editBtn).click();

    expectFormDataToBe(formDataAfterDeletingFirstNestedRow);
    expectAttachmentsToBe(attachmentStateAfterDeletingFirstNestedRow);

    // Delete the entire first row. This should cascade down and delete all attachments inside that row, and inside
    // nested rows.
    cy.get(appFrontend.group.saveMainGroup).click();
    cy.get(appFrontend.group.saveMainGroup).should('not.exist');
    cy.get(appFrontend.group.row(0).deleteBtn).click();
    cy.waitUntilNodesReady();

    verifyPreview(true);
    waitForFormDataSave();

    const attachmentStateAfterDeletingFirstRow = {
      [appFrontend.group.row(0).uploadSingle.stateKey]: [filenames[1].single],
      [appFrontend.group.row(0).uploadMulti.stateKey]: filenames[1].multi,
      [appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.stateKey]: filenames[1].nested[0],
      [appFrontend.group.row(0).nestedGroup.row(1).uploadTagMulti.stateKey]: [
        filenames[1].nested[1][0],
        filenames[1].nested[1][2],
      ],
    };

    const formDataAfterDeletingFirstRow = [
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

    expectAttachmentsToBe(attachmentStateAfterDeletingFirstRow);
    expectFormDataToBe(formDataAfterDeletingFirstRow);

    if (runReloadTests) {
      // Reload the page again to verify that form data still maps attachments correctly after deleting the first row
      cy.reload();
      verifyPreview(true);

      expectAttachmentsToBe(attachmentStateAfterDeletingFirstRow);
      expectFormDataToBe(formDataAfterDeletingFirstRow);
    }
  });
});
