export interface IAltinnWindow extends Window {
  org: string;
  service: string;
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
  addressPostalCode: string
  addressCity: string;
}

export interface IOrganization {
  orgNumber: string;
  name: string;
  unitType: string;
  telephoneNumber: string;
  mobileNumber: string;
  faxNumber: string;
  eMailAddress?: string;
  internetAddress?: string;
  mailingAddress?: string;
  mailingPostalCode: string;
  mailingPostalCity: string;
  businessAddress?: string;
  businessPostalCode: string;
  businessPostalCity: string;
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
  organization?: IOrganization;
}

export interface IAttachment {
  name: string;
  iconClass: string;
  url: string;
}
