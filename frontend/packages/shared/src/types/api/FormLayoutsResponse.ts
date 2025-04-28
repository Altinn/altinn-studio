import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';
import type { Expression } from '@studio/components-legacy';
import type { IDataModelBindingsKeyValue } from '@altinn/ux-editor/types/global';

export type FormLayoutsResponse = KeyValuePairs<ExternalFormLayout>;

export interface ExternalFormLayout {
  $schema: string;
  data: ExternalData;
  [key: string]: any;
}

export interface ExternalData {
  layout: ExternalComponent[];
  hidden?: Expression;
  [key: string]: any;
}

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
