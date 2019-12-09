import { t, Selector } from 'testcafe';
import { AutoTestUser } from '../TestData';
import App from '../app';
import DashBoard from '../page-objects/DashboardPage';

let app = new App();
let dash = new DashBoard();

fixture('Creating/Reading/Updating/Deleting services')
  .page(app.baseUrl)
  .before(async t => {
    //app.before()
  })
  .beforeEach(async t => {
    t.ctx.newServiceName = "testcafe04";
    t.ctx.existingService = "autotestdeploy";
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await t
      .useRole(AutoTestUser)
      .maximizeWindow()
  })
  .after(async (t) => {
    //await dash.logout();
  })

test('Cannot create new app, as app name already exists', async () => {
  await t
    .click(dash.newServiceButton)
    .click(dash.tjenesteEier)        
    .expect(dash.serviceOwnerList.withExactText('Testdepartementet').exists).ok()
    .click(dash.serviceOwnerList.withExactText('Testdepartementet'))
    .click(dash.tjenesteNavn)
    .typeText(dash.tjenesteNavn, t.ctx.existingService)
    .pressKey("tab")
    .pressKey("tab")
    .click(dash.opprettButton)
    .expect(dash.serviceExistsDialogue.exists).ok()
});

test('Error messages when app does not exist', async () => {
  await t
    .click(dash.serviceSearch)
    .expect(Selector('h3').withExactText('servicedeploy').exists).ok({ timeout:120000 }) //To wait until the apps are loaded
    .typeText(dash.serviceSearch, "cannotfindapp")
    .pressKey("enter")
    .expect(dash.skriveRettigheter.exists).ok({ timeout:120000 })
    .expect(dash.rettigheterMelding.exists).ok({ timeout:120000 })
});