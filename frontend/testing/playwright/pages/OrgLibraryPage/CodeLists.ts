import { BasePage } from '../../helpers/BasePage';
import { expect, type Page } from '@playwright/test';
import path from 'path';

const TIMEOUT_FOR_TOAST_TO_DISAPPEAR: number = 8000;

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

  public async clickOnCreateNewCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.create_new_code_list'),
      })
      .click();
  }

  public async verifyNewCodelistModalIsOpen(): Promise<void> {
    const modalTitle = this.page.getByRole('heading', {
      name: this.textMock('app_content_library.code_lists.create_new_code_list_modal_title'),
      level: 2,
    });

    await expect(modalTitle).toBeVisible({ timeout: 8000 });
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
      exact: true,
    });

    await expect(alternativeRow).toBeVisible();
  }

  public async writeCodelistValue(row: number, value: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('code_list_editor.value_item', { number: row.toString() }),
        exact: true,
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

  public async verifyThatCodeListIsVisible(title: string): Promise<void> {
    const codeList = this.page.getByTitle(
      this.textMock('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: title,
      }),
    );

    await expect(codeList).toBeVisible();
  }

  public async clickOnUploadCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.upload_code_list'),
      })
      .click();
  }

  public async clickOnUploadButtonAndSelectFileToUpload(fileName: string): Promise<void> {
    const fileChooserPromise = this.page.waitForEvent('filechooser');

    await this.clickOnUploadCodelistButton();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, fileName));
  }

  public async waitForCodelistToBeUploaded(): Promise<void> {
    const toast = this.page.getByText(
      this.textMock('dashboard.org_library.code_list_upload_success'),
    );
    await expect(toast).toBeHidden({ timeout: TIMEOUT_FOR_TOAST_TO_DISAPPEAR });
  }

  public async clickOnCodeListAccordion(title: string): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.code_list_accordion_title', {
          codeListTitle: title,
        }),
      })
      .click();
  }

  public async verifyNumberOfRowsInTheCodelist(
    numberOfRows: number,
    codeListTitle: string,
  ): Promise<void> {
    const accordionTitle = this.page.getByRole('heading', { name: codeListTitle });
    const accordion = accordionTitle.locator('xpath=..');
    const table = accordion.locator('fieldset table');
    const rows = table.locator('tbody tr');

    await expect(rows).toHaveCount(numberOfRows);
  }
}
