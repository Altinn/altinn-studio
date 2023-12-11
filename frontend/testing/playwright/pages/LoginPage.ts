import { Page } from "@playwright/test";
import { BasePage } from "../helpers/BasePage";

export class LoginPage extends BasePage {
    private readonly _authStorageFile: string = '.playwright/auth/user.json';

    constructor(page: Page) {
        super(page);
    }

    public async goToAltinnLoginPage(): Promise<void> {
        await this._page.goto(this.altinnLoginPage);
    }

    public async goToGiteaLoginPage(): Promise<void> {
        await this._page.getByRole('button', { name: 'Logg inn' }).click();
    }

    public async writeUsername(username: string): Promise<void> {
        return await this._page.getByLabel('Username or Email Address').fill(username);
    }

    public async writePassword(password: string): Promise<void> {
        return await this._page.getByLabel('Password').fill(password);
    }

    public async clickLoginButton(): Promise<void> {
        return await this._page.getByRole('button', {name: 'Sign In'}).click();
    }

    public async confirmSuccessfulLogin(): Promise<void> {
        return this._page.waitForURL(this.dashboard);
    }

    public async addSessionToSharableStorage() {
        return await this._page.context().storageState({path: this._authStorageFile})
    }
}
