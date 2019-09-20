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
    t.ctx.existingService = "formfill";
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await t
      .useRole(AutoTestUser)
      .resizeWindow(1280, 610)
  })
  .after(async (t) => {
    //await dash.logout();
  })

test('Cannot create new app, as app name already exists', async () => {
  await t
    .click(dash.newServiceButton)
    .click(dash.tjenesteEier)        
    .expect(dash.serviceOwnerList.withText('Testdepartementet').exists).ok()
    .click(dash.serviceOwnerList.withText('Testdepartementet'))
    .click(dash.tjenesteNavn)
    .typeText(dash.tjenesteNavn, t.ctx.existingService)
    .pressKey("tab")
    .pressKey("tab")
    .click(dash.opprettButton)
    .expect(dash.serviceExistsDialogue.exists).ok()
});

test('Search for only my users app', async () => {
  await t
    .click(dash.serviceSearch)
    .typeText(dash.serviceSearch, "autotest")
    .pressKey("enter")
    .expect(dash.rettigheterMelding.exists).ok()
});