import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';

export type ComponentIdChange = {
  oldComponentId: string;
  newComponentId: string;
};

export type ComponentIdsChange = ComponentIdChange[];

export type FormLayoutRequest = {
  layout: ExternalFormLayout;
  componentIdsChange?: ComponentIdsChange;
};
