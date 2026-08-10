import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export enum PrefillSource {
  ER = 'ER',
  DSF = 'DSF',
  UserProfile = 'UserProfile',
  QueryParameters = 'QueryParameters',
}

export type PrefillFieldMap = KeyValuePairs<string>;

export interface PrefillConfig {
  allowOverwrite?: boolean;
  [PrefillSource.ER]?: PrefillFieldMap;
  [PrefillSource.DSF]?: PrefillFieldMap;
  [PrefillSource.UserProfile]?: PrefillFieldMap;
  [PrefillSource.QueryParameters]?: PrefillFieldMap;
}
