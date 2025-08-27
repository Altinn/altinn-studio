import {
  addComponent,
  addContainer,
  addItemOfType,
  addNavigationButtons,
  createEmptyLayout,
  findParentId,
  getChildIds,
  getDepth,
  getItem,
  hasMultiPageGroup,
  hasNavigationButtons,
  hasSubContainers,
  isContainer,
  moveLayoutItem,
  removeComponent,
  removeComponentsByType,
  updateContainer,
  isComponentTypeValidChild,
  validateDepth,
} from './formLayoutUtils';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { IInternalLayout } from '../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { customDataPropertiesMock, customRootPropertiesMock } from '../testing/layoutMock';
import type { FormComponent } from '../types/FormComponent';
import type { FormContainer } from '../types/FormContainer';
import type { ContainerComponentType } from '../types/ContainerComponent';
import { ObjectUtils } from '@studio/pure-functions';
import {
  component3_1_1Id,
  component3_1Id,
  component3_2Id,
  component3Id,
  internalLayoutWithMultiPageGroup,
} from '../testing/layoutWithMultiPageGroupMocks';
import { containerComponentTypes } from '../data/containerComponentTypes';

// Test data:
const baseContainer: FormContainer = {
  id: BASE_CONTAINER_ID,
  index: 0,
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Group,
};
const customProperty = 'some-custom-property';
const headerId = '46882e2b-8097-4170-ad4c-32cdc156634e';
const headerComponent: FormComponent<ComponentTypeV3.Header> = {
  id: headerId,
  type: ComponentTypeV3.Header,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
  size: 'L',
};
const paragraphId = 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729';
const paragraphComponent: FormComponent<ComponentTypeV3.Paragraph> = {
  id: paragraphId,
  type: ComponentTypeV3.Paragraph,
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
  id: groupId,
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Group,
};
const paragraphInGroupId = 'group-paragraph';
const paragraphInGroupComponent: FormComponent<ComponentTypeV3.Paragraph> = {
  id: paragraphInGroupId,
  type: ComponentTypeV3.Paragraph,
  itemType: 'COMPONENT',
  textResourceBindings: {
    title: 'ServiceName',
  },
  dataModelBindings: {},
};
const groupInGroupId = 'group-child-container';
const groupInGroupContainer: FormContainer = {
  dataModelBindings: {},
  id: groupInGroupId,
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Group,
};
const buttonGroupId = 'button-group-container';
const buttonGroupContainer: FormContainer = {
  dataModelBindings: {},
  id: buttonGroupId,
  itemType: 'CONTAINER',
  type: ComponentTypeV3.ButtonGroup,
};
const paragraphInGroupInGroupId = 'group-child-paragraph';
const paragraphInGroupInGroupComponent: FormComponent<ComponentTypeV3.Paragraph> = {
  id: paragraphInGroupInGroupId,
  type: ComponentTypeV3.Paragraph,
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
    [groupInGroupId]: groupInGroupContainer,
    [buttonGroupId]: buttonGroupContainer,
  },
  order: {
    [BASE_CONTAINER_ID]: [headerId, paragraphId, groupId],
    [groupId]: [paragraphInGroupId, groupInGroupId],
    [groupInGroupId]: [paragraphInGroupInGroupId],
    [buttonGroupId]: [],
  },
  customRootProperties: customRootPropertiesMock,
  customDataProperties: customDataPropertiesMock,
};

