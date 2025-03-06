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

  public getLayoutsOrder(): string[] {
    return this.layoutSettings.pages.order;
  }

  public isLayoutInOrder(layoutName: string): boolean {
    return this.layoutSettings.pages.order.includes(layoutName);
  }

  public deleteLayoutFromOrder(layoutName: string): FormLayoutSettings {
    const indexOfLayout = this.layoutSettings.pages.order.indexOf(layoutName);
    this.layoutSettings.pages.order.splice(indexOfLayout, 1);
    return this;
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
    this.layoutSettings.pages.order.push(layoutName);
  }

  public deletePageFromOrder(layoutName: string): void {
    const indexOfPage = this.layoutSettings.pages.order.indexOf(layoutName);
    this.layoutSettings.pages.order.splice(indexOfPage, 1);
  }

  public deleteLayoutByName(layoutName: string): FormLayoutSettings {
    if (this.isLayoutInOrder(layoutName)) {
      this.deleteLayoutFromOrder(layoutName);
    }

    if (this.getPdfLayoutName() === layoutName) {
      this.deletePdfLayoutName();
    }
    return this;
  }
}
