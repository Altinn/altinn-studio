import { t, Selector } from 'testcafe';
import { AutoTestUser } from '../TestData';
import App from '../app';
import DashBoard from '../page-objects/dashboardPage';
import config from '../config.json';

let app = new App();
let dash = new DashBoard();
let environment = process.env.ENV.toLowerCase();

fixture('Dashboard tests')
  .page(app.baseUrl)
  .beforeEach(async (t) => {
    t.ctx.existingApp = 'autotestdeploy';
    t.ctx.ingenSkriveApper = 'Vi fant ingen apper som du har skriverettigheter til';
    t.ctx.ingenLeseApper = 'Vi fant ingen apper som du eksplisitt har fått leserettigheter til';
    await t.maximizeWindow().useRole(AutoTestUser);
  });

test('Cannot create new app, as app name already exists', async () => {
  await t
    .click(dash.newAppButton)
    .click(dash.appOwner)
    .expect(dash.appOwnerList.withExactText('Testdepartementet').exists)
    .ok()
    .click(dash.appOwnerList.withExactText('Testdepartementet'))
    .click(dash.appName)
    .typeText(dash.appName, t.ctx.existingApp)
    .click(dash.createAppButton)
    .expect(dash.appExistsDialogue.exists)
    .ok();
});

test('Error messages when app does not exist', async () => {
  var appName = config[environment].deployApp.toString();
  appName = appName.split('/');
  appName = appName[1];
  await t
    .expect(dash.appsList.child('div').count)
    .gte(1, 'Apps not loaded', { timeout: 60000 }) //To wait until the apps are loaded
    .click(dash.appSearch)
    .typeText(dash.appSearch, 'cannotfindapp')
    .pressKey('enter')
    .expect(Selector('p').withText(t.ctx.ingenSkriveApper).exists)
    .ok()
    .expect(Selector('p').withText(t.ctx.ingenLeseApper).exists)
    .ok();
});
