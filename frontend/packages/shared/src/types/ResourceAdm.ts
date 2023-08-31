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
  visible?: boolean;
  delegable?: boolean;
  rightDescription?: SupportedLanguageKey<string>;
  version?: Version;
  resourceReferences?: ResourceReference[];
  status?: ResourceStatusOption;
  // -- Nye
  contactPoint?: ContactPoint[]; // NY - PÅKREVD - Skal man fylle inn alle??
  selfIdentifiedUserEnabled: boolean; // NY - PÅKREVD - Switch
  enterpriseUserEnabled: boolean; //  NY - PÅKREVD - Switch
  // availableForType - påkrevd - dropdown / Checkbox
}
/*

PÅKREVD - Fix for error validation
- resourceType
- title
- description
- visible
- delegable
- rightDescription - HVIS delegable=true
- contactPoint
- selfIdentifiedUserEnabled
- enterpriseUserEnabled
- availableForType

Fra backend:
- availableForType
 */

export interface ContactPoint {
  category: string;
  email: string;
  telephone: string;
  contactPage: string;
}

export type ResourceTypeOption = 'GenericAccessResource' | 'Systemresource' | 'MaskinportenSchema';
export type ResourceStatusOption = 'Completed' | 'Deprecated' | 'UnderDevelopment' | 'Withdrawn';

export interface ResourceKeyword {
  language: 'nb' | 'nn' | 'en';
  word: string;
}

export interface Version {
  version: string;
  environment: string;
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
