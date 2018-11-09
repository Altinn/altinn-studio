import { ClientFunction } from 'testcafe';
import App from '../app';
import LoginPage from '../page-objects/loginPage';
import LandingPage from '../page-objects/landingPage';
import CommonPage from '../page-objects/common';
import HeaderPage from '../page-objects/headerPage';
import RepoPage from '../page-objects/repoPage';
import TestData from '../TestData';

let app = new App();
let common = new CommonPage();
let loginPage = new LoginPage();
let landingPage = new LandingPage();
let header = new HeaderPage();
let repoPage = new RepoPage();
const userTrym = new TestData('trymen', 'extten@brreg.no', 'Cumulus212', 'basic');

fixture('Logging in')
  .page(app.baseUrl)
  .before(async () => {
    app.before();
    //more init code
  })
  .after(async () => {
    await app.after();
  })
  .beforeEach(async t => {
    await common.login(userTrym.userEmail, userTrym.password, loginPage);
  })
  .afterEach(async t => {
    await common.logout(header);
  });

const getPageUrl = ClientFunction(() => window.location.href);

test('Login and create new repo', async t => {
  await t
    .expect(header.navBar.exists).ok({ timeout: 2500 })
    .expect(landingPage.title.textContent).eql('Altinn studio')
    .click(landingPage.repoLink)
    .expect(getPageUrl()).contains('/explore/repos')
    .click(landingPage.createButton)
    .expect(landingPage.newRepoButton.visible).ok({ timeout: 2500 })
    .click(landingPage.newRepoButton)
    .expect(getPageUrl()).contains('repo/create')
    .typeText(repoPage.title, 'automatedTestRepo')
    .expect(repoPage.title.value).eql('automatedTestRepo')
    .click(repoPage.submitButton)
    .expect(getPageUrl()).contains(userTrym.userName + '/automatedTestRepo');
});