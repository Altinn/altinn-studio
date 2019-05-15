import { Selector, t } from 'testcafe';
import axeCheck from 'axe-testcafe';
import App from '../app';
import DashBoard from '../page-objects/DashboardPage';
import LoginPage from '../page-objects/loginPage';
import CommonPage from '../page-objects/common';
import TestData from '../TestData';
import DesignerPage from '../page-objects/designerPage';

let app = new App();
let dash = new DashBoard();
let loginPage = new LoginPage();
let common = new CommonPage();
let designer = new DesignerPage();
const testUser = new TestData('AutoTest', 'automatictestaltinn@brreg.no', 'test123', 'basic');

fixture('GUI service designer tests')
  .page(app.baseUrl)
  .beforeEach(async t => {
    t.ctx.klarForDeploy = "Tjenesten er klar til å legges ut i testmiljø";
    t.ctx.deployFailure = "Tjenesten ble ikke lagt ut i testmiljøet";
    t.ctx.localChanges = "Du har ikke delt dine endringer med din organisasjon";
    t.ctx.noCompile = "Tjenesten din kompilerer ikke";
    t.ctx.tilgjengelig = "Tjenesten din er klar for test";
    t.ctx.ikkeTilgjengelig = "Tjenesten din er ikke tilgjengelig i testmiljø";
    await common.login(testUser.userEmail, testUser.password, loginPage);
  })

test('Happy case; deploy a service to a test environment', async() => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/deployment#/deploytotest')
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(designer.deployButton.exists).ok()
    .click(designer.deployButton)
    .expect((Selector("h2").withText(t.ctx.tilgjengelig)).exists).ok()
})


test('Service cannot deploy due to compilation error', async() => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/CompileError#/deploytotest')
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(designer.deployButton.getAttribute("disabled")).notOk()
    .expect((Selector("h2").withText(t.ctx.noCompile)).exists).ok()
})

test('Service cannot be deployed due to local changes', async() => {
  await t
  .navigateTo(app.baseUrl + 'designer/tdd/deployment#/deploytotest')
  .click(designer.lageNavigationTab)
  .click(designer.inputBtn)
  .pressKey('enter')
  .expect(designer.delEndringer.exists).ok()
  .click(designer.testeNavigationTab)
  .hover(designer.leftDrawerMenu)
  .click(designer.testeLeftMenuItems[1])
  .expect(designer.deployButton.getAttribute("disabled")).notOk()
  .expect((Selector("h2").withText(t.ctx.localChanges)).exists).ok()
  .click(designer.delEndringer)
  .click(designer.commitMessageBox)
  .typeText(designer.commitMessageBox, "Sync service automated test", { replace: true })
  .expect(designer.validerEndringer.exists).ok()
  .click(designer.validerEndringer)
  .pressKey("tab")
  .pressKey("enter")
  .expect((Selector("h2").withText(t.ctx.klarForDeploy)).exists).ok()
})