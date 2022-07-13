import type { ITextResource } from 'src/types';

export interface ITextResourcesState {
  language: string;
  resources: ITextResource[];
  error: Error;
}

export interface IFetchTextResourcesFulfilled {
  language: string;
  resources: ITextResource[];
}

export interface IFetchTextResourcesRejected {
  error: Error;
}

export interface IReplaceTextResourcesFulfilled {
  language: string;
  resources: ITextResource[];
}

export interface IReplaceTextResourcesRejected {
  error: Error;
}
