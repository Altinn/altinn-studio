import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { IInternalLayout } from '../types/global';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormComponent } from '../types/FormComponent';
import type {
  ExternalFormLayout,
  FormLayoutsResponse,
} from 'app-shared/types/api/FormLayoutsResponse';

export const layout1NameMock = 'Side1';
export const layout2NameMock = 'Side2';

export const baseContainerIdMock = BASE_CONTAINER_ID;
export const component1IdMock = 'Component-1';
export const component1TypeMock = ComponentType.Input;
export const component1Mock: FormComponent<ComponentType.Input> = {
  id: component1IdMock,
  type: component1TypeMock,
  dataModelBindings: { simpleBinding: 'some-path' },
  itemType: 'COMPONENT',
  propertyPath: 'definitions/inputComponent',
  pageIndex: null,
};
export const component2IdMock = 'Component-2';
export const component2TypeMock = ComponentType.Paragraph;
export const component2Mock: FormComponent<ComponentType.Paragraph> = {
  id: component2IdMock,
  type: component2TypeMock,
  itemType: 'COMPONENT',
  pageIndex: null,
};
export const component3IdMock = 'fileUploadComponentIdMock';
export const component3Mock: FormComponent = {
  id: component3IdMock,
  type: ComponentType.FileUpload,
  itemType: 'COMPONENT',
  description: 'test',
  displayMode: 'list',
  pageIndex: null,
  propertyPath: 'definitions/fileUploadComponent',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
export const componentWithOptionsMock: FormComponent = {
  id: 'ComponentWithOptionsMock',
  type: ComponentType.Checkboxes,
  dataModelBindings: { simpleBinding: 'some-path' },
  itemType: 'COMPONENT',
  pageIndex: null,
  optionsId: '',
  propertyPath: 'definitions/radioAndCheckboxComponents',
};
export const container1IdMock = 'Container-1';
export const container2IdMock = 'Container-2';
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
    [component3IdMock]: component3Mock,
    ComponentWithOptionsMock: componentWithOptionsMock,
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
      type: ComponentType.Group,
      pageIndex: null,
      propertyPath: 'definitions/groupComponent',
    },
    [container2IdMock]: {
      id: container2IdMock,
      itemType: 'CONTAINER',
      type: ComponentType.RepeatingGroup,
      dataModelBindings: { group: 'some-path' },
      pageIndex: null,
      propertyPath: 'definitions/repeatingGroupComponent',
    },
  },
  order: {
    [baseContainerIdMock]: [container1IdMock, container2IdMock, 'ComponentWithOptionsMock'],
    [container1IdMock]: [component1IdMock],
    [container2IdMock]: [component2IdMock, component3IdMock],
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

export const layout1Mock: ExternalFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [
      {
        id: container1IdMock,
        type: ComponentType.Group,
        children: [component1IdMock],
      },
      {
        id: container2IdMock,
        type: ComponentType.RepeatingGroup,
        children: [component2IdMock, component3IdMock],
        dataModelBindings: { group: 'some-path' },
      },
      {
        id: component1IdMock,
        type: component1TypeMock,
        dataModelBindings: { simpleBinding: 'some-path' },
      },
      {
        id: component2IdMock,
        type: component2TypeMock,
      },
      {
        id: component3IdMock,
        type: ComponentType.FileUpload,
        description: 'test',
        displayMode: 'list',
        hasCustomFileEndings: false,
        maxFileSizeInMB: 1,
        maxNumberOfAttachments: 1,
        minNumberOfAttachments: 1,
      },
      {
        id: 'ComponentWithOptionsMock',
        type: ComponentType.Checkboxes,
        dataModelBindings: { simpleBinding: 'some-path' },
        optionsId: '',
      },
    ],
    ...customDataPropertiesMock,
  },
  ...customRootPropertiesMock,
};
const layout2Mock: ExternalFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [],
  },
};
export const externalLayoutsMock: FormLayoutsResponse = {
  [layout1NameMock]: layout1Mock,
  [layout2NameMock]: layout2Mock,
};

export const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: 'test-layout-set',
      dataTypes: 'datamodel',
      tasks: ['Task_1'],
    },
    {
      id: 'test-layout-set-2',
      dataTypes: 'datamodel-2',
      tasks: ['Task_2'],
    },
  ],
};
