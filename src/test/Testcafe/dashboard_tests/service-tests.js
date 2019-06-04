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
    t.ctx.deltMessage = "Du har delt dine endringer";
    t.ctx.syncMessage = "Endringene er validert";
    await t.useRole(AutoTestUser)
    //app.before()
  })
  .after(async (t) => {
    //await dash.logout();
  })

test.skip('Create a new service', async () => {
  await t
    .click(dash.newServiceButton)
    .click(dash.tjenesteNavn)
    .typeText(dash.tjenesteNavn, t.ctx.newServiceName)
    .pressKey("tab")
    .pressKey("tab")
    .click(dash.opprettButton)
});

test('Search for only my users services', async () => {
  await t
    .click(dash.serviceSearch)
    .typeText(dash.serviceSearch, "autotest")
    .pressKey("enter")
    .expect(dash.rettigheterMelding.exists).ok()
});

test.skip('filter away a users services by unselecting all bubbles', async t => {
  let serviceOwnerButtons =  await Selector("div > span");
  let count = await serviceOwnerButtons.count;
  
  for (let i = 0;i < count; i++) {
    await t.click(serviceOwnerButtons.nth(i));
  }

  await t.expect(Selector('span').withText("AutoTest").visible).ok();
  await t.expect(dash.skriveRettigheter.exists).ok({ timeout: 2500 });
});