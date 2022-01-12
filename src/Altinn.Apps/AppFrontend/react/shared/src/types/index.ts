export interface IAltinnWindow extends Window {
  org: string;
  app: string;
}

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

export interface IOnEntry {
  show: 'new-instance' | 'startpage' | string;
}

export interface IAttachment {
  name: string;
  iconClass: string;
  url: string;
  dataType: string;
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
  created: Date;
  createdBy: string;
  lastChanged: Date;
  lastChangedBy: string;
}

export interface IDataType {
  id: string;
  description?: string;
  allowedContentTypes: string[];
  allowedContributers?: string[];
  appLogic?: any;
  taskId?: string;
  maxSize?: number;
  maxCount: number;
  minCount: number;
  grouping?: string;
}

export interface IExtendedInstance {
  instance: IInstance;
  party: IParty;
}

export interface IInstance {
  appId: string;
  created: Date;
  data: IData[];
  dueBefore?: Date;
  id: string;
  instanceOwner: IInstanceOwner;
  instanceState: IInstanceState;
  lastChanged: Date;
  org: string;
  process: IProcess;
  selfLinks: ISelfLinks;
  status: IInstanceStatus;
  title: ITitle;
  visibleAfter?: Date;
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
  personNumber: string;
  organisationNumber: string;
}

export interface IInstanceState {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
}

export interface ILanguage {
    [key: string]: string | ILanguage;
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
  partyTypeName: number;
  orgNumber: number;
  ssn: string;
  unitType: string;
  name: string;
  isDeleted: boolean;
  onlyHierarchyElementWithNoAccess: boolean;
  person?: IPerson;
  organisation?: IOrganisation;
  childParties: IParty[];
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
  startEvent: string;
  currentTask: ITask;
  ended: string;
  endEvent: string;
}

export interface IProfile {
  userId: number;
  userName: string;
  phoneNumber?: any;
  email?: any;
  partyId: number;
  party: IParty;
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

export interface ITask {
  flow: number;
  started: string;
  elementId: string;
  name: string;
  altinnTaskType: string;
  ended: string;
  validated: IValidated;
}

export interface ITitle {
  nb: string;
}

export interface IValidated {
  timestamp: string;
  canCompleteTask: boolean;
}

export interface ITextResource {
  id: string;
  value: string;
  unparsedValue?: string;
  variables?: IVariable[];
  repeating?: boolean;
}

export interface IVariable {
  key: string;
  dataSource: string;
}

export interface IAttachmentGrouping {
  [title: string]: IAttachment[];
}

export interface IDataSource{
  [key: string]: any;
}

export interface IDataSources {
  [key: string]: IDataSource;
}

export interface IApplicationSettings {
  [source: string]: string;
}
