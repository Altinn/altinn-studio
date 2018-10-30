import { Selector } from 'testcafe';
import App from '../app';
import loginPage from '../page-objects/loginPage';
import landingPage from '../page-objects/landingPage';
import CommonPage from '../page-objects/common'

app = new App();
common = new CommonPage();
landingpage = new landingPage();

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
    .expect(loginpage.altinnHeader.exists).ok({ timeout: 2500 })
    .expect(loginpage.altinnHeader.text).eql('Altinn studio')
    .click(landingpage.repoLink)
    .click(landingpage.createButton)
    .click(landingpage.newRepoButton);
});