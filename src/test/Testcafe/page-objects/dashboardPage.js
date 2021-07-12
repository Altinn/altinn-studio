import { Selector, t } from 'testcafe';

export default class DashBoard {
  constructor() {
    this.homeButton = Selector('img').withAttribute('title', 'startside');
    this.logoutButton = Selector('.dropdown-item').withText('Logg ut');
    this.newAppButton = Selector('button > span').withExactText('ny app');
    this.appSearch = Selector('#service-search');
    this.appOwner = Selector('#service-owner');
    this.appName = Selector('#service-saved-name');
    this.accessMessage = Selector('p').withText('Du har ikke tilgang');
    this.writeAccess = Selector('div > div > p').withText('Du har ikke skriverettigheter');
    this.createAppButton = Selector('button').withExactText('Opprett');
    this.appExistsDialogue = Selector('div').withExactText('En app med det navnet finnes allerede.');
    this.appOwnerList = Selector('#menu-').find('li').withAttribute('role', 'option');
    this.appsList = Selector('h2').withExactText('Apper du har rettigheter til å endre').parent().sibling('div');
  }

  async logout() {
    await t.hover(this.homeButton).click(this.logoutButton);
  }
}
