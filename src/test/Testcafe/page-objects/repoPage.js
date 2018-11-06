import { Selector, t } from 'testcafe';


export default class RepoPage {
  constructor() {
    this.title = Selector('#repo_name');
    this.submitButton = Selector('.ui.green.button');
  }

  async deleteRepository() {
    await t

  }
}