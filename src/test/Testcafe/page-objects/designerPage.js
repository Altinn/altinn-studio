import { Selector, RequestLogger } from 'testcafe';
const environment = process.env.ENV.toLowerCase();

export default class DesignerPage {
  constructor() {
    //left drawer menu
    this.leftDrawerMenu = Selector('#root > div > div > div:nth-child(2) > div:nth-child(1) > div > div > div');
    this.leftMenuList = Selector('nav'); //all unordered list elements to be filtered

    //"Om" navigation tab selectors
    this.aboutNavigationTab = Selector('div > a').withExactText('Om');
    this.appNameLocked = Selector('#administrationInputServicename_textField');
    this.aboutAppName = Selector('#administrationInputServicename > div > div > input');
    this.aboutChangeAppName = Selector('button > span > span').withExactText('Endre');
    this.aboutAppId = Selector('#administrationInputServiceid > div > div > input');
    this.omLagringsNavn = Selector('#administrationInputReponame > div > div > input');
    this.aboutComments = Selector('#administrationInputDescription > div > div > textarea');
    this.aboutLeftMenuItems = [
      this.leftMenuList.child('a').withAttribute('href', '#/about').child('div').withExactText('Om appen'),
    ];

    //"Lage" navigation tab selectors
    this.createNavigationTab = Selector('div > a').withExactText('Lage');
    this.createLeftMenuItems = [
      this.leftMenuList.child('a').withAttribute('href', '#/datamodel').child('div').withExactText('Datamodellering'),
      this.leftMenuList.child('a').withAttribute('href', '#/ui-editor').child('div').withExactText('UI-Editor'),
      this.leftMenuList
        .child('a')
        .withAttribute('href', '#/accesscontrol')
        .child('div')
        .withExactText('Tilgangsstyring'),
    ];
    this.dataModelIFrame = Selector('#root > div > div > div:nth-child(2) > div > div > iframe');
    this.dataModelUpload = Selector('#filelabel');
    this.dataModelTabs = Selector('#tabs');

    //Tilgangstyring tab selectors
    this.bankrupt = Selector('span').withExactText('Konkursbo').sibling(0);
    this.organization = Selector('span').withExactText('Virksomhet').sibling(0);
    this.privatePerson = Selector('span').withExactText('Privatperson').sibling(0);
    this.subUnit = Selector('span').withExactText('Underenhet').sibling(0);

    //Form components
    this.inputComponent = Selector('.fa.fa-short-answer').parent(2);
    this.dateComponent = Selector('.fa.fa-date').parent(2);
    this.dropdownComponent = Selector('.fa.fa-drop-down').parent(2);
    this.checkBoxComponent = Selector('.fa.fa-checkbox').parent(2);
    this.radioButtonComponent = Selector('.fa.fa-radio-button').parent(2);
    this.textAreaComponent = Selector('.fa.fa-long-answer').parent(2);
    this.attachmentComponent = Selector('.fa.fa-attachment').parent(2);
    this.dropDown = Selector('.fa.fa-drop-down').parent(2);
    this.submitComponent = Selector('.fa.fa-button').parent(2);
    this.headerComponent = Selector('.fa.fa-title').parent(2);
    this.paragraphComponent = Selector('.fa.fa-paragraph').parent(2);
    this.addressComponent = Selector('.fa.fa-address').parent(2);
    this.dragToArea = Selector('.col-12');
    this.removeComponentsButton = Selector('.fa.fa-circletrash');
    this.advancedComponentsGroup = Selector('div').withExactText('Avansert');
    this.textComponentsGroup = Selector('div').withExactText('Tekst');

    //"språk" navigation tab selectors
    this.languageNavigationTab = Selector('div').withExactText('Språk');
    this.languageLeftMenuItems = [
      this.leftMenuList.child('a').withAttribute('href', '#/texts').child('div').withExactText('Tekster'),
    ];
    this.languageTabs = Selector('#tabs');

    //"Deploy" navigation tab selectors
    this.deployNavigationTab = Selector('div > a').withExactText('Deploy');
    this.versionNumber = Selector('div > div').withAttribute('aria-label', 'Versjonsnummer');
    this.versionDescription = Selector('div > textarea');
    this.buildButton = Selector('button').withExactText('Bygg versjon');
    this.appBuilds = Selector('p').withText('Tidligere bygg av applikasjonen').parent(0).nextSibling();
    this.latestBuildStatusSuccess = this.appBuilds
      .child(0)
      .find('i')
      .withAttribute('class', /(ai-check-circle)/);
    this.latestBuildStatusFailure = this.appBuilds
      .child(0)
      .find('i')
      .withAttribute('class', /(ai-circle-exclamation)/);
    this.latestBuildStatusInprogress = this.appBuilds.child(0).find('div').withAttribute('role', 'progressbar');
    this.deployButton = environment == 'prod' ? Selector('#deploy-button-production') : Selector('#deploy-button-at22');
    this.deployVersionDropDown =
      environment == 'prod' ? Selector('#deploy-select-production') : Selector('#deploy-select-at22');
    this.noDeployVersionAvailable = Selector('div').withText('Du har ingen versjoner å deploye');
    this.deployVersionOptions = Selector('.select__menu-list');
    this.deployTable =
      environment == 'prod' ? Selector('#deploy-history-table-production') : Selector('#deploy-history-table-at22');
    this.deploys = this.deployTable.find('tr');
    this.deployConfirm = Selector('#deployPopover');
    this.deployStatus = Selector('p').withText('deployer versjon');
    this.noDeployAccessText = 'Du har ikke rettigheter til å starte en deploy til ';
    this.noDeployAccess =
      environment == 'prod'
        ? Selector('p').withText(this.noDeployAccessText + 'PRODUCTION-miljøet')
        : Selector('p').withText(this.noDeployAccessText + 'AT22-miljøet');

    //preview tab
    this.previewSaveButton = Selector('.a-btn-success').withText('Save');
    this.controlAndSubmit = Selector('.a-btn-success');

    //tekst tab
    this.nyTittelButton = Selector('#schema-texts').withText('Tittel');
    this.addNewLanguage = Selector('#newtab > a');

    //syncing elements
    this.pullChanges = Selector('#fetch_changes_btn');
    this.validateChanges = Selector('button > span').withExactText('Valider endringer');
    this.pushChanges = Selector('#changes_to_share_btn');
    this.noChanges = Selector('#no_changes_to_share_btn');
    this.pushChangesBlueButton = Selector('#share_changes_modal_button');
    this.commitMessageBox = Selector('#test');

    //Clone modal
    this.cloneButton = Selector('button').withExactText('Clone');
    this.copyUrlRepoButton = Selector('#copy-repository-url-button');
    this.dataModelMissing = Selector('div > p').withText('Datamodell mangler');
    this.readMoreAltinnDocs = Selector('a').withExactText('Lær mer på Altinn Studio docs');
    this.dataModellLink = Selector('a').withExactText('Gå til datamodell side');

    //App Logic menu
    this.connectRulesButton = Selector('.fa-plus').parent("button[aria-label*='regel for beregninger']");
    this.connectConditionalRendering = Selector('.fa-plus').parent("button[aria-label*='vis/skjul felt']");
    this.addedRules = Selector('.MuiGrid-container > .MuiGrid-item').find('button');
    this.editValidations = Selector('span').withExactText('Rediger valideringer');
    this.editDynamic = Selector('span').withExactText('Rediger dynamikk');

    //rulesmodal
    this.rulesConnectionModal = Selector('span').withExactText('Konfigurer regler');
    this.rulesDropDown = Selector('select').withAttribute('name', 'selectRule');
    this.rulesList = this.rulesDropDown.find('option');
    this.saveRulesButton = Selector('button').withExactText('Lagre');
    this.deleteRulesButton = Selector('button').withExactText('Slett');

    //Rendering connections modal
    this.renderingConnectionModal = Selector('span').withExactText('Konfigurer betingede renderingsregler');
    this.conditionalRulesDropDown = Selector('select').withAttribute('name', 'selectConditionalRule');
    this.conditionalRulesList = this.conditionalRulesDropDown.find('option');

    //Delete local app changes
    this.deleteLocalChanges = Selector('#reset-repo-button');
    this.deleteAppRepoName = Selector('#delete-repo-name');
    this.confirmDeleteLocalChanges = Selector('#confirm-reset-repo-button');
  }

