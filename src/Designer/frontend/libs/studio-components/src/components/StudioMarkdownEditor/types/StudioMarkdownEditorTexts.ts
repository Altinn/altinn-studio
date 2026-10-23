import type { FormattingCommand } from './FormattingCommand';

export type StudioMarkdownEditorTexts = Readonly<
  Record<FormattingCommand, string> & {
    modeSelectorLabel: string;
    previewMode: string;
    markdownMode: string;
    toolbarLabel: string;
    linkUrl: string;
    linkApply: string;
    linkRemove: string;
    linkCancel: string;
  }
>;
