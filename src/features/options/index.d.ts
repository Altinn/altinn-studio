import type { IOption } from 'src/layout/common.generated';
import type { IOptions, IOptionsMetaData } from 'src/types';

export interface IOptionsState {
  error: Error | null;
}

export interface IFetchOptionsFulfilledAction {
  key: string;
  options: IOption[];
}

export interface IFetchOptionsRejectedAction {
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
