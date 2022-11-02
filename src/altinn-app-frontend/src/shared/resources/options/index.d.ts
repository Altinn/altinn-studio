import type { IOption, IOptions, IOptionsMetaData } from 'src/types';

export interface IOptionsState {
  error: Error | null;
  options: IOptions;
  optionsWithIndexIndicators?: IOptionsMetaData[];
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

export interface ISetOptionsWithIndexIndicators {
  optionsWithIndexIndicators: IOptionsMetaData[];
}

export interface ISetOptions {
  options: IOptions;
}
