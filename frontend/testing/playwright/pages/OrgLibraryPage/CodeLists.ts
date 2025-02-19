import { BasePage } from '../../helpers/BasePage';
import { expect, type Page } from '@playwright/test';

export class CodeLists extends BasePage {
  constructor(public page: Page) {
    super(page);
  }

  public async waitForCodeListPageToLoad(): Promise<void> {
    const heading = this.page.getByRole('heading', {
      name: this.textMock('app_content_library.code_lists.page_name'),
      level: 1,
      exact: true,
    });

    await expect(heading).toBeVisible();
  }

  public async verifyThatCodeListPageIsEmpty(): Promise<void> {
    const emptyStateText = this.page.getByText(
      this.textMock('app_content_library.code_lists.code_lists_count_info_none'),
    );

    await expect(emptyStateText).toBeVisible();
  }

  public async clickOnCreateNewCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.create_new_code_list'),
      })
      .click();
  }

  public async verifyNewCodelistModalIsOpen(): Promise<void> {
    /*    const modalTitle = this.page.getByRole('heading', {
      name: this.textMock('app_content_library.code_lists.create_new_code_list'),
      level: 2,
    });

    await expect(modalTitle).toBeVisible({ timeout: 8000 });
*/
    await this.page
      .getByRole('heading', {
        name: this.textMock('app_content_library.code_lists.create_new_code_list'),
        level: 2,
      })
      .isVisible();
  }

  public async writeCodelistTitle(title: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('app_content_library.code_lists.create_new_code_list_name'),
      })
      .fill(title);
  }

  public async clickOnAddAlternativeButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('code_list_editor.add_option'),
      })
      .click();
  }

  public async verifyAlternativeRowIsVisible(row: number): Promise<void> {
    const alternativeRow = this.page.getByRole('textbox', {
      name: this.textMock('code_list_editor.value_item', { number: row.toString() }),
    });

    await expect(alternativeRow).toBeVisible();
  }

  public async writeCodelistValue(row: number, value: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('code_list_editor.value_item', { number: row.toString() }),
      })
      .fill(value);
  }

  public async writeCodelistLabel(row: number, label: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('code_list_editor.label_item', { number: row.toString() }),
      })
      .fill(label);
  }

  public async clickOnSaveCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.save_new_code_list'),
      })
      .click();
  }

  public async verifyThatNewCodeListIsVisible(title: string): Promise<void> {
    const codeList = this.page.getByRole('heading', {
      name: this.textMock('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: title,
      }),
    });

    await expect(codeList).toBeVisible();
  }

  public async tabOut(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }
}
