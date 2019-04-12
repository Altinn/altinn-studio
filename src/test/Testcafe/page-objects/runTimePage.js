import { Selector, t, ClientFunction } from 'testcafe';

export default class RunTimePage {
  constructor() {
    this.openManualTestWindow = Selector('#manual-test-button');
    //this.privatPerson = Selector("ul").child(0);
    this.testUsers = [
      Selector('ul').child(0),
      Selector('ul').child(1),
      Selector('ul').child(2),
      Selector('ul').child(3)
    ];
    this.languageSelection = Selector('#reporteeLanguageSelect');
    this.changeLanguageButton = Selector('.btn.btn-primary').withAttribute('value', 'Oppdater språk');
    this.prefillData = Selector('#PrefillList');
    this.startNewButton = Selector('.btn.btn-primary').withAttribute('value', 'Start ny');
    this.backToAltinnStudio = Selector('.btn.btn-primary').withAttribute('value', 'Tilbake til Altinn Studio');

    //SBL components
    this.fileDropComponent = Selector('input').withAttribute('type', 'file');//Selector('.file-upload').child(0); 
    this.fileListBox = Selector('[id*="-fileuploader-"]');
    this.fileDeleteButton =  Selector("#attachment-delete-0");
  }
}