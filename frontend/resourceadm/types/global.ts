export type NavigationBarPage = 'about' | 'policy' | 'deploy' | 'migration';

export interface ResourceListItem {
  title: SupportedLanguageKey<string>;
  createdBy: string;
  lastChanged: string;
  hasPolicy: boolean;
  identifier: string;
}

export type ResourceTypeOption = 'Default' | 'Systemresource' | 'MaskinportenSchema';

export interface ResourceBackend {
  identifier: string;
  resourceType?: ResourceTypeOption;
  title: SupportedLanguageKey<string>;
  description?: SupportedLanguageKey<string>;
  keywords?: ResourceKeyword[]; // TODO - Does this need to be changed?
  homepage?: string;
  isPublicService?: boolean;
  sector?: string[];
  thematicArea?: string;
  rightDescription?: SupportedLanguageKey<string>;
  version?: Version;
  resourceReferences?: ResourceReference[];
  // TODO - Missing available languages, organisation types
}

export interface ResourceReference {
  referenceSource?: 'Default' | 'Altinn1' | 'Altinn2' | 'Altinn3' | 'ExternalPlatform';
  reference?: string;
  referenceType?:
    | 'Default'
    | 'Uri'
    | 'DelegationSchemeId'
    | 'MaskinportenScope'
    | 'ServiceCode'
    | 'ServiceEditionCode';
}

export interface ResourceKeyword {
  language: 'nb' | 'nn' | 'en';
  word: string;
}

export interface SupportedLanguageKey<T> {
  nb?: T;
  nn?: T;
  en?: T;
}

export interface Version {
  version: string;
  environment: string;
}

export interface ResourceVersionStatus {
  policyVersion?: string;
  resourceVersion?: string;
  publishedVersions: Version[];
}

export interface NewResource {
  identifier: string;
  title: SupportedLanguageKey<string>;
}

export interface Validation {
  status: number;
  errors: any;
}

// TODO - Find out if the other fields are needed
export interface ResourceSector {
  code: string;
  label: SupportedLanguageKey<string>;
}

// TODO - Find out if the other fields are needed
export interface ResourceThematic {
  uri: string;
}

export interface LanguageString {
  nb?: string;
  nn?: string;
  en?: string;
}

export interface DeployError {
  message: string;
  pageWithError: 'about' | 'policy';
}

export type Translation = 'none' | 'title' | 'description' | 'rightDescription';
