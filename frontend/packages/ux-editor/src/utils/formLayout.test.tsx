import {
  addComponent, addNavigationButtons,
  convertFromLayoutToInternalFormat,
  convertInternalToLayoutFormat,
  extractChildrenFromGroup, findContainerId, hasNavigationButtons, removeComponent, removeComponentsByType,
} from './formLayout';
import { ComponentType } from '../components';
import {
  ICreateFormContainer,
  IExternalComponent, IExternalFormLayout, IFormButtonComponent,
  IFormComponent,
  IFormHeaderComponent,
  IInternalLayout
} from '../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

// Test data:
const baseContainer: ICreateFormContainer = {
  index: 0,
  itemType: 'CONTAINER',
};
const customProperty = 'some-custom-property';
const headerId = '46882e2b-8097-4170-ad4c-32cdc156634e';
const headerComponent: IFormHeaderComponent = {
  id: headerId,
  type: ComponentType.Header,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
  size: 'L',
};
const paragraphId = 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729';
const paragraphComponent: IFormComponent = {
  id: paragraphId,
  type: ComponentType.Paragraph,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
  customProperty,
};
const groupId = 'group-container';
const groupContainer: ICreateFormContainer = {
  dataModelBindings: {},
  itemType: 'CONTAINER',
};
const paragraphInGroupId = 'group-paragraph';
const paragraphInGroupComponent: IFormComponent = {
  id: paragraphInGroupId,
  type: ComponentType.Paragraph,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
};
const groupInGroupId = 'group-child-container';
const groupInGroupContainer: ICreateFormContainer = {
  dataModelBindings: {},
  itemType: 'CONTAINER',
};
const paragraphInGroupInGroupId = 'group-child-paragraph';
const paragraphInGroupInGroupComponent: IFormComponent = {
  id: paragraphInGroupInGroupId,
  type: ComponentType.Paragraph,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
};
const mockInternal: IInternalLayout = {
  components: {
    [headerId]: headerComponent,
    [paragraphId]: paragraphComponent,
    [paragraphInGroupId]: paragraphInGroupComponent,
    [paragraphInGroupInGroupId]: paragraphInGroupInGroupComponent,
  },
  containers: {
    [BASE_CONTAINER_ID]: baseContainer,
    [groupId]: groupContainer,
    [groupInGroupId]: groupInGroupContainer
  },
  order: {
    [BASE_CONTAINER_ID]: [
      headerId,
      paragraphId,
      groupId,
    ],
    [groupId]: [paragraphInGroupId, groupInGroupId],
    [groupInGroupId]: [paragraphInGroupInGroupId],
  },
};

