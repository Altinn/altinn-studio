import { Selector, t } from 'testcafe';

export default class CommonPage {
  constructor() {
    this.repoLogoutButton = Selector("#navbar > div.right.stackable.menu").withText("Log out");
    this.designerLogoutButton = Selector("#navbarSupportedContent > ul:nth-child(2) > li").withText("Log out");
  }

  async login(username, password, landingPage) {
    await t
      .typeText(this.userInput, username)
      .typeText(this.passwordInput, password)
      .click(landingPage.loginButton);
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
}