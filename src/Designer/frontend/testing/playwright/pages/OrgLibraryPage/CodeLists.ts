import { BasePage } from '../../helpers/BasePage';
import { expect, type Page } from '@playwright/test';
import path from 'path';

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

  public async clickOnAddNewCodeListDropdown(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.add_new_code_list'),
      })
      .click();
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

  public async writeCodelistValue(itemNumber: number, value: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('code_list_editor.value_item', { number: itemNumber.toString() }),
        exact: true,
      })
      .fill(value);
  }

  public async writeCodelistLabel(itemNumber: number, label: string): Promise<void> {
    await this.page
      .getByRole('textbox', {
        name: this.textMock('code_list_editor.label_item', { number: itemNumber.toString() }),
      })
      .fill(label);
  }

  public async clickOnSaveCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('general.save'),
      })
      .click();
  }

  public async verifyThatCodeListIsVisible(title: string): Promise<void> {
    const codeList = this.page.getByTitle(
      this.textMock('app_content_library.code_lists.code_list_details_title', {
        codeListTitle: title,
      }),
    );

    await expect(codeList).toBeVisible();
  }

  public async codeListTitleExists(title: string): Promise<boolean> {
    const codeList = this.page.getByTitle(
      this.textMock('app_content_library.code_lists.code_list_details_title', {
        codeListTitle: title,
      }),
    );

    return codeList.isVisible();
  }

  public async clickOnAddItemButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('code_list_editor.add_option'),
      })
      .click();
  }

  public async clickOnCodeListDetails(codeListTitle: string): Promise<void> {
    await this.page.getByRole('button', { name: codeListTitle }).click();
  }

  public async clickOnDeleteCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.code_list_delete'),
      })
      .click();
  }

  public async verifyEmptyValueTextfield(itemNumber: number): Promise<void> {
    await this.verifyValueTextfield(itemNumber, '');
  }

  public async verifyEmptyLabelTextfield(itemNumber: number): Promise<void> {
    await this.verifyLabelTextfield(itemNumber, '');
  }

  public async verifyValueTextfield(itemNumber: number, value: string): Promise<void> {
    const textfield = this.page.getByRole('textbox', {
      name: this.textMock(`code_list_editor.value_item`, { number: itemNumber.toString() }),
      exact: true,
    });

    await expect(textfield).toHaveValue(value);
  }

  public async verifyLabelTextfield(itemNumber: number, value: string): Promise<void> {
    const textfield = this.page.getByRole('textbox', {
      name: this.textMock(`code_list_editor.label_item`, { number: itemNumber.toString() }),
      exact: true,
    });

    await expect(textfield).toHaveValue(value);
  }

  public async clickOnUploadButtonAndSelectFileToUpload(fileName: string): Promise<void> {
    await this.clickOnUploadCodelistButton();
    await this.page.setInputFiles('input[type="file"]', path.join(__dirname, fileName));
  }

  public async listenToAndWaitForConfirmDeleteCodeList(codeListTitle: string): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain(
        this.textMock('app_content_library.code_lists.code_list_delete_confirm', { codeListTitle }),
      );
      await dialog.accept();
    });
  }

  public async verifyThatCodeListIsNotVisible(title: string): Promise<void> {
    const codeList = this.page.getByTitle(
      this.textMock('app_content_library.code_lists.code_list_details_title', {
        codeListTitle: title,
      }),
    );

    await expect(codeList).toBeHidden();
  }

  public async verifyNumberOfItemsInTheCodelist(
    numberOfItems: number,
    codeListTitle: string,
  ): Promise<void> {
    const detailsTitle = this.page.getByRole('button', { name: codeListTitle });
    const details = detailsTitle.locator('xpath=..');
    const table = details.getByRole('table');
    const rows = table.getByRole('row');

    const headerRow: number = 1;
    const totalNumberOfRows: number = numberOfItems + headerRow;

    await expect(rows).toHaveCount(totalNumberOfRows);
  }

  public async clickOnDeleteItemButton(itemNumber: number): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('code_list_editor.delete_code_list_item', {
          number: itemNumber.toString(),
        }),
      })
      .click();
  }

  private async clickOnUploadCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.upload_code_list'),
      })
      .click();
  }
}
