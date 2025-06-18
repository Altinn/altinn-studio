import type { AppConfigNew } from './AppConfig';
import type { SupportedLanguage } from './SupportedLanguages';

export type AppConfigFormError = {
  field: keyof AppConfigNew;
  index?: number | keyof SupportedLanguage;
  error: string;
};
