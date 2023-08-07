export interface PolicyRuleCardType {
  ruleId: string;
  description: string;
  subject: string[];
  actions: string[];
  resources: PolicyRuleResourceType[][];
}

export interface PolicyRuleResourceType {
  type: string;
  id: string;
}

export interface PolicySubjectType {
  subjectId: string;
  subjectSource: string;
  subjectTitle: string;
  subjectDescription: string;
}

export interface PolicyActionType {
  actionId: string,
  actionTitle: string,
  actionDescription: string | null
}

export interface PolicyRuleBackendType {
  ruleId: string,
  description: string,
  subject: string[],
  actions: string[],
  resources: string[][]
}

export type RequiredAuthLevelType = '1' | '2' | '3' | '4';

export interface PolicyBackendType {
  rules: PolicyRuleBackendType[] | null,
  requiredAuthenticationLevelEndUser: RequiredAuthLevelType,
  requiredAuthenticationLevelOrg: string
}

export type NavigationBarPageType = 'about' | 'policy' | 'deploy' | 'migration';

export interface ResourceType {
  title: SupportedLanguageKey<string>;
  createdBy: string;
  lastChanged: string;
  hasPolicy: boolean;
  identifier: string;
}

export type ResourceTypeOptionType = "Default" | "Systemresource" | "MaskinportenSchema";

export interface ResourceBackendType {
  identifier: string;
  resourceType?: ResourceTypeOptionType;
  title: SupportedLanguageKey<string>;
  description?: SupportedLanguageKey<string>;
  keywords?: ResourceKeywordType[]; // TODO - Does this need to be changed?
  homepage?: string;
  isPublicService?: boolean;
  sector?: string[];
  thematicArea?: string;
  rightDescription?: SupportedLanguageKey<string>;
  version?: VersionType;
  resourceReferences?: ResourceReferenceType[];
  // TODO - Missing available languages, organisation types
}

export interface ResourceReferenceType {
  referenceSource?: 'Default' | 'Altinn1' | 'Altinn2' | 'Altinn3' | 'ExternalPlatform';
  reference?: string;
  referenceType?: 'Default' | 'Uri' | 'DelegationSchemeId' | 'MaskinportenScope' | 'ServiceCode' | 'ServiceEditionCode';
}

export interface ResourceKeywordType {
  language: 'nb' | 'nn' | 'en';
  word: string
}

export interface SupportedLanguageKey<T> {
  nb?: T;
  nn?: T;
  en?: T;
}

export interface VersionType {
  version: string;
  environment: string;
}

export interface ResourceVersionStatusType {
  policyVersion?: string;
  resourceVersion?: string;
  publishedVersions: VersionType[];
}

export interface NewResourceType {
  identifier: string;
  title: SupportedLanguageKey<string>;
}

export interface ValidationType {
  status: number;
  errors: any;
}

// TODO - Find out if the other fields are needed
export interface ResourceSectorType {
  code: string;
  label: SupportedLanguageKey<string>;
}

// TODO - Find out if the other fields are needed
export interface ResourceThematicType {
  uri: string;
}

export interface LanguageStringType {
  nb?: string;
  nn?: string;
  en?: string;
}
