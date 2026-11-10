import type { ExternalComponent } from 'app-shared/types/api/FormLayoutsResponse';
import type {
  ComponentIdChange,
  ComponentIdsChange,
  FormLayoutRequest as GenericFormLayoutRequest,
} from './FormLayout';

export type { ComponentIdChange, ComponentIdsChange };

export type FormLayoutRequest<TComponent = ExternalComponent> =
  GenericFormLayoutRequest<TComponent>;
