import { PresentationComponent } from 'src/layout/LayoutComponent';

export abstract class SummaryDef extends PresentationComponent<'Summary'> {
  protected readonly type = 'Summary';

  directRender(): boolean {
    return true;
  }

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: 0fd6d25669b9cee8050ce63a052089d65fcf460aa3c83e1126769c0265c85ef6
