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

    /** @see https://dev.altinn.studio/repos/ttd/expression-validation-test */
    expressionValidationTest: 'expression-validation-test',
  };

  //Start app instance page
  public appSelection = '#AppPathSelection';
  public startButton = '.btn';

  //Common
  public loadingAnimation = 'rect[role="presentation"]';
  public header = '#main-content > header';
  public closeButton = '[data-testid="form-close-button"]';
  public backButton = '[data-testid="form-back-button"]';
  public attachmentIcon = '.reg-attachment';
  public sendinButton = '#sendInButton';
  public instantiationButton = '#instantiation-button';
  public errorReport = '[data-testid="ErrorReport"]';
  public altinnError = '[data-testid="AltinnError"]';
  public instanceErrorCode = '[data-testid="StatusCode"]';
  public profileIconButton = '#profile-icon-button';
  public logOut = '#logout-menu-item';
  public logOutLink = 'a[href$="/ui/authentication/LogOut"]';
  public printButton = 'button:contains("Print / Lagre PDF")';

  public helpText = {
    open: 'button[aria-expanded=false]',
    close: 'button[aria-expanded=true]',
    alert: 'div[role="tooltip"]',
  };

  public navMenu = '#navigation-menu';
  public navMenuButtons = '#navigation-menu li > button';
  public navMenuCurrent = '#navigation-menu li > button[aria-current=page]';
  public navMobileMenu = 'nav[data-testid=NavigationBar] button';
  public navButtons = '[data-testid=NavigationButtons]';
  public startAgain = '#startAgain';
  public nextButton = `[data-testid=NavigationButtons] button:contains("${texts.next}")`;
  public prevButton = `[data-testid=NavigationButtons] button:contains("${texts.prev}")`;
  public backToSummaryButton = `[data-testid=NavigationButtons] button:contains("${texts.backToSummary}")`;

  public grid = {
    grid: '#page3-grid',
    gridWithAll: '#all-grid-components',
    showGridWithAll: '#show-all-components',
    hasCreditCard: '#has-credit-card',
    totalAmount: '#gjeld',
    totalPercent: '#fordeling-total',
    bolig: {
      percent: '#fordeling-bolig',
      percentComponent: 'div[data-componentid="fordeling-bolig"]',
      percentSummary: 'div[data-testid="summary-fordeling-bolig"]',
      amount: '#belop-bolig',
      amountComponent: 'div[data-componentid="belop-bolig"]',
      amountSummary: 'div[data-testid="summary-belop-bolig"]',
      verified: '#innhentet-bolig',
      verifiedComponent: 'div[data-componentid="innhentet-bolig"]',
      verifiedSummary: 'div[data-testid="summary-innhentet-bolig"]',
    },
    studie: {
      percent: '#fordeling-studie',
      percentComponent: 'div[data-componentid="fordeling-studie"]',
      percentSummary: 'div[data-testid="summary-fordeling-studie"]',
      amount: '#belop-studie',
      amountComponent: 'div[data-componentid="belop-studie"]',
      amountSummary: 'div[data-testid="summary-belop-studie"]',
      verified: '#innhentet-studie',
      verifiedComponent: 'div[data-componentid="innhentet-studie"]',
      verifiedSummary: 'div[data-testid="summary-innhentet-studie"]',
    },
    kredittkort: {
      percent: '#fordeling-kredittkort',
      percentComponent: 'div[data-componentid="fordeling-kredittkort"]',
      percentSummary: 'div[data-testid="summary-fordeling-kredittkort"]',
      amount: '#belop-kredittkort',
      amountComponent: 'div[data-componentid="belop-kredittkort"]',
      amountSummary: 'div[data-testid="summary-belop-kredittkort"]',
      verified: '#innhentet-kredittkort',
      verifiedComponent: 'div[data-componentid="innhentet-kredittkort"]',
      verifiedSummary: 'div[data-testid="summary-innhentet-kredittkort"]',
    },
    summary: 'div[data-testid="summary-summaryGrid1"]',
    summaryAll: 'div[data-testid="summary-summaryGrid2"]',
  };

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

  public fieldValidation(field: string, errorType: 'error' | 'warning' | 'info' | 'success' = 'error') {
    return `[id^="${errorType}_${field.replace(/^#/, '')}"]`;
  }

  //selectors for ttd/frontend-test app
  //message - task_1
  public message = {
    header: '#appen-for-test-av-app-frontend',
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
      tagsDropDown: 'input[id^="attachment-tag-dropdown"]',
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
    deleteAttachment: '[data-testid^="attachment-delete"]',
    popOverDeleteButton: '[data-testid="warning-popover-delete-button"]',
    popOverCancelButton: '[data-testid="warning-popover-cancel-button"]',
    uploadedTable: '#file-upload-table',
    downloadAttachment: '[data-testid="attachment-download"]',
    uploadSuccess: '[data-testid="checkmark-success"]',
    uploadDropZone: '#altinn-drop-zone-fileUpload-changename',
    componentSummary: '[data-testid="summary-item-simple"]',
    uploadError: '#error_fileUpload-changename',
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
    overflowGroup: '#group-mainGroup2',
    secondGroup: '#group-group2',
    secondGroup_newValue: 'input[id^="group2-endre-til"]',
    secondGroup_currentValue: 'input[id^="group2-endre-fra"]',
    secondGroup_add: '[id^="add-button-group2"]',
    secondGroup_add_to_reference_group: '[id^="add-reference-button-group-reference"]',
    secondGroup_save: '[id^="save-reference-button-group-reference"]',
    secondGroup_save_and_close: '[id^="add-button-grp-group2"]',
    secondGroup_table: '[id^="group-group2-table"]',
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
    saveAndNextMainGroup: '#next-button-grp-mainGroup',
    editContainer: '[data-testid=group-edit-container]',
    sendersName: '#sendersName',
    summaryText: '#send-in-text',
    next: `button:contains("${texts.next}")`,
    back: `button:contains("${texts.back}")`,
    mainGroupSummary: '[data-testid="summary-summary1"] [data-testid="display-group-container"]',
    mainGroupTableBody: '#group-mainGroup-table-body',
    options: '#reduxOptions',
    hideRepeatingGroupRow: '#hideRepeatingGroupRow',
    tableErrors: '#error_mainGroup',
    popOverDeleteButton: '[data-testid="warning-popover-delete-button"]',
    popOverCancelButton: '[data-testid="warning-popover-cancel-button"]',
    edit: '[data-testid=edit-button]',
    delete: '[data-testid=delete-button]',
    hideCommentField: '[id^="hideComment"]',
    hiddenRowsInfoMsg: '[data-componentid="info-msg"]',
    row: (idx: number) => ({
      currentValue: `#currentValue-${idx}`,
      newValue: `#newValue-${idx}`,
      uploadSingle: makeUploaderSelectors('mainUploaderSingle', idx, 3, 'untagged'),
      uploadMulti: makeUploaderSelectors('mainUploaderMulti', idx, 4, 'untagged'),
      editBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) [data-testid=edit-button]`,
      deleteBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) [data-testid=delete-button]`,
      nestedGroup: {
        row: (subIdx: number) => ({
          comments: `#comments-${idx}-${subIdx}`,
          uploadTagMulti: makeUploaderSelectors('subUploader', `${idx}-${subIdx}`, 2, 'tagged'),
          nestedDynamics: `#nestedDynamics-${idx}-${subIdx} input[type=checkbox]`,
          nestedSource: `#nested-source-${idx}-${subIdx}`,
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
    nexPageButton: 'button[aria-label="Neste side i tabell"]',
  };

  public signingTest = {
    incomeField: '#Input-income',
    incomeSummary: '[data-testid="summary-Input-income"]',
    submitButton: '#Button-submit',
    signingButton: '#action-button-SigningButton',
    managerConfirmPanel: '#form-content-Panel-confirm1',
    auditorConfirmPanel: '#form-content-Panel-confirm2',
    sentToAuditor: '#form-content-Header-noaccess',
    noAccessPanel: '#form-content-Panel-noaccess',
  };

  public expressionValidationTest = {
    kjønn: '#kjonn',
    bosted: '#bosted',
    groupTag: 'input[id^=attachment-tag]',
    uploaders: '[id^=Vedlegg-]',
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
      ? `#form-content-${id}-${row} [data-testid=tagFile]`
      : `#altinn-fileuploader-${id}-${row} [data-testid="file-upload-table"]`;
  const statusIdx = type === 'tagged' ? 4 : 3;

  return {
    fileUploader: `#altinn-fileuploader-${id}-${row}`,
    stateKey: `${id}-${row}`,
    dropZoneContainer: `#altinn-drop-zone-${id}-${row}`,
    dropZone: `#altinn-drop-zone-${id}-${row} input[type=file]`,
    attachments: (idx) => ({
      name: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) > td:nth-child(1)`,
      status: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) > td:nth-child(${statusIdx})`,
      deleteBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) [data-testid^="attachment-delete"]`,
      ...(type === 'tagged' && {
        tagSelector: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) input`,
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
