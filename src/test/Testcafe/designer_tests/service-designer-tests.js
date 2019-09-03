import { Selector, t } from 'testcafe';
import axeCheck from 'axe-testcafe';
import App from '../app';
import { AutoTestUser } from '../TestData';
import DesignerPage from '../page-objects/designerPage';
import RuntimePage from '../page-objects/runTimePage';

let app = new App();
let designer = new DesignerPage();
let runtime = new RuntimePage();

fixture('GUI service designer tests')
  .page(app.baseUrl)
  .beforeEach(async t => {
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await t
      .useRole(AutoTestUser)
      .resizeWindow(1280, 610)
  })

test('Drag and drop test', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/uieditor')
    .expect(designer.inputComponent).ok()
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .dragToElement(designer.addressComponent, designer.dragToArea)
  await designer.deleteUIComponentsMethod(t);
});

test('Add one of each component to the designer using keyboard', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/aboutservice')
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

test('Sync a service with master', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/aboutservice')
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)
  await t.eval(() => location.reload(true));
  await t
    .dragToElement(designer.inputComponent, designer.dragToArea)
    .click(designer.omNavigationTab)
    .click(designer.lageNavigationTab)
    .expect(designer.delEndringer.exists).ok()
    .click(designer.delEndringer)
    .expect(designer.commitMessageBox.exists).ok()
    .click(designer.commitMessageBox)
    .typeText(designer.commitMessageBox, "Sync service automated test", { replace: true })
    .expect(designer.validerEndringer.exists).ok()
    .click(designer.validerEndringer)
    .expect(designer.delEndringerBlueButton.exists).ok({ timeout: 120000 })
    .click(designer.delEndringerBlueButton)
    .expect(designer.ingenEndringer.exists).ok({ timeout: 120000 })
});

test('About page items and editing', async () => {
  const randNumOne = Math.floor(100 + Math.random() * 900);
  const randNumTwo = Math.floor(100 + Math.random() * 900);
  const randId = Math.floor(100000 + Math.random() * 900000);
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/uieditor')
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

test("Fill out Access control information on an app", async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/uieditor')
    .click(designer.lageNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.lageLeftMenuItems[4])
    .click(designer.virksomhet)
    .click(designer.hookCheckBox)
    .expect(designer.tjenestekode.exists).ok()
    .typeText(designer.tjenestekode, '1234')
    .expect(designer.tjenesteutgavekode.exists).ok()
    .typeText(designer.tjenesteutgavekode, '1')
    .click(designer.virksomhet)
    .click(designer.hookCheckBox)
    .expect(designer.tjenestekode.exists).notOk()
    .expect(designer.tjenesteutgavekode.exists).notOk()
});


test("User cannot clone an app that does not have a data model", async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/uieditor')
})

test('Automated accessibility test for designer page', async t => {
  axeCheck(t);
});

test('Configure and delete rules', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/rulesservice#/uieditor')
    .expect(designer.openserviceLogicmenu.exists).ok({ timeout: 5000 })
    .click(designer.openserviceLogicmenu)
    .expect(designer.connectRulesButton.exists).ok()
    .click(designer.connectRulesButton)
    .expect(designer.rulesConnectionModal.exists).ok({ timeout: 10000 })
    .expect(designer.rulesDropDown.exists).ok()
    .click(designer.rulesDropDown)
    .click(designer.rulesList.withText('sum'))
    .click(designer.saveRulesButton)
    .expect(designer.addedRules.withExactText('sum').exists).ok()
    .click(designer.addedRules.withExactText('sum'))
    .expect(designer.deleteRulesButton.exists).ok()
    .click(designer.deleteRulesButton)
});

test('Links in App Logic menu', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/rulesservice#/uieditor')
    .expect(designer.openserviceLogicmenu.exists).ok({ timeout: 5000 })
    .click(designer.openserviceLogicmenu)
    .expect(designer.editValidations.exists).ok()
    .expect(designer.editDynamic.exists).ok()
    .expect(designer.editCalculations.exists).ok()
});

test('Add and delete conditional rendering connections', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/rulesservice#/uieditor')
    .expect(designer.openserviceLogicmenu.exists).ok({ timeout: 5000 })
    .click(designer.openserviceLogicmenu)
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
