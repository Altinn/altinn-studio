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

  public async verifyNewItemValueFieldIsVisible(itemNumber: number): Promise<void> {
    const newItemValueField = this.page.getByRole('textbox', {
      name: this.textMock('code_list_editor.value_item', { number: itemNumber.toString() }),
      exact: true,
    });

    await expect(newItemValueField).toBeVisible();
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

  public async clickOnAddItemButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('code_list_editor.add_option'),
      })
      .click();
  }

  public async clickOnCodeListAccordion(codeListTitle: string): Promise<void> {
    await this.page.getByRole('heading', { name: codeListTitle }).click();
  }

  public async typeInSearchBox(searchTerm: string): Promise<void> {
    await this.page
      .getByRole('searchbox', {
        name: this.textMock('app_content_library.code_lists.search_label'),
      })
      .fill(searchTerm);
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
    const fileChooserPromise = this.page.waitForEvent('filechooser');

    await this.clickOnUploadCodelistButton();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, fileName));
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
      this.textMock('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: title,
      }),
    );

    await expect(codeList).toBeHidden();
  }

  public async verifyNumberOfItemsInTheCodelist(
    numberOfItems: number,
    codeListTitle: string,
  ): Promise<void> {
    const accordionTitle = this.page.getByRole('heading', { name: codeListTitle });
    const accordion = accordionTitle.locator('xpath=..');
    const table = accordion.getByRole('table');
    const rows = table.getByRole('row');

    const headerRow: number = 1;
    const totalNumberOfRows: number = numberOfItems + headerRow;

    await expect(rows).toHaveCount(totalNumberOfRows);
  }

  private async clickOnUploadCodelistButton(): Promise<void> {
    await this.page
      .getByRole('button', {
        name: this.textMock('app_content_library.code_lists.upload_code_list'),
      })
      .click();
  }
}
