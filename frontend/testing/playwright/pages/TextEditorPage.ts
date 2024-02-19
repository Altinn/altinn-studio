import { BasePage } from '../helpers/BasePage';
import type { Environment } from '../helpers/StudioEnvironment';
import type { Page } from '@playwright/test';
import type { LanguageCode } from '../enum/LanguageCode';

export class TextEditorPage extends BasePage {
  constructor(page: Page, environment?: Environment) {
    super(page, environment);
  }

  public async loadTextEditorPage(): Promise<void> {
    await this.page.goto(this.getRoute('editorText'));
  }

  public async verifyTextEditorPage(): Promise<void> {
    await this.page.waitForURL(this.getRoute('editorText'));
  }

  public async verifyThatTextareaIsVisibleWithCorrectId(
    lang: LanguageCode,
    textKey: string,
  ): Promise<void> {
    await this.page
      .getByLabel(
        this.textMock('text_editor.table_row_input_label', {
          lang: this.textMock(`language.${lang}`),
          textKey: textKey,
        }),
      )
      .isVisible();
  }

  public async getTextareaValue(lang: LanguageCode, textKey: string): Promise<string> {
    return await this.page
      .getByLabel(
        this.textMock('text_editor.table_row_input_label', {
          lang: this.textMock(`language.${lang}`),
          textKey: textKey,
        }),
      )
      .inputValue();
  }

  public async verifyThatTextKeyIsVisible(textKey: string): Promise<void> {
    await this.page.getByText(textKey).isVisible();
  }

  public async clickOnChangeTextKeyButton(textKey: string): Promise<void> {
    await this.page
      .getByRole('button', { name: this.textMock('text_editor.toggle_edit_mode', { textKey }) })
      .click();
  }

  /*public async writeNewTextKey(textKey: string): Promise<void> {
    await this.page.getByRole('textbox', {
      name:
    })
  }*/
}
