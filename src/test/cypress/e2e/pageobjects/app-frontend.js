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
    this.errorExclamation = '.fa-circle-exclamation';
    this.errorReport = '#errorReport';
    this.altinnError = 'div[class*="AltinnError-contentMargin"]';
    this.profileIconButton = '#profile-icon-button';
    this.logOut = '#logout-menu-item';
    this.logOutLink = 'a[href$="/ui/authentication/LogOut"]';

    this.helpText = {
      open: '.reg-help-outline',
      close: '.reg-help-filled',
      alert: 'div[role="alert"]',
    };

    //Receipt
    this.receiptContainer = '#ReceiptContainer';
    this.linkToArchive = 'a[href$="/ui/messagebox/archive"]';

    // Confirmation
    this.confirmContainer = '#ConfirmContainer';
    this.confirmBody = '#body-text';
    this.confirmSendInButton = '#confirm-button';
    this.startAgain = '#startAgain';

    //field is a placeholder which has to be replaced with the selector value of the field
    this.fieldValidationError = '[id^="error_field"]';
    this.fieldValidationWarning = '[id^="message_field"]';

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
      currentName: '#currentName',
      newFirstName: '#newFirstName',
      newLastName: '#newLastName',
      newMiddleName: '#newMiddleName',
      oldFullName: '#changeNameFrom',
      newFullName: '#changeNameTo',
      confirmChangeName: '#confirmChangeName',
      reasons: '#reason',
      dateOfEffect: '#dateOfEffect',
      upload: '#fileUpload-changename',
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

    //group - task 3
    this.group = {
      showGroupToContinue: '#showGroupToContinue',
      mainGroup: '#group-mainGroup',
      subGroup: '[id^="group-subGroup"]',
      currentValue: 'input[id^="currentValue"]',
      newValue: 'input[id^="newValue"]',
      newValueLabel: 'label[for^="newValue"]',
      addNewItem: 'div[class*="addButton"]',
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
    };

    //Stateless-app
    this.stateless = {
      name: '#name',
      number: '#number',
      idnumber: '#idnummer',
      idnummer2: '#idnummer2',
    };

    this.reporteeSelection = {
      appHeader: 'div[class*=AltinnAppHeader-toolbarContainer]',
      searchReportee: 'input[placeholder="Søk etter aktør"]',
      checkbox: 'input[type="checkbox"]',
      seeSubUnits: '.ai.ai-expand-circle',
      reportee: 'div[class*=AltinnParty-partyWrapper][id^=party-]',
      subUnits: 'div[class*=AltinnParty-subUnitWrapper]',
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
