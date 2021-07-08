import { Selector, t } from 'testcafe';

export default class HeaderPage {
  constructor() {
    this.userMenu = Selector('header').find('button');
    this.logOutButton = Selector('a[href="/Home/Logout]"');
    this.navBar = Selector('#navbarSupportedContent');
    this.openGiteaRepo = Selector('a').withText('Åpne repository');

    //Designer related header selectors
    this.designerTab = Selector('.nav-link.nav-item').withText('Designer');
    this.previewTab = Selector('.nav-link.nav-item').withText('Preview');
    this.teksterTab = Selector('.nav-link.nav-item').withText('Tekster');
  }
}
