import { expect } from '@playwright/test';
import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Locator, Page } from '@playwright/test';

type SecurityLevel = 0 | 1 | 2 | 3 | 4;

export class PolicyEditor extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public verifySelectedSecurityLevel(level: SecurityLevel) {
    expect(this.authLevelLocator).toHaveValue(level.toString());
  }

  public async selectSecurityLevel(level: SecurityLevel): Promise<void> {
    await this.authLevelLocator.selectOption({ value: level.toString() });
  }

  private get authLevelLocator(): Locator {
    return this.page.getByRole('combobox', {
      name: this.textMock('policy_editor.select_auth_level_label'),
    });
  }
}
