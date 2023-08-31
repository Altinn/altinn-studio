export interface NewResource {
  identifier: string;
  title: SupportedLanguageKey<string>;
}

export interface Resource {
  identifier: string;
  resourceType?: ResourceTypeOption;
  title: SupportedLanguageKey<string>;
  description?: SupportedLanguageKey<string>;
  keywords?: ResourceKeyword[]; // TODO - Does this need to be changed? Issue: #10883
  homepage?: string;
  isPublicService?: boolean;
  sector?: string[];
  rightDescription?: SupportedLanguageKey<string>;
  version?: Version;
  resourceReferences?: ResourceReference[];
}

export type ResourceTypeOption = 'Default' | 'Systemresource' | 'MaskinportenSchema';

export interface ResourceKeyword {
  language: 'nb' | 'nn' | 'en';
  word: string;
}

export interface Version {
  version: string;
  environment: string;
}

export interface ResourceSector {
  code: string;
  label: SupportedLanguageKey<string>;
}

export interface ResourceListItem {
  title: SupportedLanguageKey<string>;
  createdBy: string;
  lastChanged: string;
  hasPolicy: boolean;
  identifier: string;
}

export interface ResourceVersionStatus {
  policyVersion?: string;
  resourceVersion?: string;
  publishedVersions: Version[];
}

export interface Validation {
  status: number;
  errors: any;
}

export interface SupportedLanguageKey<T> {
  nb?: T;
  nn?: T;
  en?: T;
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
