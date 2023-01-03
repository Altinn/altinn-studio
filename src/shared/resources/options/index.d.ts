import type { IOption, IOption, IOptions, IOptions, IOptionsMetaData, IOptionsMetaData } from 'src/types';

export interface IOptionsState {
  error: Error | null;
  options: IOptions;
  optionsWithIndexIndicators?: IOptionsMetaData[];
  optionsCount: number;
  optionsLoadedCount: number;
  loading: boolean;
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

export interface IFetchOptionsCountFulfilledAction {
  count: number;
}

export interface ISetOptionsWithIndexIndicators {
  optionsWithIndexIndicators: IOptionsMetaData[];
}

export interface ISetOptions {
  options: IOptions;
}
