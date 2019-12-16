import { t, ClientFunction, Selector } from 'testcafe';
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
    t.ctx.at21 = "AT21-miljøet";
    t.ctx.at22 = "AT22-miljøet";
    t.ctx.at23 = "AT23-miljøet";
    t.ctx.tt = "TT-miljøet";
    await t
      .maximizeWindow()
      .useRole(AutoTestUser)
      .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/about');
  })
  .after(async () => {
  })

test('Om tab navigation', async () => {
  await t
    .click(designerPage.omNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.omLeftMenuItems[0].visible).ok()
});

test('Lage tab navigation', async () => {
  await t
    .click(designerPage.lageNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.lageLeftMenuItems[0].visible).ok()
    .expect(designerPage.lageLeftMenuItems[1].visible).ok()
    .expect(designerPage.lageLeftMenuItems[2].visible).ok()
});

test('Språk tab navigation', async () => {
  await t
    .click(designerPage.spraakNavigationTab)
    .hover(designerPage.leftDrawerMenu)
    .expect(designerPage.spraakLeftMenuItems[0].visible).ok()
});

test('Deploy tab navigation', async () => {
  await t
    .click(designerPage.deployNavigationTab)
    .expect(getLocation()).contains('deploy')
    .expect(Selector('p').withText(t.ctx.at21).visible).ok()
    .expect(Selector('p').withText(t.ctx.at22).visible).ok()
    .expect(Selector('p').withText(t.ctx.at23).visible).ok()
    .expect(Selector('p').withText(t.ctx.tt).visible).ok();
});

test('Open Gitea repository Navigation', async () => {
  await t
    .hover(headerPage.userMenu)
    .click(headerPage.userMenu)
    .expect(headerPage.openGiteaRepo.exists).ok()
    .click(headerPage.openGiteaRepo)
    .switchToMainWindow()
    .expect(getLocation()).contains('repos/ttd/autodeploy');
});
