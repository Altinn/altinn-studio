import { ITitle, IDataType, IPresentationFields, IPresentationField } from "../../../../../shared/src/types";

export interface IApplicationMetadata {
  createdBy: string;
  createdDateTime: string;
  dataTypes: IDataType[];
  id: string;
  lastChangedBy: string;
  lastChangedDateTime: string;
  maxSize: string;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed;
  title: ITitle;
  validFrom: string;
  validTo: string;
  versionId: string;
  WorkflowId: string;
  presentationFields?: IPresentationField[];
}

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}
