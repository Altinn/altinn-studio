export type ValidLanguage = 'nb' | 'nn' | 'en';

export type SupportedLanguage = Record<ValidLanguage, string>;
export interface NewResource {
  identifier: string;
  title: SupportedLanguage;
}

export interface ConsentMetadata {
  [key: string]: { optional: boolean };
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
  accessListMode?: ResourceAccessListMode;
  consentTemplate?: string;
  consentText?: SupportedLanguage;
  consentMetadata?: ConsentMetadata;
  isOneTimeConsent?: boolean;
}

export type ResourceAccessListMode = 'Disabled' | 'Enabled';

export interface ResourceContactPoint {
  category: string;
  email: string;
  telephone: string;
  contactPage: string;
}

export type ResourceTypeOption =
  | 'GenericAccessResource'
  | 'Systemresource'
  | 'MaskinportenSchema'
  | 'BrokerService'
  | 'CorrespondenceService'
  | 'Consent';

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
  lastChanged?: Date;
  identifier: string;
  environments: string[];
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

export type ResourceReferenceSource = 'Default' | 'Altinn2' | 'Altinn3' | 'ExternalPlatform';
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

export interface BrregPagination {
  first?: { href: string };
  last?: { href: string };
  next?: { href: string };
  prev?: { href: string };
  self?: { href: string };
}

export interface BrregPageInfo {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BrregPartySearchResult {
  _embedded?: {
    enheter: BrregParty[];
  };
  _links: BrregPagination;
  page: BrregPageInfo;
}

export interface BrregSubPartySearchResult {
  _embedded?: {
    underenheter: BrregParty[];
  };
  _links: BrregPagination;
  page: BrregPageInfo;
}

export interface BrregSearchResult {
  parties: AccessListMember[];
  links?: BrregPagination;
  page?: BrregPageInfo;
}

export interface BrregParty {
  organisasjonsnummer: string;
  navn: string;
}

export interface AccessListMember {
  orgNr: string;
  orgName: string;
  isSubParty: boolean;
}

export interface HeaderEtag {
  etag?: string;
}

export interface AccessList extends HeaderEtag {
  env: string;
  identifier: string;
  name: string;
  description?: string;
  resourceConnections?: {
    resourceIdentifier: string;
  }[];
}

export interface AccessListsResponse {
  data: AccessList[];
  nextPage?: string;
}

export interface AccessListMembersResponse extends HeaderEtag {
  data: AccessListMember[];
  nextPage?: string;
}

export interface AccessListOrganizationNumbers extends HeaderEtag {
  data: string[];
}

export interface JsonPatch {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: string | number;
}

export interface ResourceError extends Error {
  response?: {
    status: number;
    data?: any;
  };
}

export interface ResourceFormError {
  field: keyof Resource;
  index?: number | keyof SupportedLanguage;
  error: string;
}

export interface DelegationCountOverview {
  numberOfDelegations: number;
  numberOfRelations: number;
}

export interface MigrateDelegationsRequest {
  serviceCode: string;
  serviceEditionCode: number;
  resourceId: string;
}

interface ConsentTemplateTypeText {
  person: SupportedLanguage;
  org: SupportedLanguage;
}
export interface ConsentTemplate {
  id: string;
  title: string;
  isPoa: boolean;
  restrictedToServiceOwners: string[];
  isMessageSetInRequest: boolean;
  texts: {
    title: ConsentTemplateTypeText;
    heading: ConsentTemplateTypeText;
    serviceIntro: ConsentTemplateTypeText;
    overriddenDelegationContext: SupportedLanguage | null;
    expiration: SupportedLanguage;
    expirationOneTime: SupportedLanguage;
    serviceIntroAccepted: ConsentTemplateTypeText;
    handledBy: SupportedLanguage;
    historyUsedBody: SupportedLanguage;
    historyUsedByHandledByBody: SupportedLanguage;
  };
}