  //Function to delete all the selected components in the designer page of an app
  async deleteUIComponentsMethod(t) {
    var addedUIComponents = await this.dragToArea
      .parent('div')
      .nextSibling('div')
      .child('div')
      .child('div')
      .withAttribute('draggable', 'true');
    var numberOfComponents = await addedUIComponents.count;
    if (numberOfComponents > 0 && !(await addedUIComponents.withText('Tomt').exists)) {
      for (var i = 0; i < numberOfComponents; i++) {
        await t.hover(addedUIComponents.nth(0));
        await t.click(addedUIComponents.nth(0));
        await t.hover(this.removeComponentsButton.parent('button'));
        await t.click(this.removeComponentsButton.parent('button'));
      }
    }
  }

  //Function to push and commit an app changes from the designer page
  async pushAndCommitChanges(t) {
    await t
      .expect(this.pushChanges.exists)
      .ok({ timeout: 60000 })
      .click(this.pushChanges)
      .expect(this.commitMessageBox.exists)
      .ok({ timeout: 60000 })
      .click(this.commitMessageBox)
      .typeText(this.commitMessageBox, 'Sync app automated test', { replace: true })
      .expect(this.validateChanges.exists)
      .ok({ timeout: 60000 })
      .click(this.validateChanges)
      .expect(this.pushChangesBlueButton.exists)
      .ok({ timeout: 60000 })
      .click(this.pushChangesBlueButton)
      .expect(this.noChanges.exists)
      .ok({ timeout: 60000 });
  }

  //Function to find the last deployed version and return the version number
  async getlatestBuildVersion(t) {
    var lastBuildVersion = await this.deployVersionOptions.child(0).innerText; //first element of the dropdown list
    lastBuildVersion = lastBuildVersion.split(' ');
    lastBuildVersion = lastBuildVersion[1].trim();
    lastBuildVersion = parseInt(lastBuildVersion);
    if (isNaN(lastBuildVersion)) {
      lastBuildVersion = Math.floor(Math.random() * 8000 + 1000);
    }
    return lastBuildVersion;
  }

  async deleteLocalAppChanges(t, appName) {
    const resetRepo = RequestLogger(/.*designerapi\/Repository\/ResetLocalRepository.*/);
    await t
      .expect(this.deleteLocalChanges.exists)
      .ok()
      .click(this.deleteLocalChanges)
      .expect(this.deleteAppRepoName.exists)
      .ok()
      .typeText(this.deleteAppRepoName, appName, {
        replace: true,
      })
      .addRequestHooks(resetRepo)
      .expect(this.confirmDeleteLocalChanges.exists)
      .ok()
      .click(this.confirmDeleteLocalChanges)
      .expect(resetRepo.contains((r) => r.response.statusCode === 200))
      .ok()
      .wait(10000);
  }
}
