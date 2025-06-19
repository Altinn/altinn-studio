import type { SupportedLanguage } from './SupportedLanguages';

export type AppConfig = {
  repositoryName: string;
  serviceName: string;
  serviceId: string;
  serviceDescription?: string;
};

// This will replace the original AppConfig type in the codebase when feature is fully implemented
export type AppConfigNew = {
  repositoryName: string;
  serviceName: SupportedLanguage;
  serviceId: string;
  description?: SupportedLanguage;
  homepage?: string;
  isDelegable?: boolean;
};
