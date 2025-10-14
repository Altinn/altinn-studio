import type { MultiLanguageText } from '../../../types/MultiLanguageText';

export type CodeListItem = {
  readonly description?: MultiLanguageText;
  readonly helpText?: MultiLanguageText;
  readonly label?: MultiLanguageText;
  readonly value: string;
};
