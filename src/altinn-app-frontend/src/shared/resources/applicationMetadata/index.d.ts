import { ITitle, IDataType, IPresentationFields, IPresentationField } from "../../../../../shared/src/types";

export interface IApplicationMetadata {
  createdBy: string;
  created: string;
  dataTypes: IDataType[];
  id: string;
  lastChangedBy: string;
  lastChanged: string;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed;
  title: ITitle;
  presentationFields?: IPresentationField[];
}

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}
