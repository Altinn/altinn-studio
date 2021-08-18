import { t, ClientFunction, Selector } from 'testcafe';
import DesignerPage from '../page-objects/designerPage';
import HeaderPage from '../page-objects/headerPage';
import { AutoTestUser } from '../TestData';
import config from '../config.json';
import App from '../app';

let app = new App();
let designerPage = new DesignerPage();
let headerPage = new HeaderPage();
let environment = process.env.ENV.toLowerCase();
let appName = config[environment].deployApp;

const getLocation = ClientFunction(() => document.location.href);

fixture.only('Navigating the App designer')
  .page(app.baseUrl)
  .beforeEach(async (t) => {
    t.ctx.at22 = 'AT22-miljøet';
    t.ctx.at23 = 'AT23-miljøet';
    t.ctx.tt = 'TT02-miljøet';
    await t
      .maximizeWindow()
      .useRole(AutoTestUser)
      .navigateTo(app.baseUrl + 'designer/' + appName + '#/about');
  });

//Test to navigate to about page and verify the links
test('Om tab navigation', async () => {
  await t
    .click(designerPage.aboutNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.aboutLeftMenuItems[0].visible)
    .ok();
});

//Test to navigate to Develop page and verify the links
test('Lage tab navigation', async () => {
  await t
    .click(designerPage.createNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.createLeftMenuItems[0].visible)
    .ok()
    .expect(designerPage.createLeftMenuItems[1].visible)
    .ok()
    .expect(designerPage.createLeftMenuItems[2].visible)
    .ok();
});

//Test to navigate to Language page and verify the links
test('Språk tab navigation', async () => {
  await t
    .click(designerPage.languageNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.languageLeftMenuItems[0].visible)
    .ok();
});

//Test to navigate to deploy page and verify the links
test('Deploy tab navigation', async () => {
  await t
    .click(designerPage.deployNavigationTab)
    .expect(getLocation())
    .contains('deploy')
    .expect(Selector('p').withText(t.ctx.at22).visible)
    .ok()
    .expect(Selector('p').withText(t.ctx.at23).visible)
    .ok()
    .expect(Selector('p').withText(t.ctx.tt).visible)
    .ok();
});

//Test to navigate to gitea repo page from studio designer
test('Open Gitea repository Navigation', async () => {
  await t
    .hover(headerPage.userMenu)
    .click(headerPage.userMenu)
    .expect(headerPage.openGiteaRepo.exists)
    .ok()
    .click(headerPage.openGiteaRepo)
    .switchToMainWindow()
    .expect(getLocation())
    .contains('repos/' + appName);
});
