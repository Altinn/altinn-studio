import { Selector } from 'testcafe';
import App from '../app';
import LoginPage from '../page-objects/loginPage';
import LandingPage from '../page-objects/landingPage';
import CommonPage from '../page-objects/common'

let app = new App();
let common = new CommonPage();
let loginPage = new LoginPage();
let landingPage = new LandingPage();

fixture('Loggin in')
  .page(app.baseUrl)
  .before(async () => {
    app.before();
    //more init code
  })
  .after(async () => {
    await app.after();
  })
  .beforeEach(async t => {
    await common.login(app.username, app.password, app.landingPage);
  })
  .afterEach(async t => {
    await common.logout();
  });

test('Login and create new repo', async t => {
  await t
    .expect(loginPage.altinnHeader.exists).ok({ timeout: 2500 })
    .expect(loginPage.altinnHeader.text).eql('Altinn studio')
    .click(landingPage.repoLink)
    .click(landingPage.createButton)
    .click(landingPage.newRepoButton);
});