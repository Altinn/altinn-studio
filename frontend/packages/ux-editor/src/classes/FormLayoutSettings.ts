import type { ILayoutSettings } from 'app-shared/types/global';

export class FormLayoutSettings {
  private readonly layoutSettings: ILayoutSettings;

  constructor(layoutSettings: ILayoutSettings) {
    this.layoutSettings = layoutSettings;
  }

  public getLayoutSettings(): ILayoutSettings {
    return this.layoutSettings;
  }

  public setPdfLayoutName(layoutName: string): FormLayoutSettings {
    this.layoutSettings.pages.pdfLayoutName = layoutName;
    return this;
  }

  public getPdfLayoutName(): string {
    return this.layoutSettings.pages.pdfLayoutName;
  }
}
