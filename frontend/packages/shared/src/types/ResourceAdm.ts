export type ValidLanguage = 'nb' | 'nn' | 'en';

export type SupportedLanguage = Record<ValidLanguage, string>;
export interface NewResource {
  identifier: string;
  title: SupportedLanguage;
}

export interface Resource {
  identifier: string;
  resourceType?: ResourceTypeOption;
  title: SupportedLanguage;
  description?: SupportedLanguage;
  keywords?: ResourceKeyword[]; // TODO - Does this need to be changed? Issue: #10883
  homepage?: string;
  visible?: boolean;
  delegable?: boolean;
  rightDescription?: SupportedLanguage;
  version?: string;
  resourceReferences?: ResourceReference[];
  status?: ResourceStatusOption;
  selfIdentifiedUserEnabled?: boolean;
  enterpriseUserEnabled?: boolean;
  availableForType?: ResourceAvailableForTypeOption[];
  contactPoints?: ResourceContactPoint[];
}

export interface ResourceContactPoint {
  category: string;
  email: string;
  telephone: string;
  contactPage: string;
}

export type ResourceTypeOption = 'GenericAccessResource' | 'Systemresource' | 'MaskinportenSchema';

export type ResourceStatusOption = 'Completed' | 'Deprecated' | 'UnderDevelopment' | 'Withdrawn';

export type ResourceAvailableForTypeOption =
  | 'PrivatePerson'
  | 'LegalEntityEnterprise'
  | 'Company'
  | 'BankruptcyEstate'
  | 'SelfRegisteredUser';

export interface ResourceKeyword {
  language: ValidLanguage;
  word: string;
}

export interface Version {
  version: string;
  environment: string;
}

export interface ResourceListItem {
  title: SupportedLanguage;
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

export type ResourceReferenceSource =
  | 'Default'
  | 'Altinn1'
  | 'Altinn2'
  | 'Altinn3'
  | 'ExternalPlatform';
export type ResourceReferenceType =
  | 'Default'
  | 'Uri'
  | 'DelegationSchemeId'
  | 'MaskinportenScope'
  | 'ServiceCode'
  | 'ServiceEditionCode';
export interface ResourceReference {
  referenceSource?: ResourceReferenceSource;
  reference?: string;
  referenceType?: ResourceReferenceType;
}
