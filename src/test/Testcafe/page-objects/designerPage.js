import { t, Selector } from 'testcafe';
import { ReactSelector } from 'testcafe-react-selectors';
import App from '../app';


export default class DesignerPage {
  constructor() {

    //editor elements #schema-components
    this.header = Selector("#schema-texts").withText("Header");
    this.inputBtn = Selector("#schema-components").withText("Input");
    this.dropDown = Selector("#schema-components").withText("Dropdown");
    this.datePicker = Selector("#schema-components").withText("Datepicker");
    this.checkBoxes = Selector("#schema-components").withText("Checkboxes");
    this.radioButtons = Selector("#schema-components").withText("RadioButtons");
    this.textArea = Selector("#schema-components").withText("TextArea");
    this.fileUpload = Selector("#schema-components").withText("FileUpload");
    this.submit = Selector("#schema-components").withText("Submit");
    this.saveButton = Selector("#schema-components").withText("Save");
    this.addApiConnection = Selector(".d-block").withText("Api connections").child(0);
    this.addRuleConnection = Selector(".d-block").withText("Rule connections").child(0);
    this.addConditionalRendering = Selector(".d-block").withText("Conditional Rendering").child(0);

    //editor canvas
    this.canvas = Selector('.div').withAttribute('draggable');

    //left drawer menu
    this.leftDrawerMenu = Selector('#root > div > div > div:nth-child(2) > div:nth-child(1) > div > div > div');
    this.leftMenuList = Selector('li'); //all unordered list elements to be filtered

    //"Om" navigation tab selectors
    this.omNavigationTab = Selector('div > a').withExactText('Om');
    this.omTjenesteNavn = Selector('#administrationInputServicename > div > div > input');
    this.omEndreTjenesteNavn = Selector("button > span > span").withExactText("Endre");
    this.omTjenesteId = Selector('#administrationInputServiceid > div > div > input');
    this.omLagringsNavn = Selector('#administrationInputReponame > div > div > input');
    this.omKommentarer = Selector('#administrationInputDescription > div > div > textarea');
    this.omLeftMenuItems = [
      this.leftMenuList.withExactText('Om appen')
    ];

    //"Lage" navigation tab selectors
    this.lageNavigationTab = Selector('div > a').withExactText('Lage');
    this.lageLeftMenuItems = [
      this.leftMenuList.withExactText('Datamodell'),
      this.leftMenuList.withExactText('UI-Editor'),
      this.leftMenuList.withExactText('Tilgangsstyring')
    ];
    this.dataModelIFrame = Selector("#root > div > div > div:nth-child(2) > div > div > iframe");
    this.dataModelUpload = Selector("#filelabel");
    this.dataModelTabs = Selector("#tabs");

    //Tilgangstyring tab selectors
    this.konkursBo = Selector("span").withExactText("Konkursbo").sibling(0);
    this.virksomhet = Selector("span").withExactText("Virksomhet").sibling(0);
    this.privatPerson = Selector("span").withExactText("Privatperson").sibling(0);
    this.underenhet = Selector("span").withExactText("Underenhet").sibling(0);

    //Form components
    this.inputComponent = Selector(".fa.fa-short-answer").parent(2);
    this.dateComponent = Selector(".fa.fa-date").parent(2);
    this.dropdownComponent = Selector(".fa.fa-drop-down").parent(2);
    this.checkBoxComponent = Selector(".fa.fa-checkbox").parent(2);
    this.radioButtonComponent = Selector(".fa.fa-radio-button").parent(2);
    this.textAreaComponent = Selector(".fa.fa-long-answer").parent(2);
    this.attachmentComponent = Selector(".fa.fa-attachment").parent(2);
    this.submitComponent = Selector(".fa.fa-button").parent(2);
    this.headerComponent = Selector(".fa.fa-title").parent(2);
    this.paragraphComponent = Selector(".fa.fa-paragraph").parent(2);
    this.addressComponent = Selector(".fa.fa-address").parent(2);
    this.dragToArea = Selector(".col-12");
    this.removeComponentsButton = Selector(".fa.fa-circletrash");

    //"språk" navigation tab selectors
    this.spraakNavigationTab = Selector('div').withExactText('Språk');
    this.spraakLeftMenuItems = [
      this.leftMenuList.withExactText('Tekster'),
      this.leftMenuList.withExactText('Flere språk')
    ];

    //"teste" navigation tab selectors
    this.testeNavigationTab = Selector('div > a').withExactText('Teste');
    this.testeLeftMenuItems = [
      this.leftMenuList.withExactText('Test')
    ];

    //"Deploy" navigation tab selectors
    this.deployNavigationTab = Selector('div > a').withExactText('Deploy');
    this.versionNumber = Selector('div > div').withAttribute('aria-label', 'Versjonsnummer');
    this.versionDescription = Selector('div > textarea');
    this.buildButton = Selector('button').withExactText('Bygg versjon');
    this.latestBuilds = Selector('.MuiGrid-root').withText('Tidligere bygg av applikasjonen').parent(0).sibling(3);
    this.deployButton = Selector('button').withExactText('Deploy ny versjon');
    this.deployVersionDropDown = Selector('#deploy-select-at23');
    this.noDeployVersionAvailable = Selector('div').withText('Du har ingen versjoner å deploye');
    this.deployVersionOptions = Selector('.select__menu-list');
    this.at23DeployTable = Selector('#deploy-history-table-at23');
    this.deployConfirm = Selector("#deployPopover");
    this.deployStatus = Selector('p').withText('deployer versjon');


    //preview tab
    this.previewSaveButton = Selector(".a-btn-success").withText("Save");
    this.controlAndSubmit = Selector(".a-btn-success");

    //tekst tab
    this.nyTittelButton = Selector("#schema-texts").withText("Tittel");
    this.addNewLanguage = Selector("#newtab > a");

    //syncing elements
    this.hentEndringer = Selector("#fetch_changes_btn");
    this.validerEndringer = Selector("button > span").withExactText("Valider endringer");
    this.delEndringer = Selector("#changes_to_share_btn");
    this.ingenEndringer = Selector("#no_changes_to_share_btn");
    this.delEndringerBlueButton = Selector("#share_changes_modal_button");
    this.commitMessageBox = Selector("#test");

    //Clone modal
    this.cloneButton = Selector('button').withExactText('Clone');
    this.copyUrlRepoButton = Selector('#copy-repository-url-button');
    this.dataModelMissing = Selector('div > p').withText('Datamodell mangler');
    this.readMoreAltinnDocs = Selector('a').withExactText('Lær mer på Altinn Studio docs');
    this.dataModellLink = Selector('a').withExactText('Gå til datamodell side');

    //serviceLogicmenu
    this.openserviceLogicmenu = Selector('#serviceLogicmenu').find('button');
    this.connectRulesButton = Selector('p').withExactText('Regler').nextSibling('button');
    this.connectConditionalRendering = Selector('p').withExactText('Betingede renderingstilkoblinger').nextSibling('button');
    this.addedRules = Selector('.a-topTasks').find('button')
    this.editValidations = Selector('span').withExactText('Rediger valideringer');
    this.editDynamic = Selector('span').withExactText('Rediger dynamikk');
    this.editCalculations = Selector('span').withExactText('Rediger kalkuleringer');

    //rulesmodal
    this.rulesConnectionModal = Selector('span').withExactText('Konfigurer regler');
    this.rulesDropDown = Selector('select').withAttribute('name', 'selectRule');
    this.rulesList = this.rulesDropDown.find('div');
    this.saveRulesButton = Selector('button').withExactText('Lagre');
    this.deleteRulesButton = Selector('button').withExactText('Slett');

    //Rendering connections modal
    this.renderingConnectionModal = Selector('span').withExactText('Konfigurer betingede renderingsregler');
    this.conditionalRulesDropDown = Selector('select').withAttribute('name', 'selectConditionalRule');
    this.conditionalRulesList = this.conditionalRulesDropDown.find('option');
  }

  async deleteDataModelTexts(numberToDelete) {
    let deleteButtons = await Selector(".tbn").withText("Slett");
    let count = deleteButtons().count;

    for (let i = 0; i < numberToDelete && i < count; i++) {
      await t.click(deleteButtons.nth(i));
    }
  }

  async whitePaperHeader(headerText) {
    return Selector('h2').withExactText(headerText);
  }

  async deleteUIComponentsMethod (t) {
    var addedUIComponents = await this.dragToArea.child('div').withAttribute('draggable','true');
    var numberOfComponents = await addedUIComponents.count;
    if (numberOfComponents > 0 && !await addedUIComponents.withText('Tomt').exists) {
        for (var i = 0; i < numberOfComponents; i++) {
          await t.hover(addedUIComponents.nth(i));
          await t.click(addedUIComponents.nth(i));
        }
        await t.hover(this.removeComponentsButton.parent('button'));
        await t.click(this.removeComponentsButton.parent('button'));
    }
  }
}
