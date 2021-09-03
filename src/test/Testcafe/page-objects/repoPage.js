import { Selector, t, ClientFunction } from 'testcafe';
import { createJsxSelfClosingElement } from 'typescript';

export default class RepoPage {
  constructor() {
    this.title = Selector('#repo_name');
    this.submitButton = Selector('.ui.green.button');
    this.repoItem = Selector('.ui.repository.list .item .ui.header .name');
    this.settingsTab = Selector('.right.menu a.item[href$="/settings"]').nth(1);
    this.deleteThisRepoButton = Selector('.ui.basic.red.show-modal.button').withText('Delete This Repository');
    this.confirmDeleteThisRepoButton = Selector('.ui.small.modal.transition.visible.active .ui.red.button');
    this.titleForDeletion = Selector('.modal.active input[name="repo_name"]');
    this.backToLandingPageButton = Selector('.ui.mini.image');
  }

  async deleteRepository(repo, repoName) {
    await t
      .click(repo)
      .expect(Selector('#repo-clone-url').exists)
      .ok({ timeout: 2500 })
      .expect(this.settingsTab.exists)
      .ok({ timeout: 2500 })
      .click(this.settingsTab)
      .expect(this.deleteThisRepoButton.exists)
      .ok({ timeout: 2500 })
      .click(this.deleteThisRepoButton)
      .expect(this.titleForDeletion.exists)
      .ok({ timeout: 2500 })
      .typeText(this.titleForDeletion, repoName.split(/\s*\/\s*/).pop())
      .expect(this.confirmDeleteThisRepoButton.exists)
      .ok({ timeout: 2500 })
      .click(this.confirmDeleteThisRepoButton);
  }

  async ensureUserHasNoRepos(user, landingPage) {
    var repos = await Selector('.ui.repository.list').find('a[href^="/' + user + '"]');
    var count = await repos().count;
    console.log('Found ' + count + ' repos:');
    while ((await repos().count) > 0) {
      console.log('repos().count: ', await repos().count);
      var repo = await repos().nth(0);
      console.log('repo().textContent: ', await repo().textContent);
      await this.deleteRepository(repo, await repo().textContent);
      await t.expect(landingPage.title.exists).ok({ timeout: 2500 }).click(landingPage.repoLink);
    }
    console.log('repos().count: ', await repos().count);
    await t.click(this.backToLandingPageButton);
  }
}
