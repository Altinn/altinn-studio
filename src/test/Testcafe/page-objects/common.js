import { ClientFunction, Selector, t } from 'testcafe';

export default class CommonPage {
  constructor() {
    this.repoLogoutButton = Selector('#navbar > div.right.stackable.menu').withText('Log out');
    this.designerLogoutButton = Selector('#navbarSupportedContent > ul:nth-child(2) > li').withText('Log out');
    this.getPageUrl = ClientFunction(() => window.location.href);
    this.homeButton = Selector('.navbar').withAttribute('title', 'Startside');
  }

  async login(username, password, loginPage) {
    await t
      .click(loginPage.welcomeLoginButton)
      .typeText(loginPage.userInput, username)
      .typeText(loginPage.passwordInput, password)
      .click(loginPage.loginButton);
  }

  async repoLogout() {
    if (this.repoLogoutButton.exists) {
      await t.click(this.repologoutButton);
    } else {
      await t.click(this.designerLogoutButton);
    }

    const signInElement = Selector('.signin').find('option').withExactText('Sign In');

    await t.expect(signInElement.exists).ok({ timeout: 5000 });
  }

  async logout(header) {
    await t.hover(header.userMenu).click(header.logOutButton);
  }

  async ensureUserHasNoRepos(user, landingPage, repoPage) {
    await t.click(landingPage.repoLink);
    await repoPage.ensureUserHasNoRepos(user, landingPage);
  }

  async returnToHomePage() {
    let repoProfileHomeButton = Selector('#navbar > div.item.brand > a > img'); //the home button, should the user be on the repository profile page
    let home = repoProfileHomeButton.exists ? repoProfileHomeButton : homeButton;
    await t.click(home);
  }
}
