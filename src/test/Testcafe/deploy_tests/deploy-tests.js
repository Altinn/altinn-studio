import { t } from 'testcafe';
import config from '../config.json';
import App from '../app';
import { AutoTestUser, NoDeployUser } from '../TestData';
import DesignerPage from '../page-objects/designerPage';

let app = new App();
let designer = new DesignerPage();
let environment = process.env.ENV.toLowerCase();
const deployApp = config[environment].deployApp;
const compilerErrorApp = config[environment].compilerErrorApp;

fixture('Deploy of app to a test environment tests')
  .page(app.baseUrl)
  .beforeEach(async (t) => {
    await t.maximizeWindow();
  });

test('Happy case; build and deploy an app after a change', async () => {
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/' + deployApp + '#/ui-editor')
    .click(designer.pullChanges)
    .click(designer.aboutNavigationTab); //remove pop up
  await designer.deleteUIComponentsMethod(t);
  await t.dragToElement(designer.inputComponent, designer.dragToArea);
  await t.eval(() => location.reload());
  await designer.pushAndCommitChanges(t);
  await t
    .click(designer.deployNavigationTab)
    .click(designer.deployNavigationTab) //click twice to remove git push success pop-up
    .click(designer.deployVersionDropDown)
    .expect(designer.deployVersionOptions.visible)
    .ok()
    .wait(5000);

  var newBuildVersion = Number(await designer.getlatestBuildVersion(t)) + 1; //assumes integer as last built version and adds 1
  var today = new Date();
  var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  var time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
  var dateTime = date + ' ' + time;
  var nAvailableVersions = await designer.deployVersionOptions.child().count;

  await t
    .typeText(designer.versionNumber, newBuildVersion.toString())
    .typeText(designer.versionDescription, 'Autotest build ' + dateTime.toString(), { replace: true })
    .click(designer.buildButton)
    .wait(5000);

  await t
    .expect(designer.latestBuildStatusInprogress.exists)
    .ok({ timeout: 300000 })
    .expect(designer.latestBuildStatusSuccess.exists)
    .ok({ timeout: 300000 })
    .click(designer.deployVersionDropDown)
    .expect(designer.deployVersionDropDown.child(0).innerText)
    .contains(newBuildVersion.toString(), 'Fail', { timeout: 300000 })
    .expect(designer.deployVersionOptions.child().count)
    .eql(nAvailableVersions + 1)
    .click(designer.deployVersionOptions.child(0))
    .click(designer.deployButton)
    .expect(designer.deployConfirm.visible)
    .ok()
    .click(designer.deployConfirm)
    .expect(designer.deployStatus.visible)
    .ok({ timeout: 300000 })
    .expect(designer.deployTable.visible)
    .ok({ timeout: 300000 })
    .expect(designer.deployTable.innerText)
    .contains(newBuildVersion.toString(), 'Fail', { timeout: 400000 }); //deploy succeeded
});

test('App cannot build due to compilation error', async () => {
  var buildVersion = '0.0.3';
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/' + compilerErrorApp + '#/ui-editor')
    .click(designer.pullChanges);
  await t.eval(() => location.reload());
  await designer.deleteUIComponentsMethod(t);
  await t.dragToElement(designer.inputComponent, designer.dragToArea);
  await designer.pushAndCommitChanges(t);
  await t
    .click(designer.deployNavigationTab) //click twice to remove pop up from "del"
    .click(designer.deployNavigationTab)
    .typeText(designer.versionNumber, buildVersion)
    .typeText(designer.versionDescription, 'Testcafe compilation error build', { replace: true })
    .expect(designer.buildButton.exists)
    .ok({ timeout: 60000 })
    .click(designer.buildButton)
    .wait(5000);
  await t
    .expect(designer.latestBuildStatusInprogress.exists)
    .ok({ timeout: 60000 })
    .expect(designer.latestBuildStatusFailure.exists)
    .ok({ timeout: 300000 })
    .click(designer.deployVersionDropDown);
  var lastbuildVersion = await designer.getlatestBuildVersion(t);
  await t.expect(lastbuildVersion).notEql(buildVersion);
});

test('App cannot be built due to uncommited local changes', async () => {
  await t
    .useRole(AutoTestUser)
    .navigateTo(app.baseUrl + 'designer/' + deployApp + '#/about')
    .click(designer.createNavigationTab)
    .click(designer.pullChanges)
    .click(designer.aboutNavigationTab); //remove pop up
  await designer.deleteUIComponentsMethod(t);
  await t.dragToElement(designer.radioButtonComponent, designer.dragToArea);
  await t.eval(() => location.reload());
  await t
    .expect(designer.pushChanges.exists)
    .ok({ timeout: 120000 })
    .click(designer.deployNavigationTab)
    .expect(designer.buildButton.exists)
    .notOk();
});

test('User without access to deploy team cannot deploy', async () => {
  await t
    .useRole(NoDeployUser)
    .navigateTo(app.baseUrl + 'designer/' + deployApp + '#/about')
    .click(designer.deployNavigationTab);
  await t.expect(designer.noDeployAccess.exists).ok();
});
