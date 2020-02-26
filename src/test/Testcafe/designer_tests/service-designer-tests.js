import { t } from 'testcafe';
import App from '../app';
import { AutoTestUser } from '../TestData';
import DesignerPage from '../page-objects/designerPage';
import config from '../config.json';

let app = new App();
let designer = new DesignerPage();
let environment = process.env.ENV;

fixture('GUI service designer tests')
  .page(app.baseUrl)
  .beforeEach(async t => {
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await t
      .maximizeWindow()
      .useRole(AutoTestUser)
  })

// Test to verify the drag and drop functionality in designer
test('Drag and drop test', async () => {
  var appName = config[environment].designerApp;  
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .expect(designer.inputComponent).ok()
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .click(designer.advancedComponentsGroup)
    .dragToElement(designer.addressComponent, designer.dragToArea)
  await designer.deleteUIComponentsMethod(t);
});

//Test to add ui components using keyboard clicks
test('Add one of each component to the designer using keyboard', async () => {
  var appName = config[environment].designerApp; 
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .click(designer.lageNavigationTab)
    .expect(designer.inputComponent.visible).ok()
    .click(designer.inputComponent)
    .pressKey('enter') //input button
    .pressKey('tab')
    .pressKey('enter') //text area
    .pressKey('tab')
    .pressKey('enter') //Checkbox
    .pressKey('tab')
    .pressKey('enter') //radiobutton
    .pressKey('tab')
    .pressKey('enter') //file upload
    .pressKey('tab')
    .pressKey('enter') //date
    .pressKey('tab')
    .pressKey('enter') //submit
  await designer.deleteUIComponentsMethod(t);
});

//Tests to commit and push changes to the gitea repo
test('Sync a service with master', async () => {
  var appName = config[environment].designerApp; 
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)
  await t.eval(() => location.reload(true));
  await t
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .click(designer.omNavigationTab)
    .click(designer.lageNavigationTab)
    .expect(designer.delEndringer.exists).ok({timeout: 120000})
    .click(designer.delEndringer)
    .expect(designer.commitMessageBox.exists).ok({timeout: 120000})
    .click(designer.commitMessageBox)
    .typeText(designer.commitMessageBox, "Sync service automated test", { replace: true })
    .expect(designer.validerEndringer.exists).ok({timeout: 120000})
    .click(designer.validerEndringer)
    .expect(designer.delEndringerBlueButton.exists).ok({ timeout: 120000 })
    .click(designer.delEndringerBlueButton)
    .expect(designer.ingenEndringer.exists).ok({ timeout: 120000 })
});

//Tests toverify the functionlaity inside the about page of an app
test('About page items and editing', async () => {
  const randNumOne = Math.floor(100 + Math.random() * 900);
  const randNumTwo = Math.floor(100 + Math.random() * 900);
  const randId = Math.floor(100000 + Math.random() * 900000);
  var appName = config[environment].designerApp; 
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .click(designer.omNavigationTab)
    .expect(designer.omTjenesteNavn.focused).notOk()
    .click(designer.omTjenesteNavn)
    .typeText(designer.omTjenesteNavn, 'autotest' + '_' + randNumOne.toString())
    .click(designer.omEndreTjenesteNavn)
    .expect(designer.omTjenesteNavn.getAttribute("value")).notContains(randNumOne.toString(), "Endre must be clicked for field to be editable!")
    .pressKey('ctrl+a')
    .pressKey('backspace')
    .typeText(designer.omTjenesteNavn, 'autotest' + '_' + randNumTwo.toString())
    .expect(designer.omTjenesteNavn.getAttribute("value")).eql("autotest" + "_" + randNumTwo.toString())
    .expect(designer.omLagringsNavn.getAttribute("value")).notContains(randNumTwo.toString())
    .pressKey('tab')
    .click(designer.omTjenesteId)
    .pressKey('ctrl+a')
    .pressKey('backspace')
    .typeText(designer.omTjenesteId, String(randId))
    .click(designer.omKommentarer)
    .pressKey('ctrl+a')
    .pressKey('backspace')
    .typeText(designer.omKommentarer, 'Lorem ipsum dolor sit amet.')
    .expect(designer.omKommentarer.textContent).contains("Lorem")
});

