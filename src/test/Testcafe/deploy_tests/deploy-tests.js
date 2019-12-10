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
      .maximizeWindow()
  });

  test('Happy case; build and deploy an app after a change', async () => {
    await t
      .useRole(AutoTestUser)
      .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/uieditor')
      .click(designer.hentEndringer)
      .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok({ timeout: 180000 })
      .click(designer.omNavigationTab); //remove pop up
    await designer.deleteUIComponentsMethod(t);
    await t   
      .dragToElement(designer.inputComponent, designer.dragToArea);
    await t.eval(() => location.reload(true));
    await t
      .expect(designer.delEndringer.exists).ok({ timeout: 180000 })
      .click(designer.delEndringer)
      .expect(designer.commitMessageBox.exists).ok({ timeout: 60000 })
      .click(designer.commitMessageBox)
      .typeText(designer.commitMessageBox, "Sync service automated test", { replace: true })
      .expect(designer.validerEndringer.exists).ok({ timeout: 60000 })
      .click(designer.validerEndringer)
      .expect(designer.delEndringerBlueButton.exists).ok({ timeout: 180000 })
      .click(designer.delEndringerBlueButton)
      .expect(designer.ingenEndringer.exists).ok()
      .click(designer.deployNavigationTab) 
      .click(designer.deployNavigationTab) //click twice to remove git push success pop-up
      .click(designer.deployVersionDropDown)
      .expect(designer.deployVersionOptions.visible).ok();

    var lastBuildVersion = await designer.deployVersionOptions.child(0).innerText; //first element of the dropdown list
    lastBuildVersion = lastBuildVersion.split(" ");
    var newBuildVersion = Number(lastBuildVersion[1]) + 1; //assumes integer as last built version
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    var nAvailableVersions = await designer.deployVersionOptions.child().count;

    await t
      .typeText(designer.versionNumber, newBuildVersion.toString())
      .typeText(designer.versionDescription, "Autotest build " + dateTime.toString(), {replace: true})
      .click(designer.buildButton)
    
    await t
      .click(designer.deployVersionDropDown)
      .expect(designer.deployVersionDropDown.child(0).innerText).contains(newBuildVersion.toString(),{timeout: 300000})
      .expect(designer.deployVersionOptions.child().count).eql(nAvailableVersions + 1)
      .click (designer.deployVersionOptions.child(0))
      .click(designer.deployButton)
      .expect(designer.deployConfirm.visible).ok()
      .click(designer.deployConfirm)
      .expect(designer.deployStatus.visible).ok({timeout: 60000})
      .expect(designer.at21DeployTable.innerText).contains(newBuildVersion.toString(),{timeout: 300000}); //deploy succeeded
});

test('App cannot build due to compilation error', async () => {
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/ttd/compileerror1219#/uieditor')    
    .click(designer.hentEndringer)
    .expect(designer.ingenEndringer.exists).ok({timeout: 120000})
    .click(designer.deployNavigationTab) //click twice to remove pop up from "del"
    .click(designer.deployNavigationTab)
    .typeText(designer.versionNumber, '0.0.1')
    .typeText(designer.versionDescription, "Testcafe compilation error build", {replace: true})
    .click(designer.buildButton)
    .expect(designer.buildButton.exists).ok({timeout: 120000})
    .click(designer.deployVersionDropDown)
    .expect(designer.noDeployVersionAvailable.visible).ok();

});

test('App cannot be built due to uncommited local changes', async () => {
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/aboutservice')
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)
    .expect(Selector("h3").withText(t.ctx.tjenesteOppdatert).exists).ok({ timeout: 120000 })
    .click(designer.omNavigationTab) //remove pop up
    .dragToElement(designer.radioButtonComponent, designer.dragToArea)
  await t.eval(() => location.reload(true))
  await t
    .expect(designer.delEndringer.exists).ok({ timeout: 120000 })
    .click(designer.deployNavigationTab)
    .expect(designer.buildButton.exists).notOk()
});

test('User does not have write access to app, and cannot deploy', async () => {
  await t
    .useRole(NoDeployUser)
    .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/aboutservice')
    .click(designer.deployNavigationTab)
    .expect(designer.deployVersionDropDown.visible).ok()
    .click(designer.deployVersionDropDown)
    .click(designer.deployVersionOptions.child(0))
    .click(designer.deployButton)
    .expect(designer.deployConfirm.visible).ok()
    .click(designer.deployConfirm)
    .expect(Selector('div').withText('Teknisk feilkode 403').visible).ok({timeout: 60000});
});