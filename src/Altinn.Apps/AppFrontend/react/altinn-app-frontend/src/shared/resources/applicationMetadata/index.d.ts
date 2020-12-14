import { ITitle, IDataType } from '../../../../../shared/src/types';

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
  autoDeleteOnProcessEnd: boolean;
}

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}
