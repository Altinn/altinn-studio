import { t } from 'testcafe';
import { waitForReact } from 'testcafe-react-selectors';
import DesignerPage from '../page-objects/designerPage';
import CommonPage from '../page-objects/common';
import TestData from '../TestData';
import App from '../app';
import LoginPage from '../page-objects/loginPage';
import DashBoard from '../page-objects/DashboardPage';

let app = new App();
let common = new CommonPage();
let dash = new DashBoard();
let loginPage = new LoginPage();
let designerPage = new DesignerPage();
const testUser = new TestData('AutoTest', 'automatictestaltinn@brreg.no', 'test123', 'basic');

fixture('Creating/Reading/Updating/Deleting services')
  .page(app.baseUrl)
  .before(async t => {
    //app.before()
  })
  .beforeEach(async t => {
    t.ctx.newServiceName = "testcafe02";
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await common.login(testUser.userEmail, testUser.password, loginPage);
    //app.before()
  })
  .after(async () => {
    //await app.after();
  })

test('Sync a service with master', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice')
    .click(designerPage.lageNavigationTab)
    .click(designerPage.dropDown)
    .pressKey("enter")
    .click(designerPage.omNavigationTab)
    .click(designerPage.lageNavigationTab)
    .expect(designerPage.delEndringer.exists).ok()
    .click(designerPage.delEndringer)
    .expect(designerPage.commitMessageBox.exists).ok()
    .click(designerPage.commitMessageBox)
    .typeText(designerPage.commitMessageBox, "Sync service automated test", { replace: true })
    .expect(designerPage.validerEndringer.exists).ok()
    .click(designerPage.validerEndringer)
    .pressKey("tab")
    .pressKey("enter")
});

test('Create a new service', async () => {
  await t
    .click(dash.newServiceButton)
    .click(dash.tjenesteNavn)
    .typeText(dash.tjenesteNavn, t.ctx.newServiceName)
    .pressKey("tab")
    .pressKey("tab")
    .click(dash.opprettButton)
});

test.skip('Filter services by name', async () => {
  await t
    .click()
    .click()
    .expect().ok()
});