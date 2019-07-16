export interface IParty {
  partyTypeName: number;
  orgNumber: number;
  person: IPerson;
  organization: string;
  partyID: number;
  organizationNumber: number;
  unitType: string;
  ssn: string;
  name: string;
  isDeleted: boolean;
  onlyHiearhyElementWithNoAccess: boolean;
  childActors: any;
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
