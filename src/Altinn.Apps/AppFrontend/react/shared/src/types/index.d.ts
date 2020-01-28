export interface IAltinnWindow extends Window {
  org: string;
  app: string;
}

export interface IApplication {
  createdBy: string;
  createdDateTime: string;
  dataTypes: IDataType[];
  id: string;
  lastChangedBy: string;
  lastChangedDateTime: string;
  maxSize: string;
  org: string;
  title: ITitle;
  validFrom: string;
  validTo: string;
  versionId: string;
  WorkflowId: string;
}

export interface IAppOwner {
  labels: string;
  messages: string;
  canBeDeletedAfter: string;
}

export interface IData {
  id: string;
  dataType: string;
  filename: string;
  contentType: string;
  blobStoragePath: string;
  selfLinks: ISelfLinks;
  size: number;
  locked: boolean;
  refs: string[];
  created: Date;
  createdBy: string;
  lastChanged: Date;
  lastChangedBy: string;
}

export interface IAttachment {
  name: string;
  iconClass: string;
  url: string;
}

export interface IDataType {
  id: string;
  description: string;
  allowedContentTypes: string[];
  appLogic: any;
  taskId: string;
  maxSize: number;
  maxCount: number;
  mincount: number;
}

export interface IInstance {
  appId: string;
  appOwner?: IAppOwner;
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
  status: string;
  title: ITitle;
  visibleAfter?: Date;
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
  language: number;
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
  validated: string;
}

export interface ITitle {
  nb: string;
}
