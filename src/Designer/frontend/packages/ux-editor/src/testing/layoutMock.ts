import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { IInternalLayout } from '../types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { FormComponent } from '../types/FormComponent';
import type {
  SerializedFormLayout,
  SerializedFormLayoutsResponse,
} from '../types/SerializedComponent';
import { componentMocks } from './componentMocks';
import type {
  PagesModelWithPageGroups,
  PagesModelWithPageOrder,
} from 'app-shared/types/api/dto/PagesModel';

export const layout1NameMock = 'Side1';
export const layout2NameMock = 'Side2';
export const layout3NameMock = 'Side3';
export const pagelayout1NameMock = 'Sideoppsett 1';
export const pagelayout2NameMock = 'Sideoppsett 2';
export const baseContainerIdMock = BASE_CONTAINER_ID;
export const component1IdMock = componentMocks[ComponentType.Input].id;
export const component1TypeMock = ComponentType.Input;
export const component1Mock: FormComponent<ComponentType.Input> = {
  id: component1IdMock,
  type: component1TypeMock,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
};
export const component2IdMock = componentMocks[ComponentType.Paragraph].id;
export const component2TypeMock = ComponentType.Paragraph;
export const component2Mock: FormComponent<ComponentType.Paragraph> = {
  id: component2IdMock,
  type: component2TypeMock,
};
export const component3IdMock = componentMocks[ComponentType.FileUpload].id;
export const component3Mock: FormComponent = {
  ...componentMocks[ComponentType.FileUpload],
  description: 'test',
  displayMode: 'list',
  hasCustomFileEndings: false,
  maxFileSizeInMB: 1,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 1,
};
export const componentWithOptionsMock: FormComponent = {
  id: 'ComponentWithOptionsMock',
  type: ComponentType.Checkboxes,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
  optionsId: '',
};

export const componentWithMultipleSelectMock: FormComponent = {
  id: 'ComponentWithMultipleSelectMock',
  type: ComponentType.MultipleSelect,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
  optionsId: '',
};

export const subformComponentMock: FormComponent = {
  id: 'SubformComponent',
  type: ComponentType.Subform,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
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
    [componentMocks[ComponentType.FileUploadWithTag].id]:
      componentMocks[ComponentType.FileUploadWithTag],
    ComponentWithOptionsMock: componentWithOptionsMock,
  },
  containers: {
    [baseContainerIdMock]: {
      id: baseContainerIdMock,
      type: undefined,
      index: 0,
    },
    [container1IdMock]: {
      id: container1IdMock,
      type: ComponentType.Group,
    },
    [container2IdMock]: {
      id: container2IdMock,
      type: ComponentType.RepeatingGroup,
      dataModelBindings: { group: { field: 'some-path', dataType: '' } },
    },
  },
  order: {
    [baseContainerIdMock]: [container1IdMock, container2IdMock, 'ComponentWithOptionsMock'],
    [container1IdMock]: [component1IdMock],
    [container2IdMock]: [
      component2IdMock,
      component3IdMock,
      componentMocks[ComponentType.FileUploadWithTag].id,
    ],
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

export const layout1Mock: SerializedFormLayout = {
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
        children: [
          component2IdMock,
          component3IdMock,
          componentMocks[ComponentType.FileUploadWithTag].id,
        ],
        dataModelBindings: { group: { field: 'some-path', dataType: '' } },
      },
      {
        id: component1IdMock,
        type: component1TypeMock,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
      },
      {
        id: component2IdMock,
        type: component2TypeMock,
      },
      {
        id: componentMocks[ComponentType.FileUpload].id,
        type: ComponentType.FileUpload,
        displayMode: 'list',
        hasCustomFileEndings: false,
        maxFileSizeInMB: 1,
        maxNumberOfAttachments: 1,
        minNumberOfAttachments: 1,
      },
      {
        id: componentMocks[ComponentType.FileUploadWithTag].id,
        type: ComponentType.FileUploadWithTag,
        displayMode: 'list',
        hasCustomFileEndings: false,
        maxFileSizeInMB: 1,
        maxNumberOfAttachments: 1,
        minNumberOfAttachments: 1,
        optionsId: '',
      },
      {
        id: 'ComponentWithOptionsMock',
        type: ComponentType.Checkboxes,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        optionsId: '',
      },
    ],
    ...customDataPropertiesMock,
  },
  ...customRootPropertiesMock,
};
const layout2Mock: SerializedFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [],
  },
};
export const pagesModelMock: PagesModelWithPageOrder = {
  pages: [{ id: layout1NameMock }, { id: layout2NameMock }],
};

export const groupsPagesModelMock: PagesModelWithPageGroups = {
  groups: [
    {
      name: pagelayout1NameMock,
      order: [{ id: layout1NameMock }, { id: layout2NameMock }],
    },
    {
      markWhenCompleted: true,
      order: [{ id: layout3NameMock }],
    },
  ],
};
export const pageGroupsMultiplePagesMock: PagesModelWithPageGroups = {
  groups: [
    {
      name: pagelayout1NameMock,
      order: [{ id: layout1NameMock }, { id: layout2NameMock }],
    },
  ],
};
export const externalLayoutsMock: SerializedFormLayoutsResponse = {
  [layout1NameMock]: layout1Mock,
  [layout2NameMock]: layout2Mock,
};