describe('utils/formLayout', () => {
  let mockLayout: IExternalComponent[];

  beforeEach(() => {
    mockLayout = [
      {
        id: '17314adc-f75d-4a49-b726-242e2ae32ad2',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
      {
        id: '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
        customProperty,
      },
    ];
  });

  describe('convertFromLayoutToInternalFormat', () => {
    it('should convert to correct format', () => {
      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout, false);
      const expectedResult: IInternalLayout = {
        components: {
          '17314adc-f75d-4a49-b726-242e2ae32ad2': {
            dataModelBindings: {},
            id: '17314adc-f75d-4a49-b726-242e2ae32ad2',
            itemType: 'COMPONENT',
            readOnly: false,
            required: false,
            textResourceBindings: {
              title: 'Input',
            },
            type: ComponentType.Input,
          },
          '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a': {
            dataModelBindings: {},
            id: '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a',
            itemType: 'COMPONENT',
            readOnly: false,
            required: false,
            textResourceBindings: {
              title: 'Input',
            },
            type: ComponentType.Input,
            customProperty,
          },
        },
        containers: {
          [BASE_CONTAINER_ID]: {
            itemType: 'CONTAINER',
          }
        },
        order: {
          [BASE_CONTAINER_ID]: ['17314adc-f75d-4a49-b726-242e2ae32ad2', '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a'],
        }
      };

      expect(convertedLayout.components).toEqual(expectedResult.components);
    });

    it('should initiate a form layout with a base container', () => {
      const convertedLayout = convertFromLayoutToInternalFormat(null, false);
      expect(Object.keys(convertedLayout.containers).length).toEqual(1);
      expect(Object.keys(convertedLayout.components).length).toEqual(0);
      expect(Object.keys(convertedLayout.order).length).toEqual(1);
    });

    it('if the element contains children, extractChildrenFromContainer should run', () => {
      mockLayout = [
        {
          id: 'mockChildID_1',
          type: ComponentType.Group,
          children: ['mockChildID_2'],
        },
        {
          id: 'mockChildID_3',
          type: ComponentType.Group,
          children: ['mockChildID_4', 'mockChildID_6'],
        },
        {
          id: 'mockChildID_2',
          type: ComponentType.Header,
          someProp: '2',
        },
        {
          id: 'mockChildID_4',
          type: ComponentType.Paragraph,
          someProp: '4',
        },
        {
          id: 'mockChildID_5',
          type: ComponentType.Dropdown,
          someProp: '5',
        },
        {
          id: 'mockChildID_6',
          type: ComponentType.Group,
          children: ['mockChildID_7'],
        },
        {
          id: 'mockChildID_7',
          type: ComponentType.Input,
          someProp: '7',
        },
      ];
      const expectedComponentResult: IInternalLayout = {
        containers: {
          mockChildID_1: { itemType: 'CONTAINER' },
          mockChildID_3: { itemType: 'CONTAINER' },
          mockChildID_6: { itemType: 'CONTAINER' },
        },
        components: {
          mockChildID_2: {
            id: 'mockChildID_2',
            someProp: '2',
            type: ComponentType.Header,
            itemType: 'COMPONENT',
          },
          mockChildID_4: {
            id: 'mockChildID_4',
            someProp: '4',
            type: ComponentType.Paragraph,
            itemType: 'COMPONENT',
          },
          mockChildID_5: {
            id: 'mockChildID_5',
            someProp: '5',
            type: ComponentType.Dropdown,
            itemType: 'COMPONENT',
          },
          mockChildID_7: {
            id: 'mockChildID_7',
            someProp: '7',
            type: ComponentType.Input,
            itemType: 'COMPONENT',
          },
        },
        order: {
          [BASE_CONTAINER_ID]: ['mockChildID_1', 'mockChildID_3', 'mockChildID_5'],
          mockChildID_1: ['mockChildID_2'],
          mockChildID_3: ['mockChildID_4', 'mockChildID_6'],
          mockChildID_6: ['mockChildID_7'],
        }
      };

      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout, false);
      expect(convertedLayout.components).toEqual(expectedComponentResult.components);
      expect(Object.keys(convertedLayout.order).length).toEqual(4);
    });
  });

  describe('convertInternalToLayoutFormat', () => {
    it('should convert to correct format', () => {
      const convertedLayout = convertInternalToLayoutFormat(mockInternal);
      const expectedResult: IExternalFormLayout = {
        $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
        data: {
          layout: [
            {
              id: headerId,
              type: ComponentType.Header,
              textResourceBindings: { title: 'ServiceName' },
              dataModelBindings: {},
              size: 'L',
            },
            {
              id: paragraphId,
              type: ComponentType.Paragraph,
              textResourceBindings: { title: 'ServiceName' },
              dataModelBindings: {},
              customProperty,
            },
            {
              id: groupId,
              type: ComponentType.Group,
              dataModelBindings: {},
              children: [paragraphInGroupId, groupInGroupId],
            },
            {
              id: paragraphInGroupId,
              type: ComponentType.Paragraph,
              textResourceBindings: { title: 'ServiceName' },
              dataModelBindings: {},
            },
            {
              id: groupInGroupId,
              type: ComponentType.Group,
              dataModelBindings: {},
              children: [paragraphInGroupInGroupId],
            },
            {
              id: paragraphInGroupInGroupId,
              type: ComponentType.Paragraph,
              textResourceBindings: { title: 'ServiceName' },
              dataModelBindings: {},
            },
          ],
          hidden: undefined
        }
      };
      expect(Array.isArray(convertedLayout.data.layout)).toBe(true);
      expect(convertedLayout).toEqual(expectedResult);
    });
  });

  describe('extractChildrenFromGroup', () => {
    it('should return all children from a container', () => {
      const mockGroup: IExternalComponent = {
        id: 'mock-group-id',
        type: ComponentType.Group,
        children: ['mock-component-1', 'mock-component-2'],
      };
      const mockComponents: IExternalComponent[] = [
        {
          id: 'mock-component-1',
          type: ComponentType.Header,
          someProp: '1',
        },
        {
          id: 'mock-component-2',
          type: ComponentType.Paragraph,
          someProp: '2',
        },
      ];
      const mockConvertedLayout: IInternalLayout = {
        containers: {},
        components: {},
        order: {},
      };
      const expectedConvertedLayoutResult: IInternalLayout = {
        containers: { 'mock-group-id': { itemType: 'CONTAINER' } },
        components: {
          'mock-component-1': { someProp: '1', itemType: 'COMPONENT', type: ComponentType.Header, id: 'mock-component-1' },
          'mock-component-2': { someProp: '2', itemType: 'COMPONENT', type: ComponentType.Paragraph, id: 'mock-component-2' },
        },
        order: { 'mock-group-id': ['mock-component-1', 'mock-component-2'] },
      };
      extractChildrenFromGroup(mockGroup, mockComponents, mockConvertedLayout);
      expect(mockConvertedLayout).toEqual(expectedConvertedLayoutResult);
    });
  });

  describe('hasNavigationButtons', () => {
    it('Returns true if navigation buttons are present', () => {
      const navigationButtonsId = 'navigationButtons';
      const navigationButtonsComponent: IFormButtonComponent = {
        id: navigationButtonsId,
        itemType: 'COMPONENT',
        onClickAction: jest.fn(),
        type: ComponentType.NavigationButtons,
      };
      const layout: IInternalLayout = {
        containers: mockInternal.containers,
        components: {
          ...mockInternal.components,
          [navigationButtonsId]: navigationButtonsComponent
        },
        order: {
          ...mockInternal.order,
          [BASE_CONTAINER_ID]: [
            ...mockInternal.order[BASE_CONTAINER_ID],
            navigationButtonsId,
          ]
        }
      };
      expect(hasNavigationButtons(layout)).toBe(true);
    });

    it('Returns false if navigation buttons are not present', () => {
      expect(hasNavigationButtons(mockInternal)).toBe(false);
    });
  });

  describe('findContainerId', () => {
    it('Finds the container id for a given component id', () => {
      const containerId = findContainerId(mockInternal, paragraphInGroupId);
      expect(containerId).toEqual(groupId);
    });

    it('Returns undefined if no container is found', () => {
      const componentId = 'inexistentId';
      const containerId = findContainerId(mockInternal, componentId);
      expect(containerId).toBeUndefined();
    });
  });

  describe('addComponent', () => {
    const newComponent: IFormComponent = {
      id: 'newComponent',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
    };

    it('Adds component to the end of the base container by default', () => {
      const layout = addComponent(mockInternal, newComponent);
      expect(layout.components[newComponent.id]).toEqual(newComponent);
      expect(layout.order[BASE_CONTAINER_ID].slice(-1)[0]).toEqual(newComponent.id);
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(mockInternal.order[BASE_CONTAINER_ID].length + 1);
    });

    it('Adds component to the given position of the given container', () => {
      const position = 1;
      const layout = addComponent(mockInternal, newComponent, groupId, position);
      expect(layout.components[newComponent.id]).toEqual(newComponent);
      expect(layout.order[groupId][position]).toEqual(newComponent.id);
      expect(layout.order[groupId].length).toEqual(mockInternal.order[groupId].length + 1);
    })
  });

  describe('removeComponent', () => {
    it('Removes component from the layout', () => {
      const layout = removeComponent(mockInternal, paragraphInGroupId);
      expect(layout.components[paragraphInGroupId]).toBeUndefined();
      expect(layout.order[groupId]).not.toContain(paragraphInGroupId);
      expect(layout.order[groupId].length).toEqual(mockInternal.order[groupId].length - 1);
    });
  });

  describe('removeComponentsByType', () => {
    it('Removes components of the given type from the layout', () => {
      const layout = removeComponentsByType(mockInternal, ComponentType.Paragraph);
      expect(layout.components[paragraphId]).toBeUndefined();
      expect(layout.components[paragraphInGroupId]).toBeUndefined();
      expect(layout.components[paragraphInGroupInGroupId]).toBeUndefined();
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(mockInternal.order[BASE_CONTAINER_ID].length - 1);
      expect(layout.order[groupId].length).toEqual(mockInternal.order[groupId].length - 1);
      expect(layout.order[groupInGroupId].length).toEqual(mockInternal.order[groupInGroupId].length - 1);
    });
  });

  describe('addNavigationButtons', () => {
    it('Adds navigation buttons to the layout', () => {
      const id = 'navigationButtons';
      const layout = addNavigationButtons(mockInternal, id);
      expect(layout.components[id]).toBeDefined();
      expect(layout.components[id].type).toEqual(ComponentType.NavigationButtons);
      expect(layout.components[id].textResourceBindings).toEqual({ next: 'next', back: 'back' });
      expect(layout.order[BASE_CONTAINER_ID].slice(-1)[0]).toEqual(id);
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(mockInternal.order[BASE_CONTAINER_ID].length + 1);
    });
  });
});
