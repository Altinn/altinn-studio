import type { FixedLanguageList } from 'src/language/languages';

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
  allowAnonymousOnStateless?: boolean | null;
  autoCreate?: boolean | null;
  classRef?: string | null;
  schemaRef?: string | null;
}

export interface IDisplayAttachment {
  name?: string;
  iconClass: string;
  url?: string;
  dataType: string;
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
  description?: string | null;
  allowedContentTypes: string[] | null;
  allowedContributers?: string[] | null;
  appLogic?: IApplicationLogic | null;
  taskId?: string | null;
  maxSize?: number | null;
  maxCount: number;
  minCount: number;
  grouping?: string | null;
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

// Language for the rendered altinn app
export interface IAppLanguage {
  language: string; // Language code
}

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Models/Organization.cs
 */
export interface IOrganisation {
  orgNumber: string;
  name: string;
  unitType: string;
  telephoneNumber: string;
  mobileNumber: string;
  faxNumber: string;
  emailAddress: string;
  internetAddress: string;
  mailingAddress: string;
  mailingPostalCode: string;
  mailingPostalCity: string;
  businessPostalCode: string;
  businessPostalCity: string;
  // unitStatus: string; // This exists in the model but is not clearly defined, and not used in the frontend
}

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Models/Party.cs
 */
export interface IParty {
  partyId: number;
  partyUuid?: string | null;
  partyTypeName: PartyType;
  orgNumber?: string | null;
  ssn: string | null;
  unitType?: string | null;
  name: string;
  isDeleted: boolean;
  onlyHierarchyElementWithNoAccess: boolean;
  person?: IPerson | null;
  organization?: IOrganisation | null;
  childParties?: IParty[] | null;
}

/**
 * @see https://github.com/Altinn/altinn-platform/blob/main/Altinn.Platform.Models/src/Register/Enums/PartyType.cs
 */
export enum PartyType {
  Person = 1,
  Organisation = 2,
  SelfIdentified = 3,
  SubUnit = 4,
  BankruptcyEstate = 5,
}

export interface IPerson {
  ssn: string;
  name: string;
  firstName: string;
  middleName: string | null;
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
  addressHouseLetter: string | null;
  addressPostalCode: number;
  addressCity: string;
}

export interface IProcess {
  started: string;
  startEvent?: string | null;
  currentTask?: ITask;
  ended?: string | null;
  endEvent?: string | null;
  processTasks?: ITask[];
}

export interface IProfile {
  userId: number;
  userName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phoneNumber?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  email?: any;
  partyId: number;
  party?: IParty;
  userType: number;
  profileSettingPreference: IProfileSettingPreference;
}

export interface IProfileSettingPreference {
  language: string | null;
  preSelectedPartyId: number;
  doNotPromptForParty: boolean;
}

export interface ISelfLinks {
  apps: string;
  platform: string;
}

type ProcessActionIds = 'read' | 'write' | 'complete';

export interface IUserAction {
  id: ProcessActionIds | string;
  authorized: boolean;
  type: 'ProcessAction' | 'ServerAction';
}

export type ITask = {
  flow: number;
  started: string;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended?: string | null;
  validated?: IValidated | null;

  read?: boolean | null;
  write?: boolean | null;
  actions?: IProcessActions | null;
  userActions?: IUserAction[];
};

export type IProcessActions = {
  [k in IActionType]?: boolean;
};

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
  dataSource: 'instanceContext' | 'applicationSettings' | 'dataModel.default' | `dataModel.${string}`;
  defaultValue?: string;
}

export interface IAttachmentGrouping {
  [title: string]: IDisplayAttachment[];
}

export interface IApplicationSettings {
  [source: string]: string | undefined;
}

export type InstanceOwnerPartyType = 'unknown' | 'org' | 'person' | 'selfIdentified';

/** Describes an object with key values from current instance to be used in texts. */
export interface IInstanceDataSources {
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
