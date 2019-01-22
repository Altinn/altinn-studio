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
  .before(async () => {
  })
  .beforeEach(async () => {
    await common.login(testUser.userEmail, testUser.password, loginPage);
    await waitForReact();
    //app.before();
  })
  .after(async () => {
    //await app.after();
  })

test('Om tab navigation', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice') //navigate to the designer on test user repo
    .click(designerPage.omNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.omLeftMenuItems[0].visible).ok()
    .expect(designerPage.omLeftMenuItems[1].visible).ok()
    .expect(designerPage.omLeftMenuItems[2].visible).ok()
    .expect(designerPage.omLeftMenuItems[3].visible).ok()
    .expect(designerPage.omLeftMenuItems[4].visible).ok()
    .expect(designerPage.omLeftMenuItems[5].visible).ok()
});

test('Lage tab navigation', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice')
    .click(designerPage.lageNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.lageLeftMenuItems[0].visible).ok()
    .expect(designerPage.lageLeftMenuItems[1].visible).ok()
    .expect(designerPage.lageLeftMenuItems[2].visible).ok()
});

test('Språk tab navigation', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice')
    .click(designerPage.spraakNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.spraakLeftMenuItems[0].visible).ok()
    .expect(designerPage.spraakLeftMenuItems[1].visible).ok()
});

test('Teste tab navigation', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice')
    .click(designerPage.testeNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.testeLeftMenuItems[0].visible).ok()
});

test('Publisere tab navigation', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/testcafe01#/aboutservice')
    .click(designerPage.publisereNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.publisereLeftMenuItems[0].visible).ok()
    .expect(designerPage.publisereLeftMenuItems[1].visible).ok()
});