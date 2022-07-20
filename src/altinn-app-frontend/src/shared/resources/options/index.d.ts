import type { IOption, IOptions, IOptionsMetaData } from 'src/types';

export interface IOptionsState {
  error: Error;
  options: IOptions;
}

export interface IFetchOptionsFulfilledAction {
  key: string;
  options: IOption[];
}

export interface IFetchOptionsRejectedAction {
  key: string;
  error: Error;
}

export interface IFetchingOptionsAction {
  key: string;
  metaData: IOptionsMetaData;
}
