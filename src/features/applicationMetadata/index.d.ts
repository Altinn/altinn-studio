import type { IDataType, ITitle } from 'src/types/shared';

type ILogoOptions = {
  source: 'org' | 'resource';
  displayAppOwnerNameInHeader?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export interface IApplicationMetadata {
  altinnNugetVersion?: string;
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
  promptForParty?: 'always' | 'never';
  logo?: ILogoOptions;
}

export interface IOnEntry {
  show: ShowTypes;
  instanceSelection?: IInstanceSelection;
}

export type ShowTypes = 'new-instance' | 'select-instance' | string;

export type IInstanceSelection = {
  rowsPerPageOptions: number[];
  defaultSelectedOption: number;
  sortDirection: 'asc' | 'desc';
};

interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export interface IGetApplicationMetadataFulfilled {
  applicationMetadata: IApplicationMetadata;
}

export interface IBackendFeaturesState {
  jsonObjectInDataResponse: boolean; // Extended attachment validation
}
