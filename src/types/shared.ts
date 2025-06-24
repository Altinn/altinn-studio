import type { LooseAutocomplete } from 'src/types';

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
  disallowUserCreate?: boolean | null;
}

export interface IDisplayAttachment {
  name?: string;
  iconClass: string;
  grouping: string | undefined;
  description: Partial<Record<LooseAutocomplete<'en' | 'nb' | 'nn'>, string>> | undefined;
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
  contentHash?: unknown;
}

export interface IDataType {
  id: string;
  description?: Partial<Record<LooseAutocomplete<'en' | 'nb' | 'nn'>, string>> | null;
  allowedContentTypes: string[] | null;
  allowedContributers?: string[] | null;
  allowedContributors?: string[] | null;
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
  createdBy?: string;
  data: IData[];
  dueBefore?: string;
  id: string;
  instanceOwner: IInstanceOwner;
  instanceState?: IInstanceState;
  lastChanged?: string;
  lastChangedBy?: string;
  org: string;
  selfLinks?: ISelfLinks | null;
  status?: IInstanceStatus | null;
  title?: ITitle | null;
  visibleAfter?: string;
  completeConfirmations?: unknown;
  presentationTexts?: unknown;
  dataValues?: unknown;
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
  party?: IParty | null;
}

export interface IInstanceState {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
}

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
 * @see https://github.com/Altinn/altinn-register/blob/main/src/Altinn.Platform.Models/src/Altinn.Platform.Models/Register/PartyType.cs
 */
export enum PartyType {
  Person = 1,
  Organisation = 2,

  /**
   * Commenting these out so nobody uses them by accident. The enum linked above has
   * these values, but their existence seem to be a lie:
   * @see https://digdir.slack.com/archives/C079ZFUSFMW/p1738771291616989?thread_ts=1738750152.285599&cid=C079ZFUSFMW
   */
  // SubUnit = 4,
  SelfIdentified = 3,
  // BankruptcyEstate = 5,
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
  processTasks?: Pick<ITask, 'altinnTaskType' | 'elementId'>[];
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

export interface IUserAction {
  id: IActionType | string;
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
  instanceOwnerName?: string;
}

export type IActionType = 'instantiate' | 'confirm' | 'sign' | 'reject' | 'read' | 'write' | 'complete';

export type IAuthContext = {
  read: boolean;
  write: boolean;
} & { [action in IActionType]: boolean };

export type ProblemDetails = {
  title: string;
  detail: string;
  status: number;
};
