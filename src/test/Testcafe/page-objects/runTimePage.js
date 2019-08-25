import { Selector, t, ClientFunction } from 'testcafe';

export default class RunTimePage {
  constructor() {
    this.openManualTestWindow = Selector('#manual-test-button');
    this.testBrukerIframe = Selector('#root > div > div > div:nth-child(2) > div > div > iframe');
    this.testUsers = [
      Selector('strong').withText('Ola'),
      Selector('strong').withText('Kari'),
      Selector('strong').withText('Anne'),
      Selector('strong').withText('Pål')
    ];
    this.languageSelection = Selector('#reporteeLanguageSelect');
    this.changeLanguageButton = Selector('.btn.btn-primary').withAttribute('value', 'Oppdater språk');
    this.prefillData = Selector('#PrefillList');
    this.startNewButton = Selector('#btnStartNewService');
    this.backToAltinnStudio = Selector('.btn.btn-primary').withAttribute('value', 'Tilbake til Altinn Studio');

    //SBL components
    this.serviceBody = Selector(".modal-body.a-modal-body");
    this.fileDropComponent = Selector('.file-upload').child('input');
    this.fileListBox = Selector('[id*="-fileuploader-"]');
    this.fileDeleteButton = Selector('#attachment-delete-0');
    this.checkBox = Selector('');
    this.textboxComponent = Selector('textarea')
    this.addressComponent = Selector('input').withAttribute('type', 'text');
    this.inputButton = Selector('input').withAttribute('type', 'Input');
    this.saveButton = Selector("#saveBtn");
    this.sendInnButton = Selector('button').withAttribute('type','submit').withExactText('Send inn');
    this.workflowSubmit = Selector("#workflowSubmitStepButton");
    //file component error message
    this.errorMessage = Selector('.field-validation-error.a-message.a-message-error');

    this.testUserHeader = [
      Selector('div').withAttribute('title', 'OLA PRIVATPERSON'),
      Selector('div').withText('Kari'),
      Selector('div').withText('Anne'),
      Selector('div').withText('Pål')
    ];
  }

  async readOnlySelectors(innerText) {
    let readOnlySelector = Selector('.a-form-group').withText(innerText).child('input');
    return (readOnlySelector)
  }
}