import { Selector, t } from 'testcafe';


export default class HeaderPage {
  constructor() {
    this.userMenu = Selector('nav-link dropdown-toggle hide-caret');
    this.logOutButton = Selector('a[href="/Home/Logout"');
    this.navBar = Selector('#navbarSupportedContent');
  }

}