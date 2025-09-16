import type { MultiLanguageText } from '../../../types/MultiLanguageText';

export type CodeListItem = {
  description?: MultiLanguageText;
  helpText?: MultiLanguageText;
  label?: MultiLanguageText;
  value: string;
};
