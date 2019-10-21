import { t, ClientFunction } from 'testcafe';
import axeCheck from 'axe-testcafe';
import DesignerPage from '../page-objects/designerPage';
import HeaderPage from '../page-objects/headerPage'
import { AutoTestUser } from '../TestData';
import App from '../app';

let app = new App();
let designerPage = new DesignerPage();
let headerPage = new HeaderPage();

const getLocation = ClientFunction(() => document.location.href);

fixture('Navigating the App designer')
  .page(app.baseUrl)
  .before(async () => {
  })
  .beforeEach(async t => {
    await t
      .useRole(AutoTestUser)
      .resizeWindow(1280, 610)
      .navigateTo(app.baseUrl + 'designer/AutoTest/auto_test#/aboutservice');
  })
  .after(async () => {
  })

test('Om tab navigation', async () => {
  await t
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
    .click(designerPage.lageNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.lageLeftMenuItems[0].visible).ok()
    .expect(designerPage.lageLeftMenuItems[1].visible).ok()
    .expect(designerPage.lageLeftMenuItems[2].visible).ok()
    .expect(designerPage.lageLeftMenuItems[3].visible).ok()
    .expect(designerPage.lageLeftMenuItems[4].visible).ok()
});

test('Språk tab navigation', async () => {
  await t
    .click(designerPage.spraakNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.spraakLeftMenuItems[0].visible).ok()
    .expect(designerPage.spraakLeftMenuItems[1].visible).ok()
});

test('Teste tab navigation', async () => {
  await t
    .click(designerPage.testeNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(getLocation()).contains('test');
});

test('Publisere tab navigation', async () => {
  await t
    .click(designerPage.publisereNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(getLocation()).contains('publish');
});

test('Automated accesibility testing', async t => {
  axeCheck(t);
});

test('Open Gitea repository Navigation', async () => {
  await t
    .hover(headerPage.userMenu)
    .click(headerPage.userMenu)
    .expect(headerPage.openGiteaRepo.exists).ok()
    .click(headerPage.openGiteaRepo)
    .switchToMainWindow()
    .expect(getLocation()).contains('repos/AutoTest/auto_test');
});