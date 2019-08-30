import { Selector, t } from 'testcafe';
import axeCheck from 'axe-testcafe';
import App from '../app';
import DashBoard from '../page-objects/DashboardPage';
import { AutoTestUser, NoDeployUser } from '../TestData';
import DesignerPage from '../page-objects/designerPage';

let app = new App();
let dash = new DashBoard();
let designer = new DesignerPage();

fixture('Deploy of app to a test environment tests')
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
    await t
      .useRole(AutoTestUser)
      .resizeWindow(1536, 864)
  });

test('Happy case; deploy an app to a test environment after a change', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/servicedeploy#/uieditor')
  await designer.deleteUIComponentsMethod(t);
  await t   
    .click(designer.hentEndringer)
    .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok({ timeout: 120000 })
    .click(designer.omNavigationTab) //remove pop up
    .dragToElement(designer.inputComponent, designer.dragToArea)
  await t.eval(() => location.reload(true))
  await t
    .expect(designer.delEndringer.exists).ok({ timeout: 120000 })
    .click(designer.delEndringer)
    .expect(designer.commitMessageBox.exists).ok()
    .click(designer.commitMessageBox)
    .typeText(designer.commitMessageBox, "Sync service automated test", { replace: true })
    .expect(designer.validerEndringer.exists).ok()
    .click(designer.validerEndringer)
    .expect(designer.delEndringerBlueButton.exists).ok({ timeout: 10000 })
    .click(designer.delEndringerBlueButton)
    .click(designer.testeNavigationTab)
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(designer.deployButton.exists).ok()
    .click(designer.deployButton)
    .expect(Selector("p").withText(t.ctx.leggerUtTjenesten).exists).ok()
    .expect(Selector("h2").withText(t.ctx.tilgjengelig).exists).ok({ timeout: 120000 })
});

test('App cannot deploy due to compilation error', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/CompileError#/uieditor')    
    .click(designer.hentEndringer)
    .expect(designer.ingenEndringer.exists).ok({ timeout: 120000 })
    .click(designer.testeNavigationTab) //click twice to remove pop up from "del"
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(designer.deployButton.getAttribute("disabled")).notOk()
    .expect(Selector("h2").withText(t.ctx.noCompile).exists).ok()
});

test('App cannot be deployed due to local changes', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/deploymentservice#/aboutservice')
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)
    .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok()
    .click(designer.omNavigationTab) //remove pop up
    .dragToElement(designer.radioButtonComponent, designer.dragToArea)
  await t.eval(() => location.reload(true))
  await t
    .expect(designer.delEndringer.exists).ok({ timeout: 120000 })
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
    .expect(designer.delEndringerBlueButton.exists).ok({ timeout: 120000 })
    .click(designer.delEndringerBlueButton)
  await t.eval(() => location.reload(true));
  await t
    .expect((Selector("h2").withText(t.ctx.klarForDeploy)).exists).ok({ timeout: 120000 })
});

test('User does not have write access to app, and cannot deploy', async () => {
  await t
    .useRole(NoDeployUser)
    .click(dash.serviceSearch)
    .typeText(dash.serviceSearch, "manualDeployTest") // the noAccessUser login does not have access to manualDeployTest
    .click(Selector('div > button > div').withText('manualDeployTest')) //click to open the service
    .expect(designer.omTjenesteNavn.visible).ok()
    .click(designer.lageNavigationTab)
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
    .expect(Selector("h2").withText(t.ctx.ikkeTilgang).visible).ok()
});

test('Accessibility testing for deployment to test environment page', async t => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/deployment#/deploytotest')
    .click(designer.testeNavigationTab)
    .hover(designer.leftDrawerMenu)
    .click(designer.testeLeftMenuItems[1])
  axeCheck(t);
});

test('Clone modal functionality', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/tdd/deploymentservice#/aboutservice')
    .expect(designer.cloneButton.exists).ok({ timeout: 5000 })
    .hover(designer.cloneButton)
    .click(designer.cloneButton)
    .expect(designer.readMoreAltinnDocs.exists).ok()
    .expect(designer.copyUrlRepoButton.exists).ok()
    .click(designer.copyUrlRepoButton)
});

test('Validation of missing datamodel in clone modal', async () => {
  await t
    .navigateTo(app.baseUrl + 'designer/AutoTest/withoutdatamodel#/uieditor')
    .expect(designer.cloneButton.exists).ok({ timeout: 5000 })
    .hover(designer.cloneButton)
    .click(designer.cloneButton)
    .expect(designer.dataModellLink.exists).ok()
    .click(designer.dataModellLink)
});