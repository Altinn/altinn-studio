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
    this.partyList = Selector('#PartyId');
    this.partiesInTheList = this.partyList.find('option');
    this.changeProfileButton = Selector('input').withAttribute('value','Bytt profil');

    //SBL components
    this.serviceBody = Selector(".modal-body.a-modal-body");
    this.fileDropComponent = Selector('.file-upload').child('input');
    this.fileListBox = Selector('[id*="-fileuploader-"]');
    this.fileDeleteButton = Selector('#attachment-delete-0');
    this.fileUploadChecks = Selector(".ai.ai-check-circle"); 
    this.checkBox = Selector('');
    this.textboxComponent = Selector('textarea')
    this.addressComponent = Selector('input').withAttribute('type', 'text');
    this.inputButton = Selector('input').withAttribute('type', 'Input');
    this.saveButton = Selector("#saveBtn");
    this.sendInnButton = Selector('button').withAttribute('type','submit').withExactText('Send inn');
    this.workflowSubmit = Selector("#workflowSubmitStepButton");
    //file component error message
    this.errorMessage = Selector('.field-validation-error.a-message.a-message-error');
    //Receipt Page
    this.receiptContainer = Selector('#ReceiptContainer');
    this.AttachmentDropDown = Selector("div > span").withText("Vedlegg");
    this.attachedFiles = Selector("p").withText("ServiceModel");

    //Message Box
    this.messagesList = Selector('.table.table-striped.table-bordered').find('tbody');

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

  async findAndOpenArchivedMessage (t){
    var messages = await this.messagesList.find('tr td a');
    var messagesCount = await messages.count;    
    if (messagesCount > 0) {
        for (var i=0; i<messagesCount; i++) {          
          var innerTextMessageId = await messages.nth(i).innerText;          
          if (innerTextMessageId.includes('Arktivert'))  {
            await t.click(messages.nth(i));
            break;
        }
      }       
    }
  }
}