import type { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';
import { Language } from '../enum/Language';

// Since this page is a Razor page, it's not using the nb/en.json files, which are used in the frontend.
const loginPageTexts: Record<string, string> = {
  login: 'Logg inn',
  username: 'Brukernavn eller e-postadresse',
  password: 'Passord',
  error_message: 'Brukernavn eller passord er feil.',
  links: 'Lenker',
  authorize: 'Autoriser applikasjon',
};

export class LoginPage extends BasePage {
  private readonly authStorageFile: string = '.playwright/auth/user.json';

  constructor(page: Page) {
    super(page);
  }

  public async verifyLoginPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('altinnLoginPage'));
    await this.page.getByRole('button', { name: loginPageTexts['login'] }).isVisible();
  }

  public async goToAltinnLoginPage(): Promise<void> {
    await this.page.goto(this.getRoute('altinnLoginPage'));
  }

  public async goToGiteaLoginPage(): Promise<void> {
    await this.page.getByRole('button', { name: loginPageTexts['login'] }).click();
    await this.page.waitForURL('/repos/user/login');
  }

  public async writeUsername(username: string): Promise<void> {
    return await this.page.getByLabel(loginPageTexts['username']).fill(username);
  }

  public async writePassword(password: string): Promise<void> {
    return await this.page.getByLabel(loginPageTexts['password']).fill(password);
  }

  public async clickLoginButton(): Promise<void> {
    return await this.page.getByRole('button', { name: loginPageTexts['login'] }).click();
  }

  public async clickAuthorizeButtonIfLoaded(): Promise<void> {
    const authorizeButton = () =>
      this.page.getByRole('button', { name: loginPageTexts['authorize'] });
    await Promise.race([authorizeButton, this.confirmSuccessfulLogin]);

    if (await authorizeButton().isVisible()) {
      await authorizeButton().click();
    }
  }

  public async confirmSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL(this.getRoute('dashboard'));
  }

  public async checkThatErrorMessageIsVisible(): Promise<void> {
    await this.page.getByText(loginPageTexts['error_message']).isVisible();
  }

  public async getLanguage(): Promise<string> {
    return await this.page
      .getByRole('group', { name: loginPageTexts['links'] })
      .getByRole('menu')
      .innerText();
  }

  public async clickOnLanguageMenu(): Promise<void> {
    await this.page.getByRole('group', { name: loginPageTexts['links'] }).getByRole('menu').click();
  }

  public async clickOnNorwegianLanguageOption(): Promise<void> {
    await this.page.getByRole('menuitem', { name: Language.Norwegian }).click();
  }

  public async addSessionToSharableStorage() {
    await this.removeSecureFlagOnCookies(); // This is necessary because secure cookies won't be added on requests that don't use HTTPS
    return await this.page.context().storageState({ path: this.authStorageFile });
  }

  private async removeSecureFlagOnCookies(): Promise<void> {
    const context = this.page.context();
    const cookies = await context.cookies();
    cookies.forEach((cookie) => {
      cookie.secure = false;
    });
    await context.clearCookies();
    await context.addCookies(cookies);
  }
}
