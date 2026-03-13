import type { Locator, Page } from '@playwright/test';
import { Routes, url } from '../helpers/routes';

// Since this page is a Razor page, it's not using the nb/en.json files, which are used in the frontend.
const loginPageTexts: Record<string, string> = {
  login: 'Logg inn',
  continueToLogin: 'Fortsett til innlogging',
  dontShowAgain: 'Ikke vis denne meldingen igjen',
  username: 'Brukernavn eller e-postadresse',
  password: 'Passord',
  error_message: 'Brukernavn eller passord er feil.',
  links: 'Lenker',
  authorize: 'Autoriser applikasjon',
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
    await this.page.waitForURL('/repos/user/login');
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

  public async loginViaFakeAnsattporten(): Promise<void> {
    await this.page.getByRole('button', { name: loginPageTexts['login'] }).click();
    await this.dismissAccountLinkModalIfVisible();
    await this.page.waitForURL(/\/authorize/);
    await this.page.getByRole('button', { name: /cypress_testuser test playwright/ }).click();
    await this.selectOrgIfPickerIsVisible();
    await this.confirmSuccessfulLogin();
  }

  private async selectOrgIfPickerIsVisible(): Promise<void> {
    const nextButton = this.page.getByRole('button', { name: 'Neste' });
    if (await nextButton.isVisible({ timeout: 2000 })) {
      await nextButton.click();
    }
  }

  private async dismissAccountLinkModalIfVisible(): Promise<void> {
    const continueButton = this.page.getByRole('button', {
      name: loginPageTexts['continueToLogin'],
    });
    if (await continueButton.isVisible({ timeout: 2000 })) {
      await this.page.getByLabel(loginPageTexts['dontShowAgain']).check();
      await continueButton.click();
    }
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
