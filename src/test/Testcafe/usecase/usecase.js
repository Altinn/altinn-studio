import { t, ClientFunction, Selector, RequestLogger } from 'testcafe';
import DesignerPage from '../page-objects/designerPage';
import { UseCaseUser } from '../TestData';
import config from '../config.json';
import App from '../app';

let app = new App();
let designerPage = new DesignerPage();
let environment = process.env.ENV.toLowerCase();
let appName = config[environment].deployApp;
const pullRepo = RequestLogger(/.*designerapi\/Repository\/Pull.*/);
const resetRepo = RequestLogger(/.*designerapi\/Repository\/ResetLocalRepository.*/);

const getLocation = ClientFunction(() => document.location.href);

fixture('Bruksmønster')
  .page(app.baseUrl)
  .beforeEach(async (t) => {
    await t
      .useRole(UseCaseUser)
      .maximizeWindow()
      .navigateTo(app.baseUrl + 'designer/' + appName + '#/about');
  });

//Navigate around studio designer
test('Navigation', async () => {
  await t
    .click(designerPage.aboutNavigationTab)
    .expect(designerPage.appNameLocked.value)
    .contains('auto', 'input contains text ' + appName);
  await t.click(designerPage.createNavigationTab).expect(designerPage.inputComponent.exists).ok();
  await t
    .click(designerPage.languageNavigationTab)
    .switchToIframe('iframe')
    .expect(designerPage.languageTabs.visible)
    .ok();
});

//Gitea connection
test('Gitea connection - Pull changes', async () => {
  await t.addRequestHooks(pullRepo).click(designerPage.pullChanges);
  if (pullRepo.requests[0].response.statusCode != 200) {
    await t.eval(() => location.reload());
    await t
      .expect(designerPage.deleteLocalChanges.exists)
      .ok()
      .click(designerPage.deleteLocalChanges)
      .expect(designerPage.deleteAppRepoName.exists)
      .ok()
      .typeText(designerPage.deleteAppRepoName, appName.split('/')[1], {
        replace: true,
      })
      .addRequestHooks(resetRepo)
      .expect(designerPage.confirmDeleteLocalChanges.exists)
      .ok()
      .click(designerPage.confirmDeleteLocalChanges)
      .expect(resetRepo.contains((r) => r.response.statusCode === 200))
      .ok()
      .wait(5000)
      .click(designerPage.pullChanges)
      .expect(pullRepo.contains((r) => r.response.statusCode === 200))
      .ok();
  }
  await t.expect(Selector('h3').withText('Appen din er oppdatert til siste versjon').visible).ok();
});

//App builds and deploy information from cosmos
test('App builds and deploys', async () => {
  await t
    .click(designerPage.deployNavigationTab)
    .expect(getLocation())
    .contains('deploy')
    .expect(designerPage.appBuilds.child().count)
    .gte(1);
  await t.expect(designerPage.deployTable.visible).ok().expect(designerPage.deploys.count).gte(1);
});
