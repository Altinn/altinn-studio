import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export interface ApplicationMetadata {
  autoDeleteOnProcessEnd?: boolean;
  copyInstanceSettings?: CopyInstanceSettings;
  created?: string;
  createdBy?: string;
  dataFields?: DataFieldElement[];
  dataTypes?: DataTypeElement[];
  eFormidling?: EFormidling;
  id: string;
  lastChanged?: string;
  lastChangedBy?: string;
  messageBoxConfig?: MessageBoxConfig;
  onEntry?: OnEntry;
  org: string;
  partyTypesAllowed?: PartyTypesAllowed;
  presentationFields?: DataFieldElement[];
  processId?: string;
  title?: SupportedLanguage;
  validFrom?: string;
  validTo?: string;
  versionId?: string;

  serviceName?: SupportedLanguage;
  keywords?: Keyword[];
  description?: SupportedLanguage;
  homepage?: string;
  access?: ApplicationAccessMetadata;
  contactPoints?: ContactPoint[];
  visible?: boolean;
}

export type Keyword = {
  language: ValidLanguage;
  word: string;
};

export type ValidLanguage = 'nb' | 'nn' | 'en';

export type SupportedLanguage = Record<ValidLanguage, string>;

export type ApplicationAccessMetadata = {
  delegable?: boolean;
  rightDescription?: SupportedLanguage;
};

export type StatusOption = 'Completed' | 'Deprecated' | 'UnderDevelopment' | 'Withdrawn';

export type AvailableForTypeOption =
  | 'PrivatePerson'
  | 'LegalEntityEnterprise'
  | 'Company'
  | 'BankruptcyEstate'
  | 'SelfRegisteredUser';

export type ResourceType = 'altinnapp';

export type ContactPoint = {
  category: string;
  email: string;
  telephone: string;
  contactPage: string;
};

export interface CopyInstanceSettings {
  enabled: boolean;
  excludedDataFields?: string[];
  excludedDataTypes?: string[];
}

export interface DataFieldElement {
  dataTypeId?: string;
  id?: string;
  path?: string;
}

export interface DataTypeElement {
  allowedContentTypes?: string[];
  allowedContributors?: string;
  appLogic?: App;
  description?: KeyValuePairs<string>;
  enabledFileAnalysers?: string[];
  enabledFileValidators?: string[];
  enableFileScan?: boolean;
  enablePdfCreation?: boolean;
  grouping?: string;
  id: string;
  maxCount?: number;
  maxSize?: number;
  minCount?: number;
  taskId?: string;
  validationErrorOnPendingFileScan?: boolean;
}

export interface App {
  allowAnonymousOnStateless?: boolean;
  autoCreate?: boolean;
  autoDeleteOnProcessEnd?: boolean;
  classRef?: string;
  schemaRef?: string;
  shadowFields?: ShadowFields;
}

export interface ShadowFields {
  prefix: string;
  saveToDataType?: string;
}

export interface EFormidling {
  DataTypes: string[];
  DPFShipmentType: string;
  Process: string;
  Receiver: string;
  SecurityLevel: number;
  SendAfterTaskId: string;
  ServiceId: string;
  Standard: string;
  Type: string;
  TypeVersion: string;
}

export interface MessageBoxConfig {
  hideSettings?: HideSettings;
}

export interface HideSettings {
  hideAlways?: boolean;
  hideOnTask?: string[];
}

export interface OnEntry {
  show: string;
  instanceSelection?: InstanceSelection;
}

export interface InstanceSelection {
  sortDirection?: string;
  rowsPerPageOptions?: number[];
  defaultSelectedOption?: number;
}

export type AllowedPartyTypes = 'bankruptcyEstate' | 'organisation' | 'person' | 'subUnit';
export type PartyTypesAllowed = Record<AllowedPartyTypes, boolean>;
