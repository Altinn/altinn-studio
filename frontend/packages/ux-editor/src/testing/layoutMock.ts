import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ComponentType } from '../components';
import { IExternalFormLayout, IExternalFormLayouts, IInternalLayout } from '../types/global';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FormComponent } from '../types/FormComponent';

export const layout1NameMock = 'Side1';
export const layout2NameMock = 'Side2';

export const baseContainerIdMock = BASE_CONTAINER_ID;
export const component1IdMock = 'Component-1';
export const component1TypeMock = ComponentType.Input;
export const component1Mock: FormComponent = {
  id: component1IdMock,
  type: component1TypeMock,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
export const component2IdMock = 'Component-2';
export const component2TypeMock = ComponentType.Paragraph;
export const component2Mock: FormComponent = {
  id: component2IdMock,
  type: component2TypeMock,
  itemType: 'COMPONENT',
  dataModelBindings: {},
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
      itemType: 'CONTAINER',
    },
    [container1IdMock]: {
      itemType: 'CONTAINER',
    },
  },
  order: {
    [baseContainerIdMock]: [container1IdMock],
    [container1IdMock]: [component1IdMock, component2IdMock],
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

export const layout1Mock: IExternalFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [
      {
        id: container1IdMock,
        type: ComponentType.Group,
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
const layout2Mock: IExternalFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [],
  },
};
export const externalLayoutsMock: IExternalFormLayouts = {
  [layout1NameMock]: layout1Mock,
  [layout2NameMock]: layout2Mock,
};
