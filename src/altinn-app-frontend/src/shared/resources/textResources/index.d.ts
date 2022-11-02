import type { ITextResource } from 'src/types';

export interface ITextResourcesState {
  language: string | null;
  resources: ITextResource[];
  error: Error | null;
}

export interface IFetchTextResourcesFulfilled {
  language: string;
  resources: ITextResource[];
}

export interface IFetchTextResourcesRejected {
  error: Error;
}

export interface IReplaceTextResourcesFulfilled {
  language: string | null;
  resources: ITextResource[];
}

export interface IReplaceTextResourcesRejected {
  error: Error;
}
