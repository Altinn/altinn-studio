import { expect } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Locator, Page } from '@playwright/test';

type SecurityLevel = 0 | 1 | 2 | 3 | 4;

export class PolicyEditor extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async verifySelectedSecurityLevel(level: SecurityLevel) {
    await expect(this.authLevelLocator).toHaveValue(level.toString());
  }

  public async selectSecurityLevel(level: SecurityLevel): Promise<void> {
    await this.authLevelLocator.selectOption({ value: level.toString() });
  }

  public async selectRulesTab(): Promise<void> {
    await this.rulesTabLocator.click();
  }

  public async selectSummaryTab(): Promise<void> {
    await this.summaryTabLocator.click();
  }

  private get rulesTabLocator(): Locator {
    return this.page.getByRole('tab', {
      name: this.textMock('policy_editor.rules_edit'),
    });
  }

  private get summaryTabLocator(): Locator {
    return this.page.getByRole('tab', {
      name: this.textMock('policy_editor.rules_summary'),
    });
  }

  private get authLevelLocator(): Locator {
    return this.page.getByRole('combobox', {
      name: this.textMock('policy_editor.select_auth_level_label'),
    });
  }
}
