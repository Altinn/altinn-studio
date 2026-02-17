import type { LooseAutocomplete } from 'src/types';
import type { IDataType, ITitle } from 'src/types/shared';

type ILogoOptions = {
  source: 'org' | 'resource';
  displayAppOwnerNameInHeader?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export interface ApplicationMetadata {
  id: string;
  title: ITitle;
  org: string;
  partyTypesAllowed: IPartyTypesAllowed;
  dataTypes: IDataType[];
  autoDeleteOnProcessEnd: boolean;
  features?: Partial<IBackendFeaturesState>;
  promptForParty?: 'always' | 'never';
  externalApiIds?: string[];
  onEntry: IOnEntry;
  altinnNugetVersion?: string;
  logo?: ILogoOptions;
}

export interface IOnEntry {
  show: ShowTypes;
  instanceSelection?: IInstanceSelection;
}

export type ShowTypes = LooseAutocomplete<'new-instance' | 'select-instance'>;

export type IInstanceSelection = {
  rowsPerPageOptions: number[];
  defaultSelectedOption: number;
  sortDirection: 'asc' | 'desc';
};

export interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export interface IBackendFeaturesState {
  jsonObjectInDataResponse: boolean; // Extended attachment validation
  addInstanceIdentifierToLayoutRequests: boolean; // Add instance identifier to layout requests
}
