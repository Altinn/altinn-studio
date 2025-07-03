import type { SupportedLanguage, ValidLanguage } from './SupportedLanguages';

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
  rightDescription?: SupportedLanguage;
  keywords?: Keyword[];
  status?: StatusOption;
  selfIdentifiedUserEnabled?: boolean;
  enterpriseUserEnabled?: boolean;
  availableForType?: AvailableForTypeOption[];
};

export type Keyword = {
  language: ValidLanguage;
  word: string;
};

export type StatusOption = 'Completed' | 'Deprecated' | 'UnderDevelopment' | 'Withdrawn';

export type AvailableForTypeOption =
  | 'PrivatePerson'
  | 'LegalEntityEnterprise'
  | 'Company'
  | 'BankruptcyEstate'
  | 'SelfRegisteredUser';
