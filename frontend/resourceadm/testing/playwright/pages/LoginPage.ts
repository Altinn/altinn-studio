import type { Locator, Page } from '@playwright/test';
import { Routes, url } from '../helpers/routes';

// Since this page is a Razor page, it's not using the nb/en.json files, which are used in the frontend.
const loginPageTexts: Record<string, string> = {
  login: 'logg inn',
  username: 'Brukernavn eller epost',
  password: 'Passord',
  error_message: 'Ugyldig brukernavn eller passord.',
  links: 'Links',
  authorize: 'Authorize Application',
};

export class LoginPage {
  private readonly authStorageFile: string = '.playwright/auth/user.json';
  private readonly frontPageLoginButton: Locator;
  private readonly userNameField: Locator;
  private readonly passwordField: Locator;

  constructor(public readonly page: Page) {
    this.frontPageLoginButton = this.page.getByRole('button', { name: loginPageTexts['login'] });
    this.userNameField = this.page.getByLabel(loginPageTexts['username']);
    this.passwordField = this.page.getByLabel(loginPageTexts['password']);
  }

  public async goToAltinnLoginPage(): Promise<void> {
    await this.page.goto(url(Routes.altinnLoginPage));
  }

  public async goToGiteaLoginPage(): Promise<void> {
    await this.frontPageLoginButton.click();
  }

  public async writeUsername(username: string): Promise<void> {
    await this.userNameField.fill(username);
  }

  public async writePassword(password: string): Promise<void> {
    await this.passwordField.fill(password);
  }

  public async pressEnterInPasswordField(): Promise<void> {
    await this.passwordField.press('Enter');
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
    await this.page.waitForURL(url(Routes.dashboard));
  }

  public async addSessionToSharableStorage() {
    // Waiting for the page to load all cookies
    await this.waitFor(1000);
    return await this.page.context().storageState({ path: this.authStorageFile });
  }

  private async waitFor(timeout: number): Promise<void> {
    await new Promise((resolve) =>
      setTimeout(() => {
        return resolve('');
      }, timeout),
    );
  }
}
