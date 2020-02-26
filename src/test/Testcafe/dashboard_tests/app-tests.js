import { t, Selector } from 'testcafe';
import { AutoTestUser } from '../TestData';
import App from '../app';
import DashBoard from '../page-objects/DashboardPage';
import config from '../config.json'

let app = new App();
let dash = new DashBoard();
let environment = process.env.ENV;

fixture('Creating/Reading/Updating/Deleting App')
  .page(app.baseUrl)  
  .beforeEach(async t => {
    t.ctx.newServiceName = "testcafe04";
    t.ctx.existingService = "autotestdeploy";
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    t.ctx.ingenSkriveApper = "Vi fant ingen apper som du har skriverettigheter til";
    t.ctx.ingenLeseApper = "Vi fant ingen apper som du eksplisitt har fått leserettigheter til";
    await t
      .maximizeWindow()
      .useRole(AutoTestUser)
  })  

test('Cannot create new app, as app name already exists', async () => {
  await t
    .click(dash.newServiceButton)
    .click(dash.tjenesteEier)        
    .expect(dash.serviceOwnerList.withExactText('Testdepartementet').exists).ok()
    .click(dash.serviceOwnerList.withExactText('Testdepartementet'))
    .click(dash.appName)
    .typeText(dash.appName, t.ctx.existingService)    
    .click(dash.opprettButton)
    .expect(dash.serviceExistsDialogue.exists).ok()
});

test('Error messages when app does not exist', async () => {
  var appName = config[environment].deployApp.toString();
  appName = appName.split("/");
  appName = appName[1];
  await t
    .click(dash.serviceSearch)
    .expect(Selector('h3').withExactText(appName).exists).ok({ timeout:120000 }) //To wait until the apps are loaded
    .typeText(dash.serviceSearch, "cannotfindapp")
    .pressKey("enter")
    .expect(Selector('p').withText(t.ctx.ingenSkriveApper)).ok({ timeout:120000 })
    .expect(Selector('p').withText(t.ctx.ingenLeseApper)).ok({ timeout:120000 })
});