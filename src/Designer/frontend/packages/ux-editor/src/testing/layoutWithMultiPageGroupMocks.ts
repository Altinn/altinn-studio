import type { SerializedComponent, SerializedFormLayout } from '../types/SerializedComponent';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { IInternalLayout } from '../types/global';
import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';
import { customDataPropertiesMock, customRootPropertiesMock } from './layoutMock';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

export const component1Id = 'component1';
export const component2Id = 'component2';
export const component3Id = 'component3';
export const component3_1Id = 'component3_1';
export const component3_2Id = 'component3_2';
export const component3_1_1Id = 'component3_1_1';
export const component3_1_2Id = 'component3_1_2';
export const component3_1_3Id = 'component3_1_3';
export const component3_1_4Id = 'component3_1_4';

const externalComponent1: SerializedComponent = {
  id: component1Id,
  type: ComponentType.Paragraph,
};
const internalComponent1: FormComponent = {
  id: component1Id,
  type: ComponentType.Paragraph,
};

const externalComponent2: SerializedComponent = {
  id: component2Id,
  type: ComponentType.Input,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
};
const internalComponent2: FormComponent = {
  id: component2Id,
  type: ComponentType.Input,
  dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
};

const externalComponent3: SerializedComponent = {
  id: component3Id,
  type: ComponentType.Group,
  children: [component3_1Id, component3_2Id],
};
const internalComponent3: FormContainer = {
  id: component3Id,
  type: ComponentType.Group,
};

const externalComponent3_1: SerializedComponent = {
  id: component3_1Id,
  children: [
    '0:' + component3_1_1Id,
    '0:' + component3_1_2Id,
    '1:' + component3_1_3Id,
    '1:' + component3_1_4Id,
  ],
  edit: { multiPage: true },
  type: ComponentType.RepeatingGroup,
  dataModelBindings: { group: { field: 'some-path', dataType: '' } },
};
const internalComponent3_1: FormContainer<ComponentType.RepeatingGroup> = {
  edit: { multiPage: true },
  id: component3_1Id,
  type: ComponentType.RepeatingGroup,
  dataModelBindings: { group: { field: 'some-path', dataType: '' } },
};

const externalComponent3_1_1: SerializedComponent = {
  id: component3_1_1Id,
  type: ComponentType.Paragraph,
};
const internalComponent3_1_1: FormComponent = {
  id: component3_1_1Id,
  type: ComponentType.Paragraph,
};

const externalComponent3_1_2: SerializedComponent = {
  id: component3_1_2Id,
  type: ComponentType.ButtonGroup,
  children: [],
};
const internalComponent3_1_2: FormContainer = {
  id: component3_1_2Id,
  type: ComponentType.ButtonGroup,
};

const externalComponent3_1_3: SerializedComponent = {
  id: component3_1_3Id,
  type: ComponentType.Accordion,
  children: [],
};
const internalComponent3_1_3: FormContainer = {
  id: component3_1_3Id,
  type: ComponentType.Accordion,
};

const externalComponent3_1_4: SerializedComponent = {
  id: component3_1_4Id,
  type: ComponentType.Paragraph,
};
const internalComponent3_1_4: FormComponent = {
  id: component3_1_4Id,
  type: ComponentType.Paragraph,
};

const externalComponent3_2: SerializedComponent = {
  id: component3_2Id,
  type: ComponentType.Paragraph,
};
const internalComponent3_2: FormComponent = {
  id: component3_2Id,
  type: ComponentType.Paragraph,
};

export const externalLayoutWithMultiPageGroup: SerializedFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [
      externalComponent1,
      externalComponent2,
      externalComponent3,
      externalComponent3_1,
      externalComponent3_2,
      externalComponent3_1_1,
      externalComponent3_1_2,
      externalComponent3_1_3,
      externalComponent3_1_4,
    ],
    ...customDataPropertiesMock,
  },
  ...customRootPropertiesMock,
};

const baseContainer: FormContainer = {
  id: BASE_CONTAINER_ID,
  index: 0,
  type: undefined,
};

export const internalLayoutWithMultiPageGroup: IInternalLayout = {
  components: {
    [component1Id]: internalComponent1,
    [component2Id]: internalComponent2,
    [component3_1_1Id]: internalComponent3_1_1,
    [component3_1_4Id]: internalComponent3_1_4,
    [component3_2Id]: internalComponent3_2,
  },
  containers: {
    [BASE_CONTAINER_ID]: baseContainer,
    [component3Id]: internalComponent3,
    [component3_1Id]: internalComponent3_1,
    [component3_1_2Id]: internalComponent3_1_2,
    [component3_1_3Id]: internalComponent3_1_3,
  },
  order: {
    [BASE_CONTAINER_ID]: [component1Id, component2Id, component3Id],
    [component3Id]: [component3_1Id, component3_2Id],
    [component3_1Id]: [component3_1_1Id, component3_1_2Id, component3_1_3Id, component3_1_4Id],
    [component3_1_2Id]: [],
    [component3_1_3Id]: [],
  },
  pageIndexes: {
    [component3_1_1Id]: 0,
    [component3_1_2Id]: 0,
    [component3_1_3Id]: 1,
    [component3_1_4Id]: 1,
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};