describe('formLayoutUtils', () => {
  describe('hasNavigationButtons', () => {
    it('Returns true if navigation buttons are present', () => {
      const navigationButtonsId = 'navigationButtons';
      const navigationButtonsComponent: FormComponent<ComponentTypeV3.NavigationButtons> = {
        id: navigationButtonsId,
        itemType: 'COMPONENT',
        onClickAction: jest.fn(),
        type: ComponentTypeV3.NavigationButtons,
        dataModelBindings: {},
      };
      const layout: IInternalLayout = {
        containers: mockInternal.containers,
        components: {
          ...mockInternal.components,
          [navigationButtonsId]: navigationButtonsComponent,
        },
        order: {
          ...mockInternal.order,
          [BASE_CONTAINER_ID]: [...mockInternal.order[BASE_CONTAINER_ID], navigationButtonsId],
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
    const newComponent: FormComponent<ComponentTypeV3.Paragraph> = {
      id: 'newComponent',
      type: ComponentTypeV3.Paragraph,
      itemType: 'COMPONENT',
      dataModelBindings: {},
    };

    it('Adds component to the end of the base container by default', () => {
      const layout = addComponent(mockInternal, newComponent);
      expect(layout.components[newComponent.id]).toEqual(newComponent);
      expect(layout.order[BASE_CONTAINER_ID].slice(-1)[0]).toEqual(newComponent.id);
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(
        mockInternal.order[BASE_CONTAINER_ID].length + 1,
      );
    });

    it('Adds component to the given position of the given container', () => {
      const position = 1;
      const layout = addComponent(mockInternal, newComponent, groupId, position);
      expect(layout.components[newComponent.id]).toEqual(newComponent);
      expect(layout.order[groupId][position]).toEqual(newComponent.id);
      expect(layout.order[groupId].length).toEqual(mockInternal.order[groupId].length + 1);
    });

    it('Sets pageIndex to null if the parent element is not multipage', () => {
      const layout = addComponent(mockInternal, newComponent, groupId);
      expect(layout.components[newComponent.id].pageIndex).toBeNull();
    });

    it.each([
      [undefined, 1],
      [0, 0],
      [1, 0],
      [3, 1],
    ])(
      'Adds component to the same page as the previous element in the same group when the position is %s',
      (position, expectedPageIndex) => {
        const layout = addComponent(
          internalLayoutWithMultiPageGroup,
          newComponent,
          component3_1Id,
          position,
        );
        expect(layout.components[newComponent.id].pageIndex).toEqual(expectedPageIndex);
      },
    );
  });

  describe('addContainer', () => {
    const id = 'testId';
    const newContainer: FormContainer = { id, itemType: 'CONTAINER', type: ComponentTypeV3.Group };

    it('Adds container to the end of the base container by default', () => {
      const layout = addContainer(mockInternal, newContainer, id);
      expect(layout.containers[id]).toEqual(newContainer);
      expect(layout.order[BASE_CONTAINER_ID].slice(-1)[0]).toEqual(id);
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(
        mockInternal.order[BASE_CONTAINER_ID].length + 1,
      );
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

    it('Sets pageIndex to null if the parent element is not multipage', () => {
      const layout = addContainer(mockInternal, newContainer, id, groupId);
      expect(layout.containers[id].pageIndex).toBeNull();
    });

    it.each([
      [undefined, 1],
      [0, 0],
      [1, 0],
      [3, 1],
    ])(
      'Adds container to the same page as the previous element in the same group when the position is %s',
      (position, expectedPageIndex) => {
        const layout = addContainer(
          internalLayoutWithMultiPageGroup,
          newContainer,
          id,
          component3_1Id,
          position,
        );
        expect(layout.containers[id].pageIndex).toEqual(expectedPageIndex);
      },
    );
  });

  describe('updateContainer', () => {
    const containerId = groupId;
    const newContainerId = groupId + '-new';
    const updatedContainer: FormContainer = { ...groupContainer, id: newContainerId };

    it('Updates container based on the given container id', () => {
      const layout = updateContainer(mockInternal, updatedContainer, containerId);
      expect(layout.containers[newContainerId]).toEqual(updatedContainer);
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
      const layout = removeComponentsByType(mockInternal, ComponentTypeV3.Paragraph);
      expect(layout.components[paragraphId]).toBeUndefined();
      expect(layout.components[paragraphInGroupId]).toBeUndefined();
      expect(layout.components[paragraphInGroupInGroupId]).toBeUndefined();
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(
        mockInternal.order[BASE_CONTAINER_ID].length - 1,
      );
      expect(layout.order[groupId].length).toEqual(mockInternal.order[groupId].length - 1);
      expect(layout.order[groupInGroupId].length).toEqual(
        mockInternal.order[groupInGroupId].length - 1,
      );
    });
  });

  describe('addNavigationButtons', () => {
    it('Adds navigation buttons to the layout', () => {
      const id = 'navigationButtons';
      const layout = addNavigationButtons(mockInternal, id);
      expect(layout.components[id]).toBeDefined();
      expect(layout.components[id].type).toEqual(ComponentTypeV3.NavigationButtons);
      expect(layout.components[id].textResourceBindings).toEqual({
        next: undefined,
        back: undefined,
      });
      expect(layout.order[BASE_CONTAINER_ID].slice(-1)[0]).toEqual(id);
      expect(layout.order[BASE_CONTAINER_ID].length).toEqual(
        mockInternal.order[BASE_CONTAINER_ID].length + 1,
      );
    });

    it('Added NavigationButtons should contain expected properties', () => {
      const id = 'navigationButtons';
      const layout = addNavigationButtons(mockInternal, id);
      const navButtonsComponent = layout.components[id];
      const expectedProperties = [
        'id',
        'itemType',
        'onClickAction',
        'showBackButton',
        'textResourceBindings',
        'type',
        'pageIndex',
      ];

      expect(Object.keys(navButtonsComponent)).toEqual(expectedProperties);
    });
  });

  describe('moveLayoutItem', () => {
    it('Changes the order properties in order to move item to the given position', () => {
      const updatedLayout = moveLayoutItem(mockInternal, paragraphInGroupId, groupInGroupId, 1); // Move paragraphInGroupId to the second position in groupInGroupId
      expect(updatedLayout.order[groupId]).toEqual([groupInGroupId]); // Checks that paragraphInGroupId is no longer a part of this group
      expect(updatedLayout.order[groupInGroupId]).toEqual([
        paragraphInGroupInGroupId,
        paragraphInGroupId,
      ]); // Checks that paragraphInGroupId is now in the desired position of the target group
    });

    it('Adds page index if the item is moved to a multipage group', () => {
      const updatedLayout = moveLayoutItem(
        internalLayoutWithMultiPageGroup,
        component3_2Id,
        component3_1Id,
        1,
      );
      expect(updatedLayout.components[component3_2Id].pageIndex).toEqual(0);
    });

    it('Removes page index if the item is moved to a regular group', () => {
      const updatedLayout = moveLayoutItem(
        internalLayoutWithMultiPageGroup,
        component3_1_1Id,
        component3Id,
        0,
      );
      expect(updatedLayout.components[component3_1_1Id].pageIndex).toBeNull();
    });
  });

  describe('addItemOfType', () => {
    it.each(Object.values(ComponentTypeV3).filter((v) => !containerComponentTypes.includes(v)))(
      'Adds a new component to the layout when the given type is %s',
      (componentType) => {
        const id = 'newItemId';
        const layout = addItemOfType(mockInternal, componentType, id);
        expect(layout.components[id].itemType).toEqual('COMPONENT');
        expect(layout.components[id].type).toEqual(componentType);
      },
    );

    it.each(containerComponentTypes)(
      'Adds a new container to the layout when the given type is %s',
      (componentType: ContainerComponentType) => {
        const id = 'newItemId';
        const layout = addItemOfType(mockInternal, componentType, id);
        expect(layout.containers[id].itemType).toEqual('CONTAINER');
        expect(layout.containers[id].type).toEqual(componentType);
      },
    );
  });

  describe('isContainer', () => {
    it('Returns true if the given id is a container', () => {
      expect(isContainer(mockInternal, groupId)).toBe(true);
      expect(isContainer(mockInternal, groupInGroupId)).toBe(true);
    });

    it('Returns false if the given id is not a container', () => {
      expect(isContainer(mockInternal, paragraphId)).toBe(false);
      expect(isContainer(mockInternal, paragraphInGroupId)).toBe(false);
    });

    it('Returns false if the given id does not exist', () => {
      expect(isContainer(mockInternal, 'nonExistingId')).toBe(false);
    });
  });

  describe('hasSubContainers', () => {
    it('Returns true if the given container has sub containers', () => {
      expect(hasSubContainers(mockInternal, groupId)).toBe(true);
    });

    it('Returns false if the given container does not have sub containers', () => {
      expect(hasSubContainers(mockInternal, groupInGroupId)).toBe(false);
    });
  });

  describe('getDepth', () => {
    it('Returns 0 if only the base container is present', () => {
      const layout: IInternalLayout = createEmptyLayout();
      expect(getDepth(layout)).toBe(0);
    });

    it('Returns 1 if there is a group', () => {
      const id = 'test';
      const container: FormContainer = {
        id,
        itemType: 'CONTAINER',
        pageIndex: null,
        type: ComponentTypeV3.Group,
      };
      const layout: IInternalLayout = addContainer(createEmptyLayout(), container, id);
      expect(getDepth(layout)).toBe(1);
    });

    it('Returns 1 if there is a group with components only', () => {
      const id = 'test';
      const container: FormContainer = {
        id,
        itemType: 'CONTAINER',
        pageIndex: null,
        type: ComponentTypeV3.Group,
      };
      const containerId = 'sometestgroup';
      const component: FormComponent = {
        itemType: 'COMPONENT',
        type: ComponentTypeV3.Paragraph,
        id: 'sometestcomponent',
      };
      let layout: IInternalLayout = createEmptyLayout();
      layout = addContainer(layout, container, containerId);
      layout = addComponent(layout, component, containerId);
      expect(getDepth(layout)).toBe(1);
    });

    it('Returns 2 if there is a group within a group', () => {
      expect(getDepth(mockInternal)).toBe(2);
    });

    it('Returns 3 if there is a group within a group within a group', () => {
      let layout = ObjectUtils.deepCopy(mockInternal);
      const container: FormContainer = {
        id: groupInGroupId,
        itemType: 'CONTAINER',
        type: ComponentTypeV3.Group,
      };
      layout = addContainer(layout, container, 'groupingroupingroup', groupInGroupId);
      expect(getDepth(layout)).toBe(3);
    });
  });

  describe('validateDepth', () => {
    it('Returns true if the depth is valid', () => {
      expect(validateDepth(mockInternal)).toBe(true);
    });

    it('Returns false if the depth is invalid', () => {
      let layout = ObjectUtils.deepCopy(mockInternal);
      const container: FormContainer = {
        id: groupInGroupId,
        itemType: 'CONTAINER',
        type: ComponentTypeV3.Group,
      };
      layout = addContainer(layout, container, 'groupingroupingroup', groupInGroupId);
      expect(validateDepth(layout)).toBe(false);
    });
  });

  describe('isComponentTypeValidChild', () => {
    it('Returns true if the child is valid to given container', () => {
      expect(isComponentTypeValidChild(mockInternal, buttonGroupId, ComponentTypeV3.Button)).toBe(
        true,
      );
    });

    it('Returns true if the component is not dropped inside a container', () => {
      expect(
        isComponentTypeValidChild(mockInternal, BASE_CONTAINER_ID, ComponentTypeV3.ButtonGroup),
      ).toBe(true);
    });

    it('Returns false if the child is invalid for the given container', () => {
      expect(
        isComponentTypeValidChild(mockInternal, buttonGroupId, ComponentTypeV3.Paragraph),
      ).toBe(false);
    });
  });

  describe('getChildIds', () => {
    it('Returns the ids of the children of the given container', () => {
      expect(getChildIds(mockInternal, groupId)).toEqual([paragraphInGroupId, groupInGroupId]);
    });

    it('Returns an empty array when called with something that is not a container with children', () => {
      expect(getChildIds(mockInternal, headerId)).toEqual([]);
    });
  });

  describe('getItem', () => {
    it('Returns the item with the given id when it is a component', () => {
      expect(getItem(mockInternal, paragraphId)).toEqual(paragraphComponent);
    });

    it('Returns the item with the given id when it is a container', () => {
      expect(getItem(mockInternal, groupId)).toEqual(groupContainer);
    });
  });

  describe('hasMultiPageGroup', () => {
    it('Returns true if the layout contains a multi page group', () => {
      expect(hasMultiPageGroup(internalLayoutWithMultiPageGroup)).toBe(true);
    });

    it('Returns false if the layout does not contain a multi page group', () => {
      expect(hasMultiPageGroup(mockInternal)).toBe(false);
    });
  });
});
