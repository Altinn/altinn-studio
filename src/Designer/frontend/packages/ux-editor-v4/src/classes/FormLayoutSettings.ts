import type { ILayoutSettings } from 'app-shared/types/global';

export class FormLayoutSettings {
  private readonly layoutSettings: ILayoutSettings;

  constructor(layoutSettings: ILayoutSettings) {
    this.layoutSettings = layoutSettings;
  }

  public getFormLayoutSettings(): FormLayoutSettings {
    return this;
  }

  public getLayoutSettings(): ILayoutSettings {
    return this.layoutSettings;
  }

  public setPdfLayoutName(layoutName: string): FormLayoutSettings {
    this.layoutSettings.pages.pdfLayoutName = layoutName;
    return this;
  }

  public deletePdfLayoutName(): FormLayoutSettings {
    delete this.layoutSettings.pages.pdfLayoutName;
    return this;
  }

  public getPdfLayoutName(): string | undefined {
    return this.layoutSettings.pages?.pdfLayoutName;
  }

  public addPageToOrder(layoutName: string): void {
    if (this.layoutSettings.pages.groups) {
      this.layoutSettings.pages.groups[0].order.push(layoutName);
    } else {
      this.layoutSettings.pages.order.push(layoutName);
    }
  }

  public deletePageFromOrder(layoutName: string): void {
    if (this.layoutSettings.pages.groups) {
      this.layoutSettings.pages.groups = this.layoutSettings.pages.groups.map((group) => ({
        ...group,
        order: group.order.filter((page) => page !== layoutName),
      }));
    } else {
      const indexOfLayout = this.layoutSettings.pages.order.indexOf(layoutName);
      this.layoutSettings.pages.order.splice(indexOfLayout, 1);
    }
  }
}
