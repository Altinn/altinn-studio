import {
  addComponent,
  addContainer,
  addItemOfType,
  addNavigationButtons,
  convertFromLayoutToInternalFormat,
  convertInternalToLayoutFormat,
  extractChildrenFromGroup,
  findParentId,
  hasNavigationButtons,
  moveLayoutItem,
  removeComponent,
  removeComponentsByType,
} from './formLayoutUtils';
import { ComponentType } from 'app-shared/types/ComponentType';
import { IInternalLayout } from '../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { customDataPropertiesMock, customRootPropertiesMock } from '../testing/layoutMock';
import type {
  FormButtonComponent,
  FormHeaderComponent,
  FormParagraphComponent
} from '../types/FormComponent';
import { FormContainer } from '../types/FormContainer';
import { ExternalComponent, ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';

// Test data:
const baseContainer: FormContainer = {
  index: 0,
  itemType: 'CONTAINER',
};
const customProperty = 'some-custom-property';
const headerId = '46882e2b-8097-4170-ad4c-32cdc156634e';
const headerComponent: FormHeaderComponent = {
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
const paragraphComponent: FormParagraphComponent = {
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
const groupContainer: FormContainer = {
  dataModelBindings: {},
  itemType: 'CONTAINER',
};
const paragraphInGroupId = 'group-paragraph';
const paragraphInGroupComponent: FormParagraphComponent = {
  id: paragraphInGroupId,
  type: ComponentType.Paragraph,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
};
const groupInGroupId = 'group-child-container';
const groupInGroupContainer: FormContainer = {
  dataModelBindings: {},
  itemType: 'CONTAINER',
};
const paragraphInGroupInGroupId = 'group-child-paragraph';
const paragraphInGroupInGroupComponent: FormParagraphComponent = {
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
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

describe('formLayoutUtils', () => {
  let mockLayout: ExternalFormLayout;

  beforeEach(() => {
    mockLayout = {
      $schema: null,
      data: {
        layout: [
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
        ],
        ...customDataPropertiesMock,
      },
      hidden: undefined,
      ...customRootPropertiesMock,
    } ;
  });

  describe('convertFromLayoutToInternalFormat', () => {
    it('should convert to correct format', () => {
      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout);
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
        },
        customDataProperties: customDataPropertiesMock,
        customRootProperties: customRootPropertiesMock,
      };

      expect(convertedLayout.components).toEqual(expectedResult.components);
    });

    it('should initiate a form layout with a base container', () => {
      const convertedLayout = convertFromLayoutToInternalFormat(null);
      expect(Object.keys(convertedLayout.containers).length).toEqual(1);
      expect(Object.keys(convertedLayout.components).length).toEqual(0);
      expect(Object.keys(convertedLayout.order).length).toEqual(1);
    });

    it('if the element contains children, extractChildrenFromContainer should run', () => {
      mockLayout.data.layout = [
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
          dataModelBindings: {},
          someProp: '2',
          size: 'normal',
        },
        {
          id: 'mockChildID_4',
          type: ComponentType.Paragraph,
          dataModelBindings: {},
          someProp: '4',
        },
        {
          id: 'mockChildID_5',
          type: ComponentType.Dropdown,
          dataModelBindings: {},
          someProp: '5',
          optionsId: 'mockChildID_5_options',
        },
        {
          id: 'mockChildID_6',
          type: ComponentType.Group,
          children: ['mockChildID_7'],
        },
        {
          id: 'mockChildID_7',
          type: ComponentType.Input,
          dataModelBindings: {},
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
            size: 'normal',
            dataModelBindings: {},
          },
          mockChildID_4: {
            id: 'mockChildID_4',
            someProp: '4',
            type: ComponentType.Paragraph,
            itemType: 'COMPONENT',
            dataModelBindings: {},
          },
          mockChildID_5: {
            id: 'mockChildID_5',
            someProp: '5',
            type: ComponentType.Dropdown,
            itemType: 'COMPONENT',
            optionsId: 'mockChildID_5_options',
            dataModelBindings: {},
          },
          mockChildID_7: {
            id: 'mockChildID_7',
            someProp: '7',
            type: ComponentType.Input,
            itemType: 'COMPONENT',
            dataModelBindings: {},
          },
        },
        order: {
          [BASE_CONTAINER_ID]: ['mockChildID_1', 'mockChildID_3', 'mockChildID_5'],
          mockChildID_1: ['mockChildID_2'],
          mockChildID_3: ['mockChildID_4', 'mockChildID_6'],
          mockChildID_6: ['mockChildID_7'],
        },
        customRootProperties: customRootPropertiesMock,
        customDataProperties: customDataPropertiesMock,
      };

      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout);
      expect(convertedLayout.components).toEqual(expectedComponentResult.components);
      expect(Object.keys(convertedLayout.order).length).toEqual(4);
    });
  });

  describe('convertInternalToLayoutFormat', () => {
    it('should convert to correct format', () => {
      const convertedLayout = convertInternalToLayoutFormat(mockInternal);
      const expectedResult: ExternalFormLayout = {
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
          ...customDataPropertiesMock
        },
        ...customRootPropertiesMock
      };
      expect(Array.isArray(convertedLayout.data.layout)).toBe(true);
      expect(convertedLayout).toEqual(expectedResult);
    });
  });

  describe('extractChildrenFromGroup', () => {
    it('should return all children from a container', () => {
      const mockGroup: ExternalComponent = {
        id: 'mock-group-id',
        type: ComponentType.Group,
        children: ['mock-component-1', 'mock-component-2'],
      };
      const mockComponents: ExternalComponent[] = [
        {
          id: 'mock-component-1',
          type: ComponentType.Header,
          dataModelBindings: {},
          someProp: '1',
          size: 'normal'
        },
        {
          id: 'mock-component-2',
          type: ComponentType.Paragraph,
          dataModelBindings: {},
          someProp: '2',
        },
      ];
      const mockConvertedLayout: IInternalLayout = {
        containers: {},
        components: {},
        order: {},
        customRootProperties: {},
        customDataProperties: {},
      };
      const expectedConvertedLayoutResult: IInternalLayout = {
        containers: { 'mock-group-id': { itemType: 'CONTAINER' } },
        components: {
          'mock-component-1': {
            someProp: '1',
            itemType: 'COMPONENT',
            type: ComponentType.Header,
            id: 'mock-component-1',
            size: 'normal',
            dataModelBindings: {}
          },
          'mock-component-2': {
            someProp: '2',
            itemType: 'COMPONENT',
            type: ComponentType.Paragraph,
            id: 'mock-component-2',
            dataModelBindings: {}
          },
        },
        order: { 'mock-group-id': ['mock-component-1', 'mock-component-2'] },
        customRootProperties: {},
        customDataProperties: {},
      };
      extractChildrenFromGroup(mockGroup, mockComponents, mockConvertedLayout);
      expect(mockConvertedLayout).toEqual(expectedConvertedLayoutResult);
    });
  });

  describe('hasNavigationButtons', () => {
    it('Returns true if navigation buttons are present', () => {
      const navigationButtonsId = 'navigationButtons';
      const navigationButtonsComponent: FormButtonComponent = {
        id: navigationButtonsId,
        itemType: 'COMPONENT',
        onClickAction: jest.fn(),
        type: ComponentType.NavigationButtons,
        dataModelBindings: {},
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
        },
        customRootProperties: {},
        customDataProperties: {},
      };
      expect(hasNavigationButtons(layout)).toBe(true);
    });

    it('Returns false if navigation buttons are not present', () => {
      expect(hasNavigationButtons(mockInternal)).toBe(false);
    });
  });

  describe('findParentId', () => {
    it('Finds the container id for a given component id', () => {
      const containerId = findParentId(mockInternal, paragraphInGroupId);
      expect(containerId).toEqual(groupId);
    });

    it('Finds the parent container id for a given container id', () => {
      const containerId = findParentId(mockInternal, groupInGroupId);
      expect(containerId).toEqual(groupId);
    });

    it('Returns undefined if no container is found', () => {
      const componentId = 'inexistentId';
      const containerId = findParentId(mockInternal, componentId);
      expect(containerId).toBeUndefined();
    });
  });

  describe('addComponent', () => {
    const newComponent: FormParagraphComponent = {
      id: 'newComponent',
      type: ComponentType.Paragraph,
      itemType: 'COMPONENT',
      dataModelBindings: {},
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

  describe('addContainer', () => {
    const id = 'testId';
    const newContainer: FormContainer = { itemType: 'CONTAINER' };

    it('Adds container to the end of the base container by default', () => {
      const layout = addContainer(mockInternal, newContainer, id);
      expect(layout.containers[id]).toEqual(newContainer);
      expect(layout.order[BASE_CONTAINER_ID].slice(-1)[0]).toEqual(id);
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(mockInternal.order[BASE_CONTAINER_ID].length + 1);
      expect(layout.order[id]).toEqual([]);
    });

    it('Adds container to the given position of the given parent container', () => {
      const position = 1;
      const layout = addContainer(mockInternal, newContainer, id, groupId, position);
      expect(layout.containers[id]).toEqual(newContainer);
      expect(layout.order[groupId][position]).toEqual(id);
      expect(layout.order[groupId].length).toEqual(mockInternal.order[groupId].length + 1);
      expect(layout.order[id]).toEqual([]);
    });
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

  describe('moveLayoutItem', () => {
    it('Changes the order properties in order to move item to the given position', () => {
      const updatedLayout = moveLayoutItem(mockInternal, paragraphInGroupId, groupInGroupId, 1); // Move paragraphInGroupId to the second position in groupInGroupId
      expect(updatedLayout.order[groupId]).toEqual([groupInGroupId]); // Checks that paragraphInGroupId is no longer a part of this group
      expect(updatedLayout.order[groupInGroupId]).toEqual([paragraphInGroupInGroupId, paragraphInGroupId]); // Checks that paragraphInGroupId is now in the desired position of the target group
    });
  });

  describe('addItemOfType', () => {
    it.each(Object.values(ComponentType).filter((v) => v !== ComponentType.Group))(
      'Adds a new component to the layout when the given type is %s',
      (componentType) => {
        const id = 'newItemId';
        const layout = addItemOfType(mockInternal, componentType, id);
        expect(layout.components[id].itemType).toEqual('COMPONENT');
        expect(layout.components[id].type).toEqual(componentType);
      }
    );

    it('Adds a new container to the layout when the given type is Group', () => {
      const id = 'newGroupId';
      const layout = addItemOfType(mockInternal, ComponentType.Group, id);
      expect(layout.containers[id].itemType).toEqual('CONTAINER');
    });
  });
});
