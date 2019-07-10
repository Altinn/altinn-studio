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

export interface IParty extends IPerson {
  partyId: number;
  partyTypeName: number;
  orgNumber: number;
  ssn: string;
  person: IPerson;
  organization: string;
}

export interface IProfile extends IParty {
  userId: number;
  userName: string;
  phoneNumber: string;
  email: string;
  partyId: number;
  party: IParty;
  userType: number;
}
