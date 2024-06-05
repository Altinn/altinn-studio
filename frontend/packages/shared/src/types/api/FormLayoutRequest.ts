import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';

export type ComponentIdChange = {
  oldComponentId: string;
  newComponentId: string;
};

export type FormLayoutRequest = {
  layout: ExternalFormLayout;
  componentIdChange?: ComponentIdChange;
};
