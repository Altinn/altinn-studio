import { BasePage } from '../helpers/BasePage';
import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

const BRANCH_OPERATION_TIMEOUT_MS: number = 10000;

export class BranchDropdown extends BasePage {
  public async clickOnBranchDropdownTrigger(): Promise<void> {
    await this.getTriggerButton().click();
  }

  public async clickOnNewBranchButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('branching.new_branch_dialog.trigger') })
      .click();
  }

  public async writeNewBranchName(branchName: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('branching.new_branch_dialog.branch_name_label'),
      })
      .fill(branchName);
  }

  public async clickOnCreateBranchButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('branching.new_branch_dialog.create') })
      .click();
  }

  public async clickOnBranchInList(branchName: string): Promise<void> {
    await this.page.getByRole('button', { name: branchName, exact: true }).click();
  }

  public async clickOnDeleteBranchButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('branching.delete_branch_dialog.title') })
      .click();
  }

  public async writeBranchNameToConfirmDeletion(branchName: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('branching.delete_branch_dialog.textfield_label'),
      })
      .fill(branchName);
  }

  public async clickOnConfirmDeleteButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('general.delete'), exact: true })
      .click();
  }

  public async clickOnDiscardAndSwitchButton(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page
      .getByRole('button', {
        name: this.textMock('branching.uncommitted_changes_dialog.discard_and_switch'),
      })
      .click();
  }

  public async clickOnCancelUncommittedChangesButton(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('branching.uncommitted_changes_dialog.cancel') })
      .click();
  }

  public async verifyUncommittedChangesAlertIsVisible(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('branching.uncommitted_changes_dialog.heading'),
    });
    await expect(heading).toBeVisible();
  }

  public async verifyCurrentBranch(branchName: string): Promise<void> {
    await expect(this.getTriggerButton()).toContainText(branchName, {
      timeout: BRANCH_OPERATION_TIMEOUT_MS,
    });
  }

  public async verifyBranchIsNotInList(branchName: string): Promise<void> {
    const branchButton = this.page.getByRole('button', { name: branchName, exact: true });
    await expect(branchButton).toHaveCount(0);
  }

  private getTriggerButton(): Locator {
    return this.page.getByRole('button', { name: this.textMock('branching.select_branch') });
  }
}
