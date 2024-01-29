import type { IAppState, IFormLayouts } from '../types/global';
import { appStateMock, formDesignerMock } from '../testing/stateMocks';
import {
  getAllLayoutComponents,
  getAllLayoutContainers,
  getFullLayoutOrder,
  selectedLayoutNameSelector,
} from './formLayoutSelectors';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const layout1Name = 'Side1';
const layout2Name = 'Side2';
const selectedLayout = layout1Name;
const appState: IAppState = {
  ...appStateMock,
  formDesigner: {
    ...formDesignerMock,
    layout: {
      ...formDesignerMock.layout,
      selectedLayout,
    },
  },
};
const container0Id = '42d928ea-57bc-4744-84d0-52d8ed80fd4d';
const container1Id = '46c74255-82b2-41a3-8208-39e552547b3f';
const container2Id = '990f0895-c7ad-4d69-81df-3cade0cbe574';
const component0AId = 'c0a';
const component0BId = 'c0b';
const component1AId = 'c1a';
const component1BId = 'c1b';
const component2AId = 'c2a';
const component2BId = 'c2b';
const container0Order: string[] = [component0AId, component0BId];
const container1Order: string[] = [component1AId, component1BId];
const container2Order: string[] = [component2AId, component2BId];
const formLayoutsData: IFormLayouts = {
  [layout1Name]: {
    containers: {
      [container0Id]: {
        id: container0Id,
        index: 0,
        itemType: 'CONTAINER',
      },
      [container1Id]: {
        id: container1Id,
        index: 1,
        itemType: 'CONTAINER',
      },
    },
    components: {
      [component0AId]: {
        id: component0AId,
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      },
      [component0BId]: {
        id: component0BId,
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      },
      [component1AId]: {
        id: component1AId,
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      },
      [component1BId]: {
        id: component1BId,
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      },
    },
    order: {
      [container0Id]: container0Order,
      [container1Id]: container1Order,
    },
    customRootProperties: {},
    customDataProperties: {},
  },
  [layout2Name]: {
    containers: {
      [container2Id]: {
        id: container2Id,
        index: 0,
        itemType: 'CONTAINER',
      },
    },
    components: {
      [component2AId]: {
        id: component2AId,
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      },
      [component2BId]: {
        id: component2BId,
        type: ComponentType.Input,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      },
    },
    order: { [container2Id]: container2Order },
    customRootProperties: {},
    customDataProperties: {},
  },
};

describe('formLayoutSelectors', () => {
  test('selectedLayoutNameSelector', () => {
    expect(selectedLayoutNameSelector(appState)).toEqual(selectedLayout);
  });

  test('getAllLayoutContainers', () => {
    expect(getAllLayoutContainers(formLayoutsData)).toEqual({
      [container0Id]: formLayoutsData[layout1Name].containers[container0Id],
      [container1Id]: formLayoutsData[layout1Name].containers[container1Id],
      [container2Id]: formLayoutsData[layout2Name].containers[container2Id],
    });
  });

  test('getAllLayoutComponents', () => {
    expect(getAllLayoutComponents(formLayoutsData)).toEqual({
      [component0AId]: formLayoutsData[layout1Name].components[component0AId],
      [component0BId]: formLayoutsData[layout1Name].components[component0BId],
      [component1AId]: formLayoutsData[layout1Name].components[component1AId],
      [component1BId]: formLayoutsData[layout1Name].components[component1BId],
      [component2AId]: formLayoutsData[layout2Name].components[component2AId],
      [component2BId]: formLayoutsData[layout2Name].components[component2BId],
    });
  });

  test('getFullLayoutOrder', () => {
    expect(getFullLayoutOrder(formLayoutsData)).toEqual({
      [container0Id]: container0Order,
      [container1Id]: container1Order,
      [container2Id]: container2Order,
    });
  });
});
