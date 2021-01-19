export interface IAltinnWindow extends Window {
  org: string;
  app: string;
}

export interface IInstanceState {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
}

export interface ISelfLinks {
  apps: string;
  platform: string;
}

export interface IInstance {
  id: string;
  instanceOwner: IInstanceOwner;
  appId: string;
  org: string;
  created: Date;
  lastChanged: Date;
  instanceState: IInstanceState;
  data: IData[];
}

export interface IInstanceOwner {
  partyId: string;
  personNumber: string;
  organisationNumber: string;
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

export interface IProfileSettingPreference {
  language: string;
  preSelectedPartyId: number;
  doNotPromptForParty: boolean;
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

export interface ITitle {
  nb: string;
}

export interface IAttachment {
  name: string;
  iconClass: string;
  url: string;
}

export interface IData {
  id: string;
  dataType: string;
  filename: string;
  contentType: string;
  storageUrl: string;
  selfLinks: ISelfLinks;
  size: number;
  locked: boolean;
  created: Date;
  lastChanged: Date;
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

export interface ILayoutSettings {
  $schema?: string;
  pages?: IPagesSettings;
  components?: IComponentsSettings;
}

export interface IPagesSettings {
  order?: string[];
  excludeFromPdf?: string[];
}

export interface IComponentsSettings {
  excludeFromPdf?: string[];
}

export interface IRepository {
  name: string;
  full_name: string;
  owner: IUser
}

export interface IUser
{
  avatar_url: string;
  login: string;
}
