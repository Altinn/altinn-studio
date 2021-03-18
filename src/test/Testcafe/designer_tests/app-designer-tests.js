import { t } from 'testcafe';
import App from '../app';
import { AutoTestUser } from '../TestData';
import DesignerPage from '../page-objects/designerPage';
import config from '../config.json';

let app = new App();
let designer = new DesignerPage();
let environment = (process.env.ENV).toLowerCase();

fixture('GUI app designer tests')
  .page(app.baseUrl)
  .beforeEach(async t => {
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await t
      .maximizeWindow()
      .useRole(AutoTestUser)
  })

// Test to verify the drag and drop functionality in designer
test('Drag and drop test', async() => {
  var appName = config[environment].designerApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .expect(designer.inputComponent.exists).ok()
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .click(designer.advancedComponentsGroup)
    .dragToElement(designer.addressComponent, designer.dragToArea)
  await designer.deleteUIComponentsMethod(t);
});

//Test to add ui components using keyboard clicks
test('Add one of each component to the designer using keyboard', async() => {
  var appName = config[environment].designerApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .click(designer.createNavigationTab)
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
test('Sync an app with master', async() => {
  var appName = config[environment].designerApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .click(designer.createNavigationTab)
    .click(designer.pullChanges)
  await t.eval(() => location.reload());
  await t
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .click(designer.aboutNavigationTab)
    .click(designer.createNavigationTab);
  await designer.pushAndCommitChanges(t);    
});

//Tests toverify the functionlaity inside the about page of an app
test('About page items and editing', async() => {  
  const randNumTwo = Math.floor(100 + Math.random() * 900);
  const randId = Math.floor(100000 + Math.random() * 900000);
  var appName = config[environment].designerApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .click(designer.aboutNavigationTab)
    .expect(designer.aboutAppName.focused).notOk()
    .click(designer.aboutAppName)
    .click(designer.aboutChangeAppName)
    .pressKey('ctrl+a')
    .pressKey('backspace')
    .typeText(designer.aboutAppName, 'autotest' + '_' + randNumTwo.toString())
    .expect(designer.aboutAppName.getAttribute("value")).eql("autotest" + "_" + randNumTwo.toString())
    .expect(designer.omLagringsNavn.getAttribute("value")).notContains(randNumTwo.toString())
    .pressKey('tab')
    .click(designer.aboutAppId)
    .pressKey('ctrl+a')
    .pressKey('backspace')
    .typeText(designer.aboutAppId, String(randId))
    .click(designer.aboutComments)
    .pressKey('ctrl+a')
    .pressKey('backspace')
    .typeText(designer.aboutComments, 'Lorem ipsum dolor sit amet.')
    .expect(designer.aboutComments.textContent).contains("Lorem")
});

//Test to verify that an app cannot be cloned when it lacks datamodel
test("User cannot clone an app that does not have a data model", async() => {
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

test('Configure and delete rules', async() => {
  var appName = config[environment].rulesApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor");
  await t
    .expect(designer.connectRulesButton.exists).ok()
    .click(designer.connectRulesButton)
    .expect(designer.rulesConnectionModal.exists).ok()
    .expect(designer.rulesDropDown.exists).ok()
    .click(designer.rulesDropDown)
    .expect(designer.rulesList.withAttribute('value', 'sum').exists).ok()
    .click(designer.rulesList.withAttribute('value', 'sum'))
    .click(designer.saveRulesButton)
    .expect(designer.addedRules.withExactText('sum').exists).ok()
    .click(designer.addedRules.withExactText('sum'))
    .expect(designer.deleteRulesButton.exists).ok()
    .click(designer.deleteRulesButton);
});

test('Links in App Logic menu', async() => {
  var appName = config[environment].rulesApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor");
  await t
    .expect(designer.editDynamic.exists).ok()
    .expect(designer.editDynamic.visible).ok();
});

test('Add and delete conditional rendering connections', async() => {
  var appName = config[environment].rulesApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor");
  await t
    .expect(designer.connectConditionalRendering.exists).ok()
    .click(designer.connectConditionalRendering)
    .expect(designer.renderingConnectionModal.exists).ok()
    .expect(designer.conditionalRulesDropDown.exists).ok()
    .click(designer.conditionalRulesDropDown)
    .click(designer.conditionalRulesList.withText('biggerThan10'))
    .click(designer.saveRulesButton)
    .expect(designer.addedRules.withExactText('biggerThan10').exists).ok()
    .click(designer.addedRules.withExactText('biggerThan10'))
    .expect(designer.deleteRulesButton.exists).ok()
    .click(designer.deleteRulesButton);
});

test('Clone modal functionality', async() => {
  var appName = config[environment].designerApp;
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .expect(designer.cloneButton.exists).ok()
    .hover(designer.cloneButton)
    .click(designer.cloneButton)
    .expect(designer.readMoreAltinnDocs.exists).ok()
    .expect(designer.copyUrlRepoButton.exists).ok()
    .click(designer.copyUrlRepoButton)
});

test('Validation of missing datamodel in clone modal', async() => {
  var appName = config[environment].withoutDataModelApp;
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + "designer/" + appName + "#/ui-editor")
    .expect(designer.cloneButton.exists).ok()
    .hover(designer.cloneButton)
    .click(designer.cloneButton)
    .expect(designer.dataModellLink.exists).ok()
    .click(designer.dataModellLink)
});

//Test to delete the local changes in stuido and reset the repo to the latest version from the repo
test('Delete local app changes', async() => {
  var appName = config[environment].designerApp;
  await t
    .navigateTo(app.baseUrl + "designer/" + appName + "#/about")
    .click(designer.createNavigationTab)
    .click(designer.pullChanges)
  await t.eval(() => location.reload());
  appName = (appName.split('/'))[1];
  await t
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .click(designer.aboutNavigationTab)
    .expect(designer.pushChanges.exists).ok({ timeout: 60000 })
    .expect(designer.deleteLocalChanges.exists).ok({ timeout: 60000 })
    .expect(designer.deleteLocalChanges.hasAttribute('disabled')).notOk('Delete local changes button not enabled', { timeout: 60000 })
    .click(designer.deleteLocalChanges)
    .expect(designer.deleteAppRepoName.exists).ok({ timeout: 60000 })
    .typeText(designer.deleteAppRepoName, appName, { replace: true })
    .expect(designer.confirmDeleteLocalChanges.exists).ok({ timeout: 60000 })
    .expect(designer.confirmDeleteLocalChanges.hasAttribute('disabled')).notOk('Confirm delete local changes button not enabled', { timeout: 60000 })
    .click(designer.confirmDeleteLocalChanges)
    .wait(4000);

  await t.eval(() => location.reload());
  await t
    .wait(5000)
    .expect(designer.noChanges.exists).ok('Local changes are not deleted', { timeout: 60000 });
});