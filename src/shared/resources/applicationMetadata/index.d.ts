import type { IDataType, ITitle } from 'src/types/shared';

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
  onEntry?: IOnEntry;
  features?: Partial<IBackendFeaturesState>;
}

export interface IApplicationMetadataState {
  applicationMetadata: IApplicationMetadata | null;
  error: Error | null;
}

export interface IOnEntry {
  show: ShowTypes;
}

export type ShowTypes = 'new-instance' | 'select-instance' | 'startpage' | string;

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export interface IGetApplicationMetadataFulfilled {
  applicationMetadata: IApplicationMetadata;
}

export interface IGetApplicationMetadataRejected {
  error: Error;
}

export interface IBackendFeaturesState {
  multiPartSave: boolean;
}
