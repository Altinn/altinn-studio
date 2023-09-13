import type { IOnEntry } from 'src/features/applicationMetadata';
import type { IProcessPermissions } from 'src/features/process';
import type { FixedLanguageList } from 'src/language/languages';

export interface IApplication {
  createdBy: string;
  created: string;
  dataTypes: IDataType[];
  id: string;
  lastChangedBy: string;
  lastChanged: string;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed;
  title: ITitle;
  onEntry?: IOnEntry;
}

export interface IAltinnOrg {
  name: ITitle;
  logo: string;
  orgnr: string;
  homepage: string;
  environments: string[];
}

export interface IAltinnOrgs {
  [org: string]: IAltinnOrg;
}

export interface IApplicationLogic {
  allowAnonymousOnStateless?: boolean;
  autoCreate?: boolean;
  classRef?: string;
  schemaRef?: string;
}

export interface IAttachment {
  name?: string;
  iconClass: string;
  url?: string;
  dataType: string;
  includePDF?: boolean;
  tags?: string[];
}

export interface IData {
  id: string;
  instanceGuid: string;
  dataType: string;
  filename?: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks?: ISelfLinks;
  size: number;
  locked: boolean;
  refs: string[];
  isRead?: boolean;
  tags?: string[];
  created: string;
  createdBy: string;
  lastChanged: string;
  lastChangedBy: string;
}

export interface IDataType {
  id: string;
  description?: string;
  allowedContentTypes: string[];
  allowedContributers?: string[];
  appLogic?: IApplicationLogic;
  taskId?: string;
  maxSize?: number;
  maxCount: number;
  minCount: number;
  grouping?: string;
}

export interface IInstance {
  appId: string;
  created?: string;
  data: IData[];
  dueBefore?: string;
  id: string;
  instanceOwner: IInstanceOwner;
  instanceState?: IInstanceState;
  lastChanged?: string;
  org: string;
  process?: IProcess;
  selfLinks?: ISelfLinks | null;
  status?: IInstanceStatus | null;
  title?: ITitle | null;
  visibleAfter?: string;
}

export interface IInstanceStatus {
  substatus: ISubstatus;
}

export interface ISubstatus {
  label: string;
  description: string;
}

export interface IInstanceOwner {
  partyId: string;
  personNumber?: string;
  organisationNumber?: string | null;
  username?: string;
}

export interface IInstanceState {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
}

// Language translations for altinn
export type ILanguage =
  | FixedLanguageList
  | {
      [key: string]: string | ILanguage;
    };

// Language for the rendered alltinn app
export interface IAppLanguage {
  language: string; // Language code
}

export interface IOrganisation {
  orgNumber: string;
  name: string;
  unitType: string;
  telephoneNumber: string;
  mobileNumber: string;
  faxNumber: string;
  emailAdress: string;
  internetAdress: string;
  mailingAdress: string;
  mailingPostalCode: string;
  mailingPostalCity: string;
  businessPostalCode: string;
  businessPostalCity: string;
}

export interface IParty {
  partyId: string;
  partyTypeName?: number | null;
  orgNumber?: number | string | null;
  ssn: string;
  unitType?: string;
  name: string;
  isDeleted: boolean;
  onlyHierarchyElementWithNoAccess: boolean;
  person?: IPerson;
  organization?: IOrganisation;
  childParties?: IParty[];
}

export interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export interface IPerson {
  ssn: string;
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  telephoneNumber: string;
  mobileNumber: string;
  mailingAddress: string;
  mailingPostalCode: number;
  mailingPostalCity: string;
  addressMunicipalNumber: number;
  addressMunicipalName: string;
  addressStreetName: string;
  addressHouseNumber: number;
  addressHouseLetter: string;
  addressPostalCode: number;
  addressCity: string;
}

export interface IProcess {
  started: string;
  startEvent?: string | null;
  currentTask?: ITask;
  ended?: string | null;
  endEvent?: string | null;
}

export interface IProfile {
  userId: number;
  userName: string;
  phoneNumber?: any;
  email?: any;
  partyId: number;
  party?: IParty;
  userType: number;
  profileSettingPreference: IProfileSettingPreference;
}

export interface IProfileSettingPreference {
  language: string;
  preSelectedPartyId: number;
  doNotPromptForParty: boolean;
}

export interface ISelfLinks {
  apps: string;
  platform: string;
}

export type ITask = {
  flow: number;
  started: string;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended?: string | null;
  validated?: IValidated | null;
} & Partial<IProcessPermissions>;

export interface ITitle {
  [key: string]: string;
}

export interface IValidated {
  timestamp: string;
  canCompleteTask: boolean;
}

export interface ITextResource {
  value: string;
  variables?: IVariable[];
}

export interface IVariable {
  key: string;
  dataSource: string;
}

export interface IAttachmentGrouping {
  [title: string]: IAttachment[];
}

export interface IDataSource {
  [key: string]: any;
}

export interface IApplicationSettings {
  [source: string]: string;
}

export type InstanceOwnerPartyType = 'unknown' | 'org' | 'person' | 'selfIdentified';

/** Describes an object with key values from current instance to be used in texts. */
export interface IInstanceContext {
  instanceId: string;
  appId: string;
  instanceOwnerPartyId: string;
  instanceOwnerPartyType: InstanceOwnerPartyType;
}

export type IActionType = 'instantiate' | 'confirm' | 'sign' | 'reject';

export type IAuthContext = {
  read: boolean;
  write: boolean;
} & { [action in IActionType]: boolean };
