import type { AppConfig } from './AppConfig';
import type { SupportedLanguage } from './SupportedLanguages';

export type AppConfigFormError = {
  field: keyof AppConfig;
  index?: number | keyof SupportedLanguage;
  error: string;
};
