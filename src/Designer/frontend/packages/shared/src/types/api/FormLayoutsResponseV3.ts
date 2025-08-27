import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { ComponentSpecificConfigV3 } from 'app-shared/types/ComponentSpecificConfigV3';

export type FormLayoutsResponseV3 = KeyValuePairs<ExternalFormLayoutV3>;

export interface ExternalFormLayoutV3 {
  $schema: string;
  data: ExternalDataV3;
  [key: string]: any;
}

export interface ExternalDataV3 {
  layout: ExternalComponentV3[];
  hidden?: boolean;
  [key: string]: any;
}

type ExternalComponentBase<T extends ComponentTypeV3 = ComponentTypeV3> = {
  id: string;
  type: T;
  dataModelBindings?: KeyValuePairs<string>;
  textResourceBindings?: KeyValuePairs<string>;
  [key: string]: any;
};

export type ExternalComponentV3<T extends ComponentTypeV3 = ComponentTypeV3> = {
  [componentType in ComponentTypeV3]: ExternalComponentBase<componentType> &
    ComponentSpecificConfigV3<componentType>;
}[T];
