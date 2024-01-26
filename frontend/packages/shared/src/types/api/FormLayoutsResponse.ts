import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { ComponentSpecificConfig } from 'app-shared/types/ComponentSpecificConfig';

export type FormLayoutsResponse = KeyValuePairs<ExternalFormLayout>;

export interface ExternalFormLayout {
  $schema: string;
  data: ExternalData;
  [key: string]: any;
}

export interface ExternalData {
  layout: ExternalComponent[];
  hidden?: boolean;
  [key: string]: any;
}

type ExternalComponentBase<T extends ComponentType = ComponentType> = {
  id: string;
  type: T;
  dataModelBindings?: KeyValuePairs<string>;
  textResourceBindings?: KeyValuePairs<string>;
  [key: string]: any;
};

export type ExternalComponent<T extends ComponentType = ComponentType> = {
  [componentType in ComponentType]: ExternalComponentBase<componentType> &
    ComponentSpecificConfig<componentType>;
}[T];
