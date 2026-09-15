import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IDataModelBindingsKeyValue } from '@altinn/ux-editor-v4/types/global';
import type {
  ExternalData as GenericExternalData,
  ExternalFormLayout as GenericExternalFormLayout,
  FormLayoutsResponse as GenericFormLayoutsResponse,
} from './FormLayout';

export type FormLayoutsResponse<TComponent = ExternalComponent> =
  GenericFormLayoutsResponse<TComponent>;
export type ExternalFormLayout<TComponent = ExternalComponent> =
  GenericExternalFormLayout<TComponent>;
export type ExternalData<TComponent = ExternalComponent> = GenericExternalData<TComponent>;

export type ExternalComponentBase<T extends ComponentType = ComponentType> = {
  id: string;
  type: T;
  dataModelBindings?: IDataModelBindingsKeyValue;
  textResourceBindings?: KeyValuePairs<string>;
  [key: string]: any;
};

export type ExternalComponent<T extends ComponentType = ComponentType> = {
  [componentType in ComponentType]: ExternalComponentBase<componentType> &
    ComponentSpecificConfig<componentType>;
}[T];
