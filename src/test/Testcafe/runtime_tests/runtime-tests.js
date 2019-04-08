import App from '../app';
import { Selector, t } from 'testcafe';
import CommonPage from '../page-objects/common';
import DashBoard from '../page-objects/DashboardPage';
import LoginPage from '../page-objects/loginPage';
import DesignerPage from '../page-objects/designerPage';
import TestData from '../TestData';

let app = new App();
let dash = new DashBoard();
let loginPage = new LoginPage();
let common = new CommonPage();
let designer = new DesignerPage();
let runtimeUser = new TestData('AutoTest', 'automatictestaltinn@brreg.no', 'test123', 'basic');


fixture('Regression tests of services in runtime')
  .page(app.baseUrl)
  .beforeEach(async t => {
    //Testdata and other testing context
    t.ctx.serviceName = "runtime_auto_test";
    await common.login(testUser.userEmail, testUser.password, loginPage);
  })

test.skip('Instantiate a service in runtime', async () => {
    await t
      .navigateTo(app.baseUrl + 'designer/AutoTest/runtime_auto_test#/aboutservice')
      .hover(designer.testeNavigationTab)
      .hover(designer.leftDrawerMenu)
      .click()
      .wait(1000);
});