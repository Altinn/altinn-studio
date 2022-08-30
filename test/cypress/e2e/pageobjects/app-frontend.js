export default class AppFrontend {
  constructor() {
    //Start app instance page
    this.userId = '#UserId';
    this.appSelection = '#AppPathSelection';
    this.startButton = '.btn';

    //Common
    this.loadingAnimation = 'rect[role="presentation"]';
    this.header = '.a-modal-header';
    this.closeButton = '.a-modal-close-icon';
    this.backButton = '.a-modal-back';
    this.attachmentIcon = '.reg-attachment';
    this.sendinButton = '#sendInButton';
    this.instantiationButton = '#instantiation-button';
    this.errorReport = '[data-testid="ErrorReport"]';
    this.altinnError = '[data-testid="AltinnError"]';
    this.profileIconButton = '#profile-icon-button';
    this.logOut = '#logout-menu-item';
    this.logOutLink = 'a[href$="/ui/authentication/LogOut"]';

    this.helpText = {
      open: '.reg-help-outline',
      close: '.reg-help-filled',
      alert: 'div[role="alert"]',
    };

    this.navMenu = '#navigation-menu';
    this.startAgain = '#startAgain';

    //Receipt
    this.receipt = {
      container: '#ReceiptContainer',
      linkToArchive: 'a[href$="/ui/messagebox/archive"]',
      pdf: '#attachment-list-pdf',
      uploadedAttachments: '[data-testid=attachment-list]',
    };

    // Confirmation
    this.confirm = {
      container: '#ConfirmContainer',
      body: '#body-text',
      sendIn: '#confirm-button',
      receiptPdf: '#attachment-list-pdf',
      uploadedAttachments: '[data-testid=attachment-list]',
    };

    this.feedback = '#FeedbackContainer';

    //field is a placeholder which has to be replaced with the selector value of the field
    this.fieldValidationError = '[id^="error_field"]';
    this.fieldValidationWarning = '[id^="warning_field"]';
    this.fieldValidationInfo = '[id^="info_field"]';
    this.fieldValidationSuccess = '[id^="success_field"]';

    //selectors for ttd/frontend-test app
    //message - task_1
    this.message = {
      header: '#appen-for-test-av-app-frontend',
      attachmentList: '.attachmentList-title',
      logo: '#altinnLogo',
      logoFormContent: '#form-content-altinnLogo',
    };

    //change of name - task_2
    this.changeOfName = {
      address: {
        street_name: '#address_address_adresse',
        zip_code: '#address_zip_code_adresse',
        post_place: '#address_post_place_adresse',
      },
      currentName: '#currentName',
      newFirstName: '#newFirstName',
      newLastName: '#newLastName',
      newMiddleName: '#newMiddleName',
      newMiddleNameDescription: '#description-newMiddleName',
      oldFullName: '#changeNameFrom',
      newFullName: '#changeNameTo',
      confirmChangeName: '#confirmChangeName',
      reasons: '#reason',
      reference: '#reference',
      reference2: '#reference2',
      dateOfEffect: '#dateOfEffect',
      upload: '#fileUpload-changename',
      uploadWithTag: {
        uploadZone: '#fileUploadWithTags-changename',
        editWindow: '[id^="attachment-edit-window"]',
        tagsDropDown: '[id^="attachment-tag-dropdown"]',
        saveTag: '[id^="attachment-save-tag-button"]',
        delete: 'button[class*="makeStyles-deleteButton"]',
        uploaded: '#tagFile',
      },
      reasonRelationship: '#reasonRelationship',
      summaryNameChanges: '#nameChanges',
      mobilenummer: '#mobilnummer',
      sources: '#sources',
      uploadingAnimation: '#loader-upload',
      deleteAttachment: 'div[id^="attachment-delete"]',
      uploadedTable: '#altinn-file-listfileUpload-changename',
      uploadSuccess: '.ai-check-circle',
      uploadDropZone: '#altinn-drop-zone-fileUpload-changename',
    };

    const makeUploaderSelectors = (id, row, tablePreviewColumn, isTagged) => {
      const tableSelector = isTagged
        ? `#form-content-${id}-${row} div[data-testid=tagFile] > div > table`
        : `#altinn-fileuploader-${id}-${row} .file-upload-table`;
      const statusIdx = isTagged ? 4 : 3;

      return {
        stateKey: `${id}-${row}`,
        dropZoneContainer: `#altinn-drop-zone-${id}-${row}`,
        dropZone: `#altinn-drop-zone-${id}-${row} input[type=file]`,
        attachments: [...Array(5)].map((_, idx) => ({
          name: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) > td:nth-child(1)`,
          status: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) > td:nth-child(${statusIdx})`,
          deleteBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) div[role=button]`,
          ...(isTagged
            ? {
              tagSelector: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) select`,
              tagSave: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) button[id^=attachment-save-tag-button]`,
              editBtn: `${tableSelector} > tbody > tr:nth-child(${
                idx + 1
              }) td:last-of-type button[class*=editTextContainer]`,
              deleteBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) button[class*=deleteButton]`,
            }
            : {}),
        })),
        addMoreBtn: `#altinn-fileuploader-${id}-${row} > button`,
        tableRowPreview:
          typeof row === 'number'
            ? `#group-mainGroup-table-body > tr:nth-child(${row + 1}) > td:nth-child(${tablePreviewColumn})`
            : `#group-subGroup-${row.split('-')[0]}-table-body > tr:nth-child(${
              parseInt(row.split('-')[1]) + 1
            }) > td:nth-child(${tablePreviewColumn})`,

        test: '#group-subGroup-0-table-body > tr > td:nth-child(2)',
      };
    };

    //group - task 3
    this.group = {
      prefill: {
        liten: 'input[name=liten]',
        middels: 'input[name=middels]',
        stor: 'input[name=stor]',
        svaer: 'input[name=svaer]',
        enorm: 'input[name=enorm]',
      },
      showGroupToContinue: '#showGroupToContinue',
      mainGroup: '#group-mainGroup',
      secondGroup: '#group-group-2',
      secondGroup_newValue: 'input[id^="group2-endre-til"]',
      secondGroup_currentValue: 'input[id^="group2-endre-fra"]',
      secondGroup_add: '[id^="add-button-group-2"]',
      secondGroup_add_to_reference_group: '[id^="add-reference-button-group-reference"]',
      secondGroup_save: '[id^="save-reference-button-group-reference"]',
      secondGroup_table: '[id^="group-group-2-table"]',
      subGroup: '[id^="group-subGroup"]',
      currentValue: 'input[id^="currentValue"]',
      navigationBarButton: '#form-content-nav2 > div > nav > button',
      newValue: 'input[id^="newValue"]',
      newValueLabel: 'label[for^="newValue"]',
      addNewItem: '[id^="add-button-mainGroup"]',
      addNewItemSubGroup: '[id*="add-button-subGroup"]',
      comments: 'input[id^="comments"]',
      delete: 'button[class*="makeStyles-deleteButton"]',
      saveSubGroup: 'button[id*="add-button-grp-subGroup"]',
      saveMainGroup: '#add-button-grp-mainGroup',
      editContainer: '[class^="makeStyles-editContainer"]',
      sendersName: '#sendersName',
      summaryText: '#send-in-text',
      next: 'button[aria-label="Neste"]',
      back: 'button[aria-label="Tilbake"]',
      mainGroupSummary: '[id^="mainGroup-"][id$="-summary"]',
      options: '#reduxOptions',
      tableErrors: '[data-testid=group-table-errors]',
      rows: [0, 1].map((idx) => ({
        uploadSingle: makeUploaderSelectors('mainUploaderSingle', idx, 3),
        uploadMulti: makeUploaderSelectors('mainUploaderMulti', idx, 4),
        editBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) > td:nth-last-of-type(2n) > button`,
        deleteBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) > td:last-of-type > button`,
        nestedGroup: {
          rows: [0, 1].map((subIdx) => ({
            uploadTagMulti: makeUploaderSelectors('subUploader', `${idx}-${subIdx}`, 2, true),
            nestedDynamics: `#nestedDynamics-${idx}-${subIdx} input[type=checkbox]`,
            nestedOptions: [
              `#nestedOptions-${idx}-${subIdx} input[type=checkbox]:nth(0)`,
              `#nestedOptions-${idx}-${subIdx} input[type=checkbox]:nth(1)`,
              `#nestedOptions-${idx}-${subIdx} input[type=checkbox]:nth(2)`,
            ],
            editBtn: `#group-subGroup-${idx}-table-body > tr:nth-child(${subIdx + 1}) > td:nth-last-of-type(2n) > button`,
            deleteBtn: `#group-subGroup-${idx}-table-body > tr:nth-child(${subIdx + 1}) > td:last-of-type > button`,
          })),
          groupContainer: `#group-subGroup-${idx}`,
          saveBtn: `#add-button-grp-subGroup-${idx}`,
        },
      })),
    };

    //Stateless-app
    this.stateless = {
      name: '#name',
      number: '#number',
      idnumber: '#idnummer',
      idnummer2: '#idnummer2',
      dropdown: '#options',
    };

    this.reporteeSelection = {
      appHeader: '[data-testid="AltinnAppHeader"]',
      searchReportee: 'input[placeholder="Søk etter aktør"]',
      checkbox: 'input[type="checkbox"]',
      seeSubUnits: '.ai.ai-expand-circle',
      reportee: '[data-testid="AltinnParty-PartyWrapper"][id^=party-]',
      subUnits: '[data-testid="AltinnParty-SubUnitWrapper"]',
      error: '#party-selection-error',
    };

    this.selectInstance = {
      container: '#instance-selection-container',
      header: '#instance-selection-header',
      description: '#instance-selection-description',
      table: '#instance-selection-table',
      tableBody: '#instance-selection-table-body',
      newInstance: '#new-instance-button',
    };
  }
}
