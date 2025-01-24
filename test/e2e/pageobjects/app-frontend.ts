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

    /** @see https://dev.altinn.studio/repos/ttd/payment-test */
    paymentTest: 'payment-test',

    /** @see https://altinn.studio/repos/ttd/component-library.git */
    componentLibrary: 'component-library',

    /** @see https://dev.altinn.studio/repos/ttd/multiple-datamodels-test */
    multipleDatamodelsTest: 'multiple-datamodels-test',

    /** @see https://dev.altinn.studio/repos/ttd/subform-test */
    subformTest: 'subform-test',
  };

  //Start app instance page
  public appSelection = '#AppPathSelection';
  public startButton = '.btn';

  //Common
  public loadingAnimation = 'rect[role="presentation"]';
  public header = '#main-content > header';
  public attachmentIcon = '.reg-attachment';
  public sendinButton = '#sendInButton';
  public instantiationButton = '#instantiation-button';
  public errorReport = '[data-testid="ErrorReport"]';
  public altinnError = '[data-testid="AltinnError"]';
  public instanceErrorCode = '[data-testid="StatusCode"]';
  public profileIconButton = '#profile-icon-button';
  public printButton = 'button:contains("Print / Lagre PDF")';
  public toast = '[role="alert"][class^="Toast"]';
  public expandedWidth = '[data-expanded="true"]';
  public notExpandedWidth = '[data-expanded="false"]';

  public helpText = {
    button: 'button[class^="fds-helptext"]',
    alert: 'div[role="dialog"]',
  };

  public navMenu = '#navigation-menu';
  public navMenuButtons = '#navigation-menu li > button';
  public navMenuCurrent = '#navigation-menu li > button[aria-current=page]';
  public navMobileMenu = 'nav[data-testid=NavigationBar] button';
  public navButtons = '[data-testid=NavigationButtons]';
  public startAgain = '#startAgain';

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

  public fieldValidation(field: string) {
    return `[data-validation="${field.replace(/^#/, '')}"]`;
  }

  //selectors for ttd/frontend-test app
  //message - task_1
  public message = {
    header: '#appen-for-test-av-app-frontend',
    logo: '#altinnLogo',
    logoFormContent: '#form-content-altinnLogo',
    title: '#form-content-messageTitle',
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
    newFullName: '#changeNameTo',
    confirmChangeName: '#confirmChangeName',
    reasons: '#reason',
    reference: '#reference',
    reference2: '#reference2',
    dateOfEffect: '#dateOfEffect',
    municipalityMetadata: '#kommuner-metadata',
    municipality: '#kommune',
    upload: '#fileUpload-changename',
    uploadWithTag: {
      uploadZone: '#fileUploadWithTags-changename',
      editWindow: '[id^="attachment-edit-window"]',
      tagsDropDown: 'input[id^="attachment-tag-dropdown"]',
      saveTag: '[id^="attachment-save-tag-button"]',
      uploaded: '#tagFile',
      error: '[data-componentid="fileUploadWithTags-changename"] [data-validation]',
      unwantedChar: String.fromCharCode(31),
    },
    reasonRelationship: '#reasonRelationship',
    summaryNameChanges: '#nameChanges',
    mobilenummer: '#mobilnummer',
    sources: '#sources',
    uploadingAnimation: '[id*="loader"]',
    uploadedTable: '#file-upload-table',
    downloadAttachment: '[data-testid="attachment-download"]',
    fileUploadSuccess: '[data-testid="status-success"]',
    uploadDropZone: '#altinn-drop-zone-fileUpload-changename',
    componentSummary: '[data-testid="summary-item-simple"]',
    uploadError: '#error_fileUpload-changename',
    summaryReference: '[data-componentid="summary-reference"]',
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
    secondGroup_save_and_close: '[id^="save-button-group2"]',
    secondGroup_table: '[id^="group-group2-table"]',
    subGroup: '[id^="group-subGroup"]',
    currentValue: 'input[id^="currentValue"]',
    navigationBarButton: '#form-content-nav2 > div > nav > button',
    newValue: 'input[id^="newValue"]',
    newValueLabel: 'label[for^="newValue"]',
    addNewItem: '[id^="add-button-mainGroup"]',
    addNewItemSubGroup: '[id*="add-button-subGroup"]',
    comments: 'input[id^="comments"]',
    saveSubGroup: 'button[id*="save-button-subGroup"]',
    saveMainGroup: '#save-button-mainGroup',
    saveAndNextMainGroup: '#next-button-grp-mainGroup',
    editContainer: '[data-testid=group-edit-container]',
    sendersName: '#sendersName',
    summaryText: '#send-in-text',
    next: `button:contains("${texts.next}")`,
    back: `button:contains("${texts.back}")`,
    mainGroupSummary: '[data-testid="summary-summary1"] fieldset',
    mainGroupSummaryContent: '#summary-mainGroup-0',
    mainGroupTableBody: '#group-mainGroup-table-body',
    options: '#reduxOptions',
    optionsDynamic: '#reduxOptions-expressions',
    hideRepeatingGroupRow: '#hideRepeatingGroupRow',
    hideCommentField: '[id^="hideComment"]',
    hiddenRowsInfoMsg: '[data-componentid="info-msg"]',
    row: (idx: number) => ({
      tableRow: `#group-mainGroup-table-body > tr:nth-child(${idx + 1})`,
      currentValue: `#currentValue-${idx}`,
      newValue: `#newValue-${idx}`,
      uploadSingle: makeUploaderSelectors('mainUploaderSingle', idx, 3, 'untagged'),
      uploadMulti: makeUploaderSelectors('mainUploaderMulti', idx, 4, 'untagged'),
      editBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) > td:nth-last-of-type(2n) button`,
      deleteBtn: `#group-mainGroup-table-body > tr:nth-child(${idx + 1}) > td:last-of-type button`,
      nestedGroup: {
        row: (subIdx: number) => ({
          tableRow: `#group-subGroup-${idx}-table-body > tr:nth-child(${subIdx + 1})`,
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
        saveBtn: `#save-button-subGroup-${idx}`,
      },
    }),
  };

  public pets = {
    decisionPanel: {
      manualButton: '#custom-button-forceShowPets',
      autoPetsButton: '#custom-button-generatePets',
      autoFarmAnimalsButton: '#custom-button-generateWholeFarm',
    },
    group: (withOptionComponent = false) => {
      const id = withOptionComponent ? 'pets-with-option' : 'pets';
      return {
        table: `#group-${id}-table-body`,
        tableRows: `#group-${id}-table-body tr`,
        tableRow: (idx: number) => ({
          species: `#pet-species-${idx}`, // Only in non-option mode
          speciesOption: `#form-content-pet-species-option-${idx}`, // Only in option mode
          name: `#group-${id}-table-body tr[data-row-num=${idx}] td:nth-child(2)`,
          editButton: `#group-${id}-table-body tr[data-row-num=${idx}] button:contains("Rediger")`,
          deleteButton: `#group-${id}-table-body tr[data-row-num=${idx}] button:contains("Slett")`,
        }),
        addButton: `#add-button-${id}`,
        editContainer: {
          _: '[data-testid=group-edit-container]',
          species: '[data-testid=group-edit-container] [id^="pet-species"]',
          name: '[data-testid=group-edit-container] [id^="pet-name"]',
          age: '[data-testid=group-edit-container] [id^="pet-age"]',
          sortOrder: '[data-testid=group-edit-container] [id^="futureSortOrder-inside"]',
          sortButton: '[data-testid=group-edit-container] [id^="custom-button-sortOrderButton-inside"]',
          saveAndClose: '[data-testid=group-edit-container] #save-button-pets',
        },
      };
    },
    hide: {
      _: '#form-content-hiddenPets',
      all: '#form-content-hiddenPets input[type=checkbox]',
    },
    useOptions: '#form-content-useOptionComponent',
    sortOutside: {
      sortOrder: '#futureSortOrder-outside',
      sortButton: '#custom-button-sortOrderButton-outside',
    },
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

  public multipleDatamodelsTest = {
    variableParagraph: '#variableParagraph',
    repeatingParagraph: '[id^=repeatingParagraph]',
    textField1: '#Input-bhWSyO',
    textField2: '#Input-aWlSF3',
    addressField: '#Address-xdZ7PE',
    chooseIndusty: '#choose-industry',
    textField1Summary: '[data-testid="summary-text1"]',
    textField2Summary: '[data-testid="summary-text2"]',
    textField3Summary: '[data-testid="summary-text3"]',
    textField2Paragraph: '[data-testid="paragraph-component-text2"]',
    sectorSummary: '[data-testid="summary-sector"]',
    industrySummary: '[data-testid="summary-industry"]',
    personsSummary: '[data-testid="summary-persons"]',
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
      deleteBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) button:contains("Slett")`,
      ...(type === 'tagged' && {
        tagSelector: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) input`,
        tagSave: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) button[id^=attachment-save-tag-button]`,
        editBtn: `${tableSelector} > tbody > tr:nth-child(${idx + 1}) td:last-of-type button:contains("Rediger")`,
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

export const component = (id: string) => `[data-componentid="${id}"]`;
