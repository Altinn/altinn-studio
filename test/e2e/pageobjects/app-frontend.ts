import texts from 'test/e2e/fixtures/texts.json';

export class AppFrontend {
  public apps = {
    /** @see https://dev.altinn.studio/repos/ttd/frontend-test */
    frontendTest: 'frontend-test',

    /** @see https://dev.altinn.studio/repos/ttd/stateless-app */
    stateless: 'stateless-app',

    /** @see https://dev.altinn.studio/repos/ttd/anonymous-stateless-app */
    anonymousStateless: 'anonymous-stateless-app',

    /** @see https://dev.altinn.studio/repos/ttd/signing-test */
    signingTest: 'signing-test',
  };

  //Start app instance page
  public appSelection = '#AppPathSelection';
  public startButton = '.btn';

  //Common
  public loadingAnimation = 'rect[role="presentation"]';
  public header = '.a-modal-header';
  public closeButton = '[data-testid="form-close-button"]';
  public backButton = '[data-testid="form-back-button"]';
  public attachmentIcon = '.reg-attachment';
  public sendinButton = '#sendInButton';
  public instantiationButton = '#instantiation-button';
  public errorReport = '[data-testid="ErrorReport"]';
  public altinnError = '[data-testid="AltinnError"]';
  public profileIconButton = '#profile-icon-button';
  public logOut = '#logout-menu-item';
  public logOutLink = 'a[href$="/ui/authentication/LogOut"]';
  public designSystemPanel = '[data-testid="panel-content-wrapper"]';

  public helpText = {
    open: 'button[aria-expanded=false]',
    close: 'button[aria-expanded=true]',
    alert: 'div[role="tooltip"]',
  };

  public navMenu = '#navigation-menu';
  public navMenuButtons = '#navigation-menu li > button';
  public navMenuCurrent = '#navigation-menu li > button[aria-current=page]';
  public navButtons = '[data-testid=NavigationButtons]';
  public startAgain = '#startAgain';
  public nextButton = `[data-testid=NavigationButtons] button:contains("${texts.next}")`;
  public prevButton = `[data-testid=NavigationButtons] button:contains("${texts.prev}")`;
  public backToSummaryButton = `[data-testid=NavigationButtons] button:contains("${texts.backToSummary}")`;

  //Receipt
  public receipt = {
    container: '#ReceiptContainer',
    linkToArchive: 'a[href$="/ui/messagebox/archive"]',
    pdf: '#attachment-list-pdf',
    uploadedAttachments: '[data-testid=attachment-list]',
  };

  // Confirmation
  public confirm = {
    container: '#confirmcontainer',
    body: '#body-text',
    sendIn: '#confirm-button',
    receiptPdf: '#attachment-list-pdf',
    uploadedAttachments: '[data-testid=attachment-list]',
  };

  public feedback = '#FeedbackContainer';

  //field is a placeholder which has to be replaced with the selector value of the field
  public fieldValidationError = '[id^="error_field"]';
  public fieldValidationWarning = '[id^="warning_field"]';
  public fieldValidationInfo = '[id^="info_field"]';
  public fieldValidationSuccess = '[id^="success_field"]';

  //selectors for ttd/frontend-test app
  //message - task_1
  public message = {
    header: '#appen-for-test-av-app-frontend',
    attachmentList: '.attachmentList-title',
    logo: '#altinnLogo',
    logoFormContent: '#form-content-altinnLogo',
  };

