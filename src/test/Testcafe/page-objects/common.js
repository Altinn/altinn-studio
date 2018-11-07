import { Selector, t } from 'testcafe';
import { addSyntheticLeadingComment } from 'typescript';
import LandingPage from './landingPage';

export default class CommonPage {
  constructor() {
    this.repoLogoutButton = Selector("#navbar > div.right.stackable.menu").withText("Log out");
    this.designerLogoutButton = Selector("#navbarSupportedContent > ul:nth-child(2) > li").withText("Log out");
  }

  async login(username, password, loginPage) {
    await t
      .typeText(loginPage.userInput, username)
      .typeText(loginPage.passwordInput, password)
      .click(loginPage.loginButton);
  }

  async repoLogout() {
    if (this.repoLogoutButton.exists) {
      await t
        .click(this.repologoutButton);
    } else {
      await t
        .click(this.designerLogoutButton);
    }

    const signInElement = Selector(".signin")
      .find('option')
      .withExactText('Sign In');

    await t
      .expect(signInElement.exists)
      .ok({ timeout: 5000 });
  }

  async logout(header) {
    await t
      .hover(header.userMenu)
      .click(header.logOutButton);
  }

}