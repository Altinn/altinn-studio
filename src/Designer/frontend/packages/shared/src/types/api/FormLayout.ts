import type { Expression } from '@studio/components';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export type FormLayoutsResponse<TComponent> = KeyValuePairs<ExternalFormLayout<TComponent>>;

export interface ExternalFormLayout<TComponent> {
  $schema: string;
  data: ExternalData<TComponent>;
  [key: string]: any;
}

export interface ExternalData<TComponent> {
  layout: TComponent[];
  hidden?: Expression;
  [key: string]: any;
}

export type ComponentIdChange = {
  oldComponentId: string;
  newComponentId: string;
};

export type ComponentIdsChange = ComponentIdChange[];

export type FormLayoutRequest<TComponent> = {
  layout: ExternalFormLayout<TComponent>;
  componentIdsChange?: ComponentIdsChange;
};