  //change of name - task_2
  public changeOfName = {
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
    newFullName: '#changeNameTo_æøå',
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
      uploaded: '#tagFile',
      error: '[id^="attachment-error"]',
      unwantedChar: String.fromCharCode(31),
    },
    reasonRelationship: '#reasonRelationship',
    summaryNameChanges: '#nameChanges',
    mobilenummer: '#mobilnummer',
    sources: '#sources',
    uploadingAnimation: '#loader-upload',
    deleteAttachment: 'div[data-testid^="attachment-delete"]',
    uploadedTable: '#altinn-file-listfileUpload-changename',
    uploadSuccess: '.ai-check-circle',
    uploadDropZone: '#altinn-drop-zone-fileUpload-changename',
  };

  //group - task 3
  public group = {
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
    secondGroup_save_and_close: '[id^="add-button-grp-group-2"]',
    secondGroup_table: '[id^="group-group-2-table"]',
    subGroup: '[id^="group-subGroup"]',
    currentValue: 'input[id^="currentValue"]',
    navigationBarButton: '#form-content-nav2 > div > nav > button',
    newValue: 'input[id^="newValue"]',
    newValueLabel: 'label[for^="newValue"]',
    addNewItem: '[id^="add-button-mainGroup"]',
    addNewItemSubGroup: '[id*="add-button-subGroup"]',
    comments: 'input[id^="comments"]',
    saveSubGroup: 'button[id*="add-button-grp-subGroup"]',
    saveMainGroup: '#add-button-grp-mainGroup',
    editContainer: '[data-testid=group-edit-container]',
    sendersName: '#sendersName',
    summaryText: '#send-in-text',
    next: `button:contains("${texts.next}")`,
    back: `button:contains("${texts.back}")`,
    mainGroupSummary: '[data-testid="summary-summary-1"] [data-testid="display-group-container"]',
    mainGroupTableBody: '#group-mainGroup-table-body',
    options: '#reduxOptions',
    tableErrors: '[data-testid=group-table-errors]',
    popOverDeleteButton: '[data-testid="warning-popover-delete-button"]',
    popOverCancelButton: '[data-testid="warning-popover-cancel-button"]',
    edit: '[data-testid=edit-button]',
    delete: '[data-testid=delete-button]',
    hideCommentField: '[id^="hideComment"]',
    row: (idx: number) => ({
      uploadSingle: makeUploaderSelectors('mainUploaderSingle', idx, 3, 'untagged'),
      uploadMulti: makeUploaderSelectors('mainUploaderMulti', idx, 4, 'untagged'),
      editBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) [data-testid=edit-button]`,
      deleteBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) [data-testid=delete-button]`,
      nestedGroup: {
        row: (subIdx: number) => ({
          uploadTagMulti: makeUploaderSelectors('subUploader', `${idx}-${subIdx}`, 2, 'tagged'),
          nestedDynamics: `#nestedDynamics-${idx}-${subIdx} input[type=checkbox]`,
          nestedOptions: [
            `#nestedOptions-${idx}-${subIdx} input[type=checkbox]:nth(0)`,
            `#nestedOptions-${idx}-${subIdx} input[type=checkbox]:nth(1)`,
            `#nestedOptions-${idx}-${subIdx} input[type=checkbox]:nth(2)`,
          ],
          editBtn: `#group-subGroup-${idx}-table-body > tr:nth-child(${subIdx + 1}) > td:nth-last-of-type(2n) button`,
          deleteBtn: `#group-subGroup-${idx}-table-body > tr:nth-child(${subIdx + 1}) > td:last-of-type button`,
        }),
        groupContainer: `#group-subGroup-${idx}`,
        saveBtn: `#add-button-grp-subGroup-${idx}`,
      },
    }),
  };

  //Stateless-app
  public stateless = {
    name: '#name',
    number: '#number',
    idnumber: '#idnummer',
    idnummer2: '#idnummer2',
    dropdown: '#options',
  };

  public reporteeSelection = {
    appHeader: '[data-testid="AltinnAppHeader"]',
    searchReportee: 'input[placeholder="Søk etter aktør"]',
    checkbox: 'input[type="checkbox"]',
    seeSubUnits: '.ai.ai-expand-circle',
    reportee: '[data-testid="AltinnParty-PartyWrapper"][id^=party-]',
    subUnits: '[data-testid="AltinnParty-SubUnitWrapper"]',
    error: '#party-selection-error',
  };

  public selectInstance = {
    container: '#instance-selection-container',
    header: '#instance-selection-header',
    description: '#instance-selection-description',
    table: '#instance-selection-table',
    tableBody: '#instance-selection-table-body',
    newInstance: '#new-instance-button',
  };

  public signingTest = {
    incomeField: '#Input-income',
    submitButton: '#Button-submit',
    confirmButton: '#Button-confirm',
    managerConfirmPanel: '#form-content-Panel-confirm1',
    auditorConfirmPanel: '#form-content-Panel-confirm2',
  };
}

type Type = 'tagged' | 'untagged';

export function makeUploaderSelectors<T extends Type>(
  id: string,
  row: number | string,
  tablePreviewColumn: number,
  type: T,
) {
  const tableSelector =
    type === 'tagged'
      ? `#form-content-${id}-${row} div[data-testid=tagFile] > div > table`
      : `#altinn-fileuploader-${id}-${row} .file-upload-table`;
  const statusIdx = type === 'tagged' ? 4 : 3;

  return {
    stateKey: `${id}-${row}`,
    dropZoneContainer: `#altinn-drop-zone-${id}-${row}`,
    dropZone: `#altinn-drop-zone-${id}-${row} input[type=file]`,
    attachments: (idx) => ({
      name: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) > td:nth-child(1)`,
      status: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) > td:nth-child(${statusIdx})`,
      deleteBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) div[role=button]`,
      ...(type === 'tagged' && {
        tagSelector: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) select`,
        tagSave: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) button[id^=attachment-save-tag-button]`,
        editBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) td:last-of-type button:contains("Rediger")`,
        deleteBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) button:contains("Slett")`,
      }),
    }),
    addMoreBtn: `#altinn-fileuploader-${id}-${row} > button`,
    tableRowPreview:
      typeof row === 'number'
        ? `#group-mainGroup-table-body > tr:nth-child(${row + 1}) > td:nth-child(${tablePreviewColumn})`
        : `#group-subGroup-${row.split('-')[0]}-table-body > tr:nth-child(${
            parseInt(row.split('-')[1]) + 1
          }) > td:nth-child(${tablePreviewColumn})`,

    test: '#group-subGroup-0-table-body > tr > td:nth-child(2)',
  };
}
