import type {
  ExternalComponent,
  ExternalFormLayout,
} from 'app-shared/types/api/FormLayoutsResponse';

export type ComponentIdChange = {
  oldComponentId: string;
  newComponentId: string;
};

export type ComponentIdsChange = ComponentIdChange[];

export type FormLayoutRequest<TComponent = ExternalComponent> = {
  layout: ExternalFormLayout<TComponent>;
  componentIdsChange?: ComponentIdsChange;
};
