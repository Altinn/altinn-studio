import type { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';

// Since this page is a Razor page, it's not using the nb/en.json files, which are used in the frontend.
const loginPageTexts: Record<string, string> = {
  login: 'logg inn',
  username: 'Brukernavn eller epost', // SHOULD THIS BE "Username or Email Address"
  password: 'Passord',
  // After loging out, the language on the page changes from Norwegian to English
  login_after_logout: 'Sign in',
  username_after_logout: 'Username or Email Address',
  password_after_logout: 'Password',
  error_message_after_logout: 'Username or password is incorrect.',
};

export class LoginPage extends BasePage {
  private readonly authStorageFile: string = '.playwright/auth/user.json';

  constructor(page: Page) {
    super(page);
  }

  public async verifyLoginPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('altinnLoginPage'));
  }

  public async goToAltinnLoginPage(): Promise<void> {
    await this.page.goto(this.getRoute('altinnLoginPage'));
  }

  public async goToGiteaLoginPage(): Promise<void> {
    await this.page.getByRole('button', { name: loginPageTexts['login'] }).click();
  }

  public async writeUsername(username: string, isAfterLogout: boolean = false): Promise<void> {
    const textKey = isAfterLogout ? 'username_after_logout' : 'username';
    return await this.page.getByLabel(loginPageTexts[textKey]).fill(username);
  }

  public async writePassword(password: string, isAfterLogout: boolean = false): Promise<void> {
    const textKey = isAfterLogout ? 'password_after_logout' : 'password';
    return await this.page.getByLabel(loginPageTexts[textKey]).fill(password);
  }

  public async clickLoginButton(isAfterLogout: boolean = false): Promise<void> {
    const textKey = isAfterLogout ? 'login_after_logout' : 'login';
    return await this.page.getByRole('button', { name: loginPageTexts[textKey] }).click();
  }

  public async confirmSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL(this.getRoute('dashboard'));
  }

  public async checkThatErrorMessageIsVisible(): Promise<void> {
    await this.page.getByText(loginPageTexts['error_message_after_logout']).isVisible();
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
