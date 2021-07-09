import { Selector, t } from 'testcafe';

export default class LandingPage {
  constructor() {
    this.title = Selector('.container .text-center .my-5.hidden-xs-down span');
    this.repoLink = Selector('a[href="/explore/repos"]');
    this.createButton = Selector('.fitted.octicon.octicon-triangle-down');
    this.newRepoButton = Selector('a[href="/repo/create"]');
    this.repoTitleText = Selector('.list-group-item.list-group-item-action');
  }

  async deleteRepo(repoName) {
    await t.click(this.repoTitleText.withText(repoName));
  }
}
