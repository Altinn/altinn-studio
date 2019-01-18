import { t, Selector } from 'testcafe';
import { ReactSelector } from 'testcafe-react-selectors';
import App from '../app';


export default class DesignerPage {
  constructor() {
    this.header = Selector("#schema-components").withText("Header");
    this.inputBtn = Selector("#schema-components").withText("Input");
    this.dropDown = Selector("#schema-components").withText("Dropdown");
    this.checkBoxes = Selector("#schema-components").withText("Checkboxes");
    this.radioButtons = Selector("#schema-components").withText("RadioButtons");
    this.textArea = Selector("#schema-components").withText("TextArea");
    this.fileUpload = Selector("#schema-components").withText("FileUpload");
    this.submit = Selector("#schema-components").withText("Submit");
    this.addContainer = Selector("#schema-components").withText("Add Container");
    this.saveButton = Selector("#schema-components").withText("Save");
    this.addApiConnection = Selector(".d-block").withText("Api connections").child(0);
    this.addRuleConnection = Selector(".d-block").withText("Rule connections").child(0);
    this.addConditionalRendering = Selector(".d-block").withText("Conditional Rendering").child(0);

    //left drawer menu
    this.leftDrawerMenu = ReactSelector('LeftDrawerMenu');

    //"Om" navigation tab selectors
    this.omNavigationTab = Selector('div').withExactText('Om');
    this.omLeftMenuItems = [
      leftDrawerMenu.child().withExactText('Om tjenesten'),
      leftDrawerMenu.child().withExactText('Roller og rettigheter'),
      leftDrawerMenu.child().withExactText('Produksjon'),
      leftDrawerMenu.child().withExactText('Versjonshistorikk'),
      leftDrawerMenu.child().withExactText('Om sluttbrukeren'),
      leftDrawerMenu.child().withExactText('Altinn.no')
    ];

    //"Lage" navigation tab selectors
    this.lageNavigationTab = Selector('div').withExactText('Lage');
    this.lageLeftMenuItems = [
      leftDrawerMenu.child().withExactText('Datamodell'),
      leftDrawerMenu.child().withExactText('GUI'),
      leftDrawerMenu.child().withExactText('API')
    ];

    //"språk" navigation tab selectors
    this.spraakNavigationTab = Selector('div').withExactText('Språk');
    this.spraakLeftMenuItems = [
      leftDrawerMenu.child().withExactText('Tekst'),
      leftDrawerMenu.child().withExactText('Flere språk')
    ];

    //"teste" navigation tab selectors
    this.testeNavigationTab = Selector('div').withExactText('Teste');
    this.testeLeftMenuItems = [
      leftDrawerMenu.child().withExactText('Test')
    ];

    //"publisere" navigation tab selectors
    this.publisereNavigationTab = Selector('div').withExactText('Publisere');
    this.publisereLeftMenuItems = [
      leftDrawerMenu.child().withExactText('Produksjonsette'),
      leftDrawerMenu.child().withExactText('Status')
    ];

    //preview tab
    this.previewSaveButton = Selector(".a-btn-success").withText("Save");
    this.controlAndSubmit = Selector(".a-btn-success");

    //tekst tab
    this.nyTittelButton = Selector("#schema-texts").withText("Tittel");
    this.addNewLanguage = Selector("#newtab > a");
  }

  async deleteDataModelTexts(numberToDelete) {
    let deleteButtons = await Selector(".tbn").withText("Slett");
    let count = deleteButtons().count;

    for (let i = 0; i < numberToDelete && i < count; i++) {
      await t.click(deleteButtons.nth(i));
    }
  }
}
