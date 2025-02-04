import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';
import type { IInternalLayout } from '../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

const component1Id = 'SubformComponent1';
const component1: FormComponent = {
  id: component1Id,
  type: ComponentType.Input,
  dataModelBindings: { simpleBinding: 'some-path' },
  textResourceBindings: { title: 'some-title' },
  itemType: 'COMPONENT',
};
const component2Id = 'SubformComponent2';
const component2: FormComponent = {
  id: component2Id,
  type: ComponentType.Paragraph,
  itemType: 'COMPONENT',
};
const component3Id = 'SubformComponent3';
const component3: FormComponent = {
  id: component3Id,
  type: ComponentType.Address,
  dataModelBindings: {
    address: 'address',
    zipCode: 'zipCode',
    postPlace: 'postPlace',
    postNumber: 'postNumber',
  },
  textResourceBindings: { title: 'some-title' },
  itemType: 'COMPONENT',
};

const container1Id = 'SubformContainer1';
const container1: FormContainer = {
  id: container1Id,
  itemType: 'CONTAINER',
  type: ComponentType.Group,
  pageIndex: null,
};

const layout: IInternalLayout = {
  components: {
    [component1Id]: component1,
    [component2Id]: component2,
    [component3Id]: component3,
  },
  containers: {
    [container1Id]: container1,
  },
  order: {
    [BASE_CONTAINER_ID]: [component1Id],
  },
  customRootProperties: undefined,
  customDataProperties: undefined,
};

const layoutSet = {
  side1: layout,
};

const layoutSetName = 'subformLayoutSet1Mock';

export const subformLayoutMock = {
  layoutSetName,
  layoutSet,
  layout,
  component1Id,
  component1,
  component2Id,
  component2,
  component3Id,
  component3,
  container1Id,
  container1,
};
