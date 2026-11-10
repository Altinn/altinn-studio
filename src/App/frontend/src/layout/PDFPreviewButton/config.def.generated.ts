import { ActionComponent } from 'src/layout/LayoutComponent';

export abstract class PDFPreviewButtonDef extends ActionComponent<'PDFPreviewButton'> {
  protected readonly type = 'PDFPreviewButton';

  declare renderSummary?: never;

  declare renderSummary2?: never;
}

// Source hash: c8866930f93a95096ffc3d5eb017170ea32d58c50cf7ac4ca1d80c7e92c501e7
