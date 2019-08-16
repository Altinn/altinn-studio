export interface IInstanceState {
  isDeleted: boolean;
  isMarkedForHardDelete: boolean;
  isArchived: boolean;
}

export interface IDataLinks {
  apps: string;
}

export interface IData {
  id: string;
  elementType: string;
  fileName: string;
  contentType: string;
  storageUrl: string;
  dataLinks: IDataLinks;
  fileSize: number;
  isLocked: boolean;
  createdDateTime: Date;
  lastChangedDateTime: Date;
}

export interface IInstance {
  id: string;
  instanceOwnerId: string;
  appId: string;
  org: string;
  createdDateTime: Date;
  lastChangedDateTime: Date;
  instanceState: IInstanceState;
  data: IData[];
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
  mailingPostalCode: string;
  mailingPostalCity: string;
  addressMunicipalNumber: string;
  addressMunicipalName: string;
  addressStreetName: string;
  addressHouseNumber: string;
  addressHouseLetter: string;
  addressPostalCode: string;
  addressCity: string;
}

export interface IParty {
  partyId: number;
  partyTypeName: number;
  orgNumber: string;
  ssn: string;
  unitType?: any;
  name?: any;
  isDeleted: boolean;
  onlyHiearhyElementWithNoAccess: boolean;
  person: IPerson;
  organization?: any;
}

export interface IProfileSettingPreference {
  language: number;
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

