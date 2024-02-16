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
  limitedByRRR?: boolean;
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
  links: BrregPagination;
  page: BrregPageInfo;
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

export interface AccessList {
  env: string;
  identifier: string;
  name: string;
  description?: string;
  members?: AccessListMember[];
}

export interface AccessListsResponse {
  data: AccessList[];
  nextPage?: number;
}

export interface AccessListResourceLink {
  resourceIdentifier: string;
  accessListName: string;
  accessListIdentifier: string;
  actions: string[];
}

export interface JsonPatch {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: string | number;
}
