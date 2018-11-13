import { ClientFunction, Selector } from 'testcafe';
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
const testUser = new TestData('itryti', 'oit@brreg.no', 'test123', 'basic');
let firstRun = true;

fixture('adminster repos')
  .page(app.baseUrl)
  .before(async t => {
    app.before();
  })
  .after(async () => {
    await app.after();
  })
  .beforeEach(async t => {
    if (firstRun) {
      await common.login(testUser.userEmail, testUser.password, loginPage);
      await common.ensureUserHasNoRepos(testUser.userName, landingPage, repoPage);
      firstRun = false;
    }
  })
  .afterEach(async t => {

  });

const getPageUrl = ClientFunction(() => window.location.href);

test('Login and create new repo', async t => {
  await t
    .expect(header.navBar.exists).ok({ timeout: 2500 })
    .expect(landingPage.title.textContent).eql('Altinn studio')
    .click(landingPage.repoLink)
    .expect(common.getPageUrl()).contains('/explore/repos')
    .click(landingPage.createButton)
    .expect(landingPage.newRepoButton.visible).ok({ timeout: 2500 })
    .click(landingPage.newRepoButton)
    .expect(common.getPageUrl()).contains('repo/create')
    .typeText(repoPage.title, 'automatedTestRepo')
    .expect(repoPage.title.value).eql('automatedTestRepo')
    .click(repoPage.submitButton)
    .expect(getPageUrl()).contains(testUser.userName + '/automatedTestRepo');
});
