import { Selector, t, ClientFunction } from 'testcafe';
import { createJsxSelfClosingElement } from 'typescript';


export default class RunTimePage {
  constructor() {
    this.openManualTestWindow = Selector('#manual-test-button');
    this.testUsers = Selector('.list-group.action-list-group');
    this.languageSelection = Selector('#reporteeLanguageSelect');
    this.changeLanguageButton = Selector(".btn.btn-primary").withAttribute('value', 'Oppdater språk');
    this.prefillData = Selector('#PrefillList');
    this.startNewButton = Selector(".btn.btn-primary").withAttribute('value', 'Start ny');
    this.backToAltinnStudio = Selector(".btn.btn-primary").withAttribute('value', 'Tilbake til Altinn Studio');
  }
}