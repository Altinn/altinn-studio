export default class AppFrontend {
  constructor() {
    //Start app instance page
    this.userId = '#UserId';
    this.appSelection = '#AppPathSelection';
    this.startButton = '.btn';

    //Common
    this.closeButton = '.a-modal-close-icon';
    this.backButton = '.a-modal-back';
    this.attachmentIcon = '.reg-attachment';
    this.sendinButton = '#sendInButton';
    this.helpText = '.ai-circle-plus';
    this.errorExclamation = '.fa-circle-exclamation';
    this.errorReport = '#errorReport';

    //Receipt
    this.receiptContainer = '#ReceiptContainer';
    this.linkToArchive = 'a[href$="/ui/messagebox/archive"]';

    // Confirmation
    this.confirmContainer = '#ConfirmContainer';
    this.confirmBody = '#body-text';
    this.confirmSendInButton = '#confirm-button';

    //field is a placeholder which has to be replaced with the selector value of the field
    this.fieldValidationError = '[id^="error_field"]';
    this.fieldValidationWarning = '[id^="message_field"]';

    //selectors for ttd/frontend-test app
    //message - task_1
    this.message = {
      header: '#appen-for-test-av-app-frontend',
      attachmentList: '.attachmentList-title',
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
    };

    //group - task 3
    this.group = {
      showGroupToContinue: '#showGroupToContinue',
      mainGroup: '#group-mainGroup',
      subGroup: '[id^="group-subGroup"]',
      currentValue: 'input[id^="currentValue"]',
      newValue: 'input[id^="newValue"]',
      addNewItem: 'div[class*="addButton"]',
      comments: 'input[id^="comments"]',
      delete: 'button[class*="makeStyles-deleteButton"]',
      saveSubGroup: 'button[id*="add-button-grp-subGroup"]',
      saveMainGroup: '#add-button-grp-mainGroup',
      editContainer: '[class^="makeStyles-editContainer"]',
      sendersName: '#sendersName',
      summaryText: '#send-in-text',
    };
  }
}
