import type { SupportedLanguage } from './SupportedLanguages';

export type AppConfig = {
  repositoryName: string;
  serviceName: SupportedLanguage;
  serviceId: string;
  description?: SupportedLanguage;
};
