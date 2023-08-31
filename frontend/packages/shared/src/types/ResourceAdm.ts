export interface NewResource {
  identifier: string;
  title: SupportedLanguageKey<string>;
}

export interface Resource {
  identifier: string; // OK - PÅKREVD
  resourceType?: ResourceTypeOption; // OK - PÅKREVD
  title: SupportedLanguageKey<string>; // OK - PÅKREVD
  description?: SupportedLanguageKey<string>; // OK - PÅKREVD
  keywords?: ResourceKeyword[]; // OK - ikke påkrevd - // TODO - Does this need to be changed? Issue: #10883
  homepage?: string; // OK - ikke påkrevd
  isPublicService?: boolean; // BYTT til visible - påkrevd - bytte til den
  delegable?: boolean; // NY - PÅKREVD - lag switch
  rightDescription?: SupportedLanguageKey<string>; // OK - PÅKREVD hvis delegatable = true
  version?: Version; // behold
  resourceReferences?: ResourceReference[]; // ikke påkrevd - brukes til å vise migrering

  // contactpoint - påkrevd - Fritekst, sendes som string[] - komma separert
  // status - dropdown - ikke påkrevd
  // availableForType - påkrevd - dropdown / Checkbox
  // SelfIdentified UserEnabled	 - påkrevd - switch
  // Enterprise UserEnabled	 - påkrevd - switch
}
/*

Fra backend:
- Mangler contactpoint
- availableForType
- SelfIdentified UserEnabled
- Enterprise UserEnabled

Visible of isPublicService er der, hvilken skal brukes?

 */

export type ResourceTypeOption = 'Default' | 'Systemresource' | 'MaskinportenSchema';

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