//Test to verify that an app cannot be cloned when it lacks datamodel
test("User cannot clone an app that does not have a data model", async () => {
  var appName = config[environment].withoutDataModelApp; 
  await t    
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .expect(designer.cloneButton.visible).ok()
    .click(designer.cloneButton)
    .expect(designer.dataModelMissing.visible).ok()
    .click(designer.dataModellLink)
    .switchToIframe(designer.dataModelIFrame)
    .expect(designer.dataModelUpload.exists).ok()
    .expect(designer.dataModelTabs.visible).notOk()
})

test('Configure and delete rules', async () => {
  var appName = config[environment].rulesApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    if (!await designer.serviceLogicmenu.exists) {
      await t.click(designer.openserviceLogicmenu)
    }   
  await t
    .expect(designer.serviceLogicmenu.exists).ok({ timeout: 5000 })
    .click(designer.dynamicsGroup)
    .expect(designer.connectRulesButton.exists).ok()
    .click(designer.connectRulesButton)
    .expect(designer.rulesConnectionModal.exists).ok({ timeout: 10000 })
    .expect(designer.rulesDropDown.exists).ok()
    .click(designer.rulesDropDown)
    .expect(designer.rulesList.withAttribute('value','sum').exists).ok()
    .click(designer.rulesList.withAttribute('value','sum'))
    .click(designer.saveRulesButton)
    .expect(designer.addedRules.withExactText('sum').exists).ok()
    .click(designer.addedRules.withExactText('sum'))
    .expect(designer.deleteRulesButton.exists).ok()
    .click(designer.deleteRulesButton)
});

test('Links in App Logic menu', async () => {
  var appName = config[environment].rulesApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
   if (!await designer.serviceLogicmenu.exists) {
      await t.click(designer.openserviceLogicmenu)
   }   
   await t
    .expect(designer.serviceLogicmenu.exists).ok({ timeout: 5000 })
    .expect(designer.validationsGroup.exists).ok({ timeout: 5000 })    
    .expect(designer.validationsGroup.visible).ok()
    .click(designer.validationsGroup)
    .expect(designer.editValidations.exists).ok()
    .click(designer.dynamicsGroup)
    .expect(designer.editDynamic.exists).ok()
    .click(designer.calculationsGroup)
    .expect(designer.editCalculations.exists).ok()
});

test('Add and delete conditional rendering connections', async () => {
  var appName = config[environment].rulesApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    if (!await designer.serviceLogicmenu.exists) {
      await t.click(designer.openserviceLogicmenu)
   }   
   await t
    .expect(designer.serviceLogicmenu.exists).ok({ timeout: 5000 })
    .click(designer.dynamicsGroup)
    .expect(designer.connectConditionalRendering.exists).ok()
    .click(designer.connectConditionalRendering)
    .expect(designer.renderingConnectionModal.exists).ok({ timeout: 10000 })
    .expect(designer.conditionalRulesDropDown.exists).ok()
    .click(designer.conditionalRulesDropDown)
    .click(designer.conditionalRulesList.withText('biggerThan10'))
    .click(designer.saveRulesButton)
    .expect(designer.addedRules.withExactText('biggerThan10').exists).ok()
    .click(designer.addedRules.withExactText('biggerThan10'))
    .expect(designer.deleteRulesButton.exists).ok()
    .click(designer.deleteRulesButton)
});

test('Clone modal functionality', async () => {
  var appName = config[environment].designerApp; 
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .expect(designer.cloneButton.exists).ok({ timeout: 5000 })
    .hover(designer.cloneButton)
    .click(designer.cloneButton)
    .expect(designer.readMoreAltinnDocs.exists).ok()
    .expect(designer.copyUrlRepoButton.exists).ok()
    .click(designer.copyUrlRepoButton)
});


test('Validation of missing datamodel in clone modal', async () => {
  var appName = config[environment].withoutDataModelApp; 
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .expect(designer.cloneButton.exists).ok({ timeout: 5000 })
    .hover(designer.cloneButton)
    .click(designer.cloneButton)
    .expect(designer.dataModellLink.exists).ok()
    .click(designer.dataModellLink)
});
