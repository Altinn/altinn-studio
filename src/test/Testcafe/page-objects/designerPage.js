import { t, Selector } from 'testcafe';
import App from '../app';


export default class designerPage {
  constructor() {
    this.designerTab = Selector(".nav-link.nav-item").withText("Designer");
    this.previewTab = Selector(".nav-link.nav-item").withText("Preview");
    this.teksterTab = Selector(".nav-link.nav-item").withText("Tekster");
    this.header = Selector(".button").withText("Header");
    this.inputBtn = Selector(".button").withText("Input");
    this.dropDown = Selector(".button").withText("Dropdown");
    this.checkBoxes = Selector(".button").withText("Checkboxes");
    this.radioButtons = Selector(".button").withText("RadioButtons");
    this.textArea = Selector(".button").withText("TextArea");
    this.fileUpload = Selector(".button").withText("FileUpload");
    this.submit = Selector(".button").withText("Submit");
    this.addContainer = Selector(".button").withText("Add Container");
  }
}
