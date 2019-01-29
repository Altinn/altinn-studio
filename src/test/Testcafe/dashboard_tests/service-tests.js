import { t } from 'testcafe';
import { waitForReact } from 'testcafe-react-selectors';
import DesignerPage from '../page-objects/designerPage';
import CommonPage from '../page-objects/common';
import TestData from '../TestData';
import App from '../app';
import LoginPage from '../page-objects/loginPage';

let app = new App();
let common = new CommonPage();
let loginPage = new LoginPage();
let designerPage = new DesignerPage();
const testUser = new TestData('AutoTest', 'automatictestaltinn@brreg.no', 'test123', 'basic');

fixture('Navigating the Service designer')
  .page(app.baseUrl)
  .before(async t => {
    //app.before()
  })
  .beforeEach(async t => {
    t.ctx.serviceName = 'testcafe01'
    t.ctx.syncMessage = 'Endringene er validert og kan deles med andre'
    await common.login(testUser.userEmail, testUser.password, loginPage);
    await waitForReact();
    //app.before();
  })
  .after(async () => {
    //await app.after();
  })

test.only('Sync a service with master', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice')
    .click(designerPage.lageNavigationTab)
    .dragToElement(designerPage.inputBtn, designerPage.canvas)
  //.click(designerPage.delEndringer)
  //.typeText(designerPage.commitMessageBox, "Sync service automated test")
  //.expect(Selector('h3').withExactText(t.ctx.syncMessage).visible).ok('Wrong commit message displayed!')
});