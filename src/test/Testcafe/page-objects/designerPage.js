import { t, Selector } from 'testcafe';
import App from '../app';


export default class designerPage {
  constructor() {
    this.header = Selector(".button").withText("Header");
    this.inputBtn = Selector(".button").withText("Input");
    this.dropDown = Selector(".button").withText("Dropdown");
    this.checkBoxes = Selector(".button").withText("Checkboxes");
    this.radioButtons = Selector(".button").withText("RadioButtons");
    this.textArea = Selector(".button").withText("TextArea");
    this.fileUpload = Selector(".button").withText("FileUpload");
    this.submit = Selector(".button").withText("Submit");
    this.addContainer = Selector(".button").withText("Add Container");
    this.saveButton = Selector(".button").withText("Save");
    this.addApiConnection = Selector(".d-block").withText("Api connections").child(0);
    this.addRuleConnection = Selector(".d-block").withText("Rule connections").child(0);
    this.addConditionalRendering = Selector(".d-block").withText("Conditional Rendering").child(0);

    //preview tab
    this.previewSaveButton = Selector(".a-btn-success").withText("Save");
    this.controlAndSubmit = Selector(".a-btn-success");

    //tekst tab
    this.nyTextButton = Selector(".btn").withText("Ny tekst");
    this.addNewLanguage = Selector("#newtab > a");
  }


  deleteDataModelTexts(numberToDelete) {
    let deleteButtons = await Selector(".tbn").withText("Slett");
    let count = deleteButtons().count;

    for (let i = 0; i < numberToDelete && i < count; i++) {
      await t.click(deleteButtons.nth(i));
    }
  }
}
