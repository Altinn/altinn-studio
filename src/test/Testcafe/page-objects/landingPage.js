import { Selector, t } from 'testcafe';

export default class LandingPage {
  constructor() {
    this.altinnHeader = Selector('h1').withText("Altinn");
    this.repoLink = Selector('body > div > div.row.no-gutters > div > a');
    this.createButton = Selector('.div.right.stackable.menu');
    this.newRepoButton = createButton.find("fitted octicon octicon-plus");
  }

}