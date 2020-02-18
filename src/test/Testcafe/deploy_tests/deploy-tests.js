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
    t.ctx.tjenesteOppdatert = "Appen din er oppdatert til siste versjon";
    t.ctx.endrnigerValidert = "Endringene er validert og kan deles med andre";
    t.ctx.klarForDeploy = "Appen er klar til å legges ut i testmiljø";
    t.ctx.deployFailure = "Appen ble ikke lagt ut i testmiljøet";
    t.ctx.localChanges = "Du har ikke delt dine endringer med din organisasjon";
    t.ctx.noCompile = "Appen din kompilerer ikke";
    t.ctx.tilgjengelig = "Appen din er klar for test";
    t.ctx.ikkeTilgjengelig = "Appen din er ikke tilgjengelig i testmiljø";
    t.ctx.ikkeTilgang = "Du har ikke tilgang til å legge ut tjenesten";
    await t
      .maximizeWindow()
  });

  test('Happy case; build and deploy an app after a change', async () => {
    await t
      .useRole(AutoTestUser)
      .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/ui-editor')
      .click(designer.hentEndringer)      
      .click(designer.omNavigationTab); //remove pop up
    await designer.deleteUIComponentsMethod(t);
    await t
      .dragToElement(designer.inputComponent, designer.dragToArea);
    await t.eval(() => location.reload(true));
    await designer.pushAndCommitChanges(t);
    await t      
      .click(designer.deployNavigationTab)
      .click(designer.deployNavigationTab) //click twice to remove git push success pop-up
      .click(designer.deployVersionDropDown)
      .expect(designer.deployVersionOptions.visible).ok();

    var newBuildVersion = Number(await designer.getlatestBuildVersion(t)) + 1; //assumes integer as last built version    
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    var nAvailableVersions = await designer.deployVersionOptions.child().count;

    await t
      .typeText(designer.versionNumber, newBuildVersion.toString())
      .typeText(designer.versionDescription, "Autotest build " + dateTime.toString(), {replace: true})
      .click(designer.buildButton);   

    await t
      .click(designer.deployVersionDropDown)
      .expect(designer.deployVersionDropDown.child(0).innerText).contains(newBuildVersion.toString(),"Fail",{timeout: 300000})
      .expect(designer.deployVersionOptions.child().count).eql(nAvailableVersions + 1)
      .click (designer.deployVersionOptions.child(0))
      .click(designer.deployButtonAt23)
      .expect(designer.deployConfirm.visible).ok()
      .click(designer.deployConfirm)
      .expect(designer.deployStatus.visible).ok({timeout: 60000})
      .expect(designer.at23DeployTable.visible).ok({timeout: 300000})
      .expect(designer.at23DeployTable.innerText).contains(newBuildVersion.toString(),"Fail",{timeout: 300000}); //deploy succeeded
});

test('App cannot build due to compilation error', async () => {
  var buildVersion = '0.0.3';
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/ttd/compileerror1219#/ui-editor')
    .click(designer.hentEndringer);    
  await t.eval(() => location.reload(true)); 
  await designer.deleteUIComponentsMethod(t);
  await t
    .dragToElement(designer.inputComponent, designer.dragToArea)
  await designer.pushAndCommitChanges(t);
  await t
    .click(designer.deployNavigationTab) //click twice to remove pop up from "del"
    .click(designer.deployNavigationTab)
    .typeText(designer.versionNumber, buildVersion)
    .typeText(designer.versionDescription, "Testcafe compilation error build", {replace: true})
    .expect(designer.buildButton.exists).ok({timeout: 120000})
    .click(designer.buildButton)    
    .click(designer.deployVersionDropDown);
  var lastbuildVersion = await designer.getlatestBuildVersion(t);
  await t
    .expect(lastbuildVersion).notEql(buildVersion);  
});

test('App cannot be built due to uncommited local changes', async () => {
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/about')
    .click(designer.lageNavigationTab)
    .click(designer.hentEndringer)    
    .click(designer.omNavigationTab); //remove pop up
  await designer.deleteUIComponentsMethod(t);
  await t
    .dragToElement(designer.radioButtonComponent, designer.dragToArea)
  await t.eval(() => location.reload(true));
  await t
    .expect(designer.delEndringer.exists).ok({ timeout: 120000 })
    .click(designer.deployNavigationTab)
    .expect(designer.buildButton.exists).notOk();
});

test('User does not have write access to app, and cannot deploy', async () => {
  await t
    .useRole(NoDeployUser)
    .navigateTo(app.baseUrl + 'designer/ttd/autodeploy#/about')
    .click(designer.deployNavigationTab)
    .expect(designer.deployVersionDropDown.visible).ok()
    .click(designer.deployVersionDropDown)
    .click(designer.deployVersionOptions.child(0))
    .click(designer.deployButtonAt23)
    .expect(designer.deployConfirm.visible).ok()
    .click(designer.deployConfirm)
    .expect(Selector('div').withText('Teknisk feilkode 403').visible).ok({timeout: 60000});
});
