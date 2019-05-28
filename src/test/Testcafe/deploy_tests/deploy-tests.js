import { Selector, t } from 'testcafe';
import { axeCheck, createReport } from 'axe-testcafe';
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
const noAccessUser = new TestData('AutoTest2', 'automatedtest@email.com', 'test123', 'basic');

fixture('GUI service designer tests')
  .page(app.baseUrl)
  .beforeEach(async t => {
    //Header texts
    t.ctx.tjenesteOppdatert = "Tjenesten din er oppdatert til siste versjon";
    t.ctx.endrnigerValidert = "Endringene er validert og kan deles med andre";
    t.ctx.klarForDeploy = "Tjenesten er klar til å legges ut i testmiljø";
    t.ctx.deployFailure = "Tjenesten ble ikke lagt ut i testmiljøet";
    t.ctx.localChanges = "Du har ikke delt dine endringer med din organisasjon";
    t.ctx.noCompile = "Tjenesten din kompilerer ikke";
    t.ctx.tilgjengelig = "Tjenesten din er klar for test";
    t.ctx.ikkeTilgjengelig = "Tjenesten din er ikke tilgjengelig i testmiljø";
    t.ctx.ikkeTilgang = "Du har ikke tilgang til å legge ut tjenesten";
    t.ctx.leggerUtTjenesten = "Legger ut tjenesten i testmiljøet, det vil ta ca. 1 minutt.";
  })

test.only('Happy case; deploy a service to a test environment after a change', async() => {
  await common.login(testUser.userEmail, testUser.password, loginPage);
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/deployment#/aboutservice')
    .click(designer.lageNavigationTab)
    .maximizeWindow()
    .click(designer.hentEndringer)
    .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok()
    .click(designer.omNavigationTab) //remove pop up
    .dragToElement(designer.inputBtn, designer.dragToArea)
    .click(designer.omNavigationTab)
    .click(designer.lageNavigationTab)
    .expect(designer.delEndringer.exists).ok()
    .click(designer.delEndringer)
    .expect(designer.commitMessageBox.exists).ok()
    .click(designer.commitMessageBox)
    .typeText(designer.commitMessageBox, "Sync service automated test", { replace: true })
    .expect(designer.validerEndringer.exists).ok()
    .click(designer.validerEndringer)
    .click(designer.delEndringerBlueButton)
    .click(designer.testeNavigationTab)
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(designer.deployButton.exists).ok()
    .click(designer.deployButton)
    .expect(Selector("p").withText(t.ctx.leggerUtTjenesten).exists).ok()
    .expect(Selector("h2").withText(t.ctx.tilgjengelig).exists).ok()

})

test('Service cannot deploy due to compilation error', async() => {
  await common.login(testUser.userEmail, testUser.password, loginPage);
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/CompileError#/aboutservice')
    .maximizeWindow()
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)
    .expect(designer.ingenEndringer.exists).ok()
    .click(designer.testeNavigationTab) //click twice to remove pop up from "del"
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(designer.deployButton.getAttribute("disabled")).notOk()
    .expect(Selector("h2").withText(t.ctx.noCompile).exists).ok()
})

test('Service cannot be deployed due to local changes', async() => {
  await common.login(testUser.userEmail, testUser.password, loginPage);
  await t
  .navigateTo(app.baseUrl + 'designer/tdd/deployment#/aboutservice')
  .maximizeWindow()
  .click(designer.lageNavigationTab)
  .click(designer.hentEndringer)
  .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok()
  .click(designer.omNavigationTab) //remove pop up
  .click(designer.radioButtons)
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

test('User does not have write access to service, and cannot deploy', async() => {
  await common.login(noAccessUser.userEmail, noAccessUser.password, loginPage);
  await t
    .maximizeWindow()
    .click(dash.serviceSearch)
    .typeText(dash.serviceSearch, "manualDeployTest") // the noAccessUser login does not have access to manualDeployTest
    .click(Selector('div > button > div').withText('manualDeployTest')) //click to open the service
    .expect(designer.omTjenesteNavn.visible).ok()
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)
    .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok()
    .click(designer.testeNavigationTab) //click once to remove pop up
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(Selector("h2").withText(t.ctx.ikkeTilgang).visible).ok()
})

test('Accessibility testing for deployment to test environment page', async t => {
  await common.login(testUser.userEmail, testUser.password, loginPage); 
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/runtime#/aboutservice')
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
  const { error, violations } = await axeCheck(t);
  await t.expect(violations.length === 0).ok(createReport(violations));
});