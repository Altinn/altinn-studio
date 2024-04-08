import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';

type SecurityLevel = 0 | 1 | 2 | 3 | 4;

export class PolicyEditor extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async getSelectedSecurityLevel(): Promise<string> {
    return await this.page
      .getByRole('combobox', {
        name: this.textMock('policy_editor.select_auth_level_label'),
      })
      .inputValue();
  }

  public getSecurityLevelByTextByLevel(level: SecurityLevel): string {
    return this.textMock(`policy_editor.auth_level_option_${level}`);
  }

  public async clickOnSecurityLevelSelect(): Promise<void> {
    await this.page.getByLabel(this.textMock('policy_editor.select_auth_level_label')).click();
  }

  public async clickOnSecurityLevelSelectOption(level: SecurityLevel): Promise<void> {
    await this.page
      .getByRole('option', { name: this.textMock(`policy_editor.auth_level_option_${level}`) })
      .click();
  }
}
