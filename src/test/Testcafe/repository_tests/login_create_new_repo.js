import { ClientFunction } from 'testcafe';
import App from '../app';
import LandingPage from '../page-objects/landingPage';
import CommonPage from '../page-objects/common';
import HeaderPage from '../page-objects/headerPage';
import RepoPage from '../page-objects/repoPage';
import { AutoTestUser } from '../TestData';

let app = new App();
let common = new CommonPage();
let landingPage = new LandingPage();
let header = new HeaderPage();
let repoPage = new RepoPage();
let firstRun = true;

fixture('adminster repos')
  .page(app.baseUrl)
  .before(async (t) => {
    app.before();
  })
  .after(async () => {
    await app.after();
  })
  .beforeEach(async (t) => {
    if (firstRun) {
      await t.useRole(AutoTestUser);
      await common.ensureUserHasNoRepos(testUser.userName, landingPage, repoPage);
      firstRun = false;
    }
  })
  .afterEach(async (t) => {
    common.returnToHomePage();
  });

const getPageUrl = ClientFunction(() => window.location.href);

test.skip('Login and create new repo', async (t) => {
  await t
    .expect(header.navBar.exists)
    .ok({ timeout: 2500 })
    .expect(landingPage.title.textContent)
    .eql('Altinn studio')
    .click(landingPage.repoLink)
    .expect(common.getPageUrl())
    .contains('/explore/repos')
    .click(landingPage.createButton)
    .expect(landingPage.newRepoButton.visible)
    .ok({ timeout: 2500 })
    .click(landingPage.newRepoButton)
    .expect(common.getPageUrl())
    .contains('repo/create')
    .typeText(repoPage.title, 'automatedTestRepo')
    .expect(repoPage.title.value)
    .eql('automatedTestRepo')
    .click(repoPage.submitButton)
    .expect(getPageUrl())
    .contains(testUser.userName + '/automatedTestRepo');
});
