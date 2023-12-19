import { Page } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';

export class LoginPage extends BasePage {
  private readonly _authStorageFile: string = '.playwright/auth/user.json';

  constructor(page: Page) {
    super(page);
  }

  public async goToAltinnLoginPage(): Promise<void> {
    await this.page.goto(this.getRoute('altinnLoginPage'));
  }

  public async goToGiteaLoginPage(): Promise<void> {
    await this.page.getByRole('button', { name: 'Logg inn' }).click();
  }

  public async writeUsername(username: string): Promise<void> {
    return await this.page.getByLabel('Username or Email Address').fill(username);
  }

  public async writePassword(password: string): Promise<void> {
    return await this.page.getByLabel('Password').fill(password);
  }

  public async clickLoginButton(): Promise<void> {
    return await this.page.getByRole('button', { name: 'Sign In' }).click();
  }

  public async confirmSuccessfulLogin(): Promise<void> {
    return this.page.waitForURL(this.getRoute('dashboard'));
  }

  public async addSessionToSharableStorage() {
    return await this.page.context().storageState({ path: this._authStorageFile });
  }
}
