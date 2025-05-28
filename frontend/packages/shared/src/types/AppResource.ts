import type { SupportedLanguage } from './ResourceAdm';

export type AppResource = {
  repositoryName: string;
  serviceName: SupportedLanguage;
  serviceId: string;
};

export type AppResourceFormError = {
  field: keyof AppResource;
  index?: number | keyof SupportedLanguage;
  error: string;
};
