import type { LayoutSetConfig, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type LayoutSetsResponse = LayoutSets | KeyValuePairs;

export type AddLayoutSetResponse = {
  layoutSets: LayoutSetsResponse;
  layoutSetConfig: LayoutSetConfig;
};
