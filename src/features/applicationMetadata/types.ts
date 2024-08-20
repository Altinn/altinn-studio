import type { IDataType, ITitle } from 'src/types/shared';

type ILogoOptions = {
  source: 'org' | 'resource';
  displayAppOwnerNameInHeader?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export interface IncomingApplicationMetadata {
  id: string;
  title: ITitle;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed;
  dataTypes: IDataType[];
  altinnNugetVersion?: string;
  autoDeleteOnProcessEnd: boolean;
  onEntry?: IOnEntry;
  features?: Partial<IBackendFeaturesState>;
  promptForParty?: 'always' | 'never';
  logo?: ILogoOptions;
}

export type ApplicationMetadata = {
  isValidVersion: boolean;
  dataTypes: IDataType[]; // TODO: next step
  id: string;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed; // FIXME: needs improvement
  title: ITitle;
  autoDeleteOnProcessEnd: boolean;
  isStatelessApp: boolean;
  onEntry: IOnEntry;
  features?: Partial<IBackendFeaturesState>;
  promptForParty?: 'always' | 'never';
  logoOptions?: ILogoOptions;
};

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

export interface IBackendFeaturesState {
  jsonObjectInDataResponse: boolean; // Extended attachment validation
}
