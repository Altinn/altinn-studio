import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { IInternalLayout } from '../types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormComponent } from '../types/FormComponent';
import type {
  ExternalFormLayoutV3,
  FormLayoutsResponseV3,
} from 'app-shared/types/api/FormLayoutsResponseV3';

export const layout1NameMock = 'Side1';
export const layout2NameMock = 'Side2';
export const baseContainerIdMock = BASE_CONTAINER_ID;
export const component1IdMock = 'Component-1';
export const component1TypeMock = ComponentTypeV3.Input;
export const component1Mock: FormComponent = {
  id: component1IdMock,
  type: component1TypeMock,
  itemType: 'COMPONENT',
  propertyPath: 'definitions/inputComponent',
  pageIndex: null,
};
export const component2IdMock = 'Component-2';
export const component2TypeMock = ComponentTypeV3.Paragraph;
export const component2Mock: FormComponent = {
  id: component2IdMock,
  type: component2TypeMock,
  itemType: 'COMPONENT',
  pageIndex: null,
};
export const container1IdMock = 'Container-1';
export const customRootPropertiesMock: KeyValuePairs = {
  someCustomRootProp: 'someStringValue',
  someOtherCustomRootProp: 5,
};
export const customDataPropertiesMock: KeyValuePairs = {
  someCustomDataProp: 'aStringValue',
  someOtherCustomDataProp: 10,
};
export const layoutMock: IInternalLayout = {
  components: {
    [component1IdMock]: component1Mock,
    [component2IdMock]: component2Mock,
  },
  containers: {
    [baseContainerIdMock]: {
      id: baseContainerIdMock,
      itemType: 'CONTAINER',
      type: undefined,
      index: 0,
      pageIndex: null,
    },
    [container1IdMock]: {
      id: container1IdMock,
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
      pageIndex: null,
      propertyPath: 'definitions/groupComponent',
    },
  },
  order: {
    [baseContainerIdMock]: [container1IdMock],
    [container1IdMock]: [component1IdMock, component2IdMock],
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

export const layout1Mock: ExternalFormLayoutV3 = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [
      {
        id: container1IdMock,
        type: ComponentTypeV3.Group,
        children: [component1IdMock, component2IdMock],
      },
      {
        id: component1IdMock,
        type: component1TypeMock,
      },
      {
        id: component2IdMock,
        type: component2TypeMock,
      },
    ],
    ...customDataPropertiesMock,
  },
  ...customRootPropertiesMock,
};
const layout2Mock: ExternalFormLayoutV3 = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [],
  },
};
export const externalLayoutsMock: FormLayoutsResponseV3 = {
  [layout1NameMock]: layout1Mock,
  [layout2NameMock]: layout2Mock,
};
