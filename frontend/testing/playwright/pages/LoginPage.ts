import type { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';

// Since this page is a Razor page, it's not using the nb/en.json files, which are used in the frontend.
const loginPageTexts: Record<string, string> = {
  login: 'logg inn',
  username: 'Brukernavn eller epost',
  password: 'Passord',
};

export class LoginPage extends BasePage {
  private readonly authStorageFile: string = '.playwright/auth/user.json';

  constructor(page: Page) {
    super(page);
  }

  public async goToAltinnLoginPage(): Promise<void> {
    await this.page.goto(this.getRoute('altinnLoginPage'));
  }

  public async goToGiteaLoginPage(): Promise<void> {
    await this.page.getByRole('button', { name: loginPageTexts['login'] }).click();
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

  public async confirmSuccessfulLogin(): Promise<void> {
    return this.page.waitForURL(this.getRoute('dashboard'));
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
