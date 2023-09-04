import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IInternalLayout,
  IToolbarElement,
} from '../types/global';
import { BASE_CONTAINER_ID, MAX_NESTED_GROUP_LEVEL } from 'app-shared/constants';
import { deepCopy } from 'app-shared/pure';
import { insertArrayElementAtPos, removeItemByValue } from 'app-shared/utils/arrayUtils';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FormComponent } from '../types/FormComponent';
import { generateFormItem } from './component';
import { FormItemConfigs, formItemConfigs } from '../data/formItemConfig';
import { FormContainer } from '../types/FormContainer';
import { ExternalComponent, ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';

export function convertFromLayoutToInternalFormat(formLayout: ExternalFormLayout): IInternalLayout {
  const convertedLayout: IInternalLayout = createEmptyLayout();

  if (!formLayout || !formLayout.data) return convertedLayout;

  const formLayoutCopy: ExternalFormLayout = deepCopy(formLayout);
  const { data, $schema, ...customRootProperties } = formLayoutCopy;
  const { layout, ...customDataProperties } = data;

  for (const element of topLevelComponents(layout)) {
    if (element.type !== ComponentType.Group) {
      const { id, ...rest } = element;
      if (!rest.type && rest.component) {
        rest.type = rest.component;
        delete rest.component;
      }
      rest.itemType = 'COMPONENT';
      rest.propertyPath = formItemConfigs[rest.type].defaultProperties.propertyPath;
      convertedLayout.components[id] = {
        id,
        ...rest
      } as FormComponent;
      convertedLayout.order[BASE_CONTAINER_ID].push(id);
    } else {
      extractChildrenFromGroup(element, layout, convertedLayout);
      convertedLayout.order[BASE_CONTAINER_ID].push(element.id);
    }
  }
  return {
    ...convertedLayout,
    customRootProperties,
    customDataProperties,
  };
}

/**
 * Takes a layout and removes the components in it that belong to groups. This returns
 * only the top-level layout components.
 */
export function topLevelComponents(layout: ExternalComponent[]): ExternalComponent[] {
  const inGroup = new Set<string>();
  layout.forEach((component) => {
    if (component.type === ComponentType.Group) {
      const childList = component.edit?.multiPage
        ? component.children?.map((childId) => childId.split(':')[1] || childId)
        : component.children;
      childList?.forEach((childId) => inGroup.add(childId));
    }
  });
  return layout.filter((component) => !inGroup.has(component.id));
}

/**
 * Creates an external form layout with the given components.
 * @param layout The components to add to the layout.
 * @param customRootProperties Custom properties to add to the root of the layout.
 * @param customDataProperties Custom properties to add to the data object of the layout.
 * @returns The external form layout.
 */
const createExternalLayout = (
  layout: ExternalComponent[],
  customRootProperties: KeyValuePairs,
  customDataProperties: KeyValuePairs,
): ExternalFormLayout => ({
  ...customRootProperties,
  $schema: layoutSchemaUrl(),
  data: { ...customDataProperties, layout },
});

export function convertInternalToLayoutFormat(internalFormat: IInternalLayout): ExternalFormLayout {
  const formLayout: ExternalComponent[] = [];

  if (!internalFormat) return createExternalLayout(formLayout, {}, {});

  const {
    components,
    containers,
    order,
    customRootProperties,
    customDataProperties,
  } = deepCopy(internalFormat);

  if (!containers) return createExternalLayout(formLayout, customRootProperties, customDataProperties);

  const containerIds = Object.keys(containers);
  if (!containerIds.length) return createExternalLayout(formLayout, customRootProperties, customDataProperties);

  let groupChildren: string[] = [];
  Object.keys(order).forEach((groupKey: string) => {
    if (groupKey !== BASE_CONTAINER_ID) {
      groupChildren = groupChildren.concat(order[groupKey]);
    }
  });

  for (const id of order[BASE_CONTAINER_ID]) {
    if (components[id] && !groupChildren.includes(id)) {
      delete components[id].itemType;
      delete components[id].propertyPath;
      formLayout.push({
        id,
        type: components[id].type,
        ...components[id],
      });
    } else if (containers[id]) {
      const { itemType, propertyPath, ...restOfGroup } = containers[id];
      formLayout.push({
        id,
        type: ComponentType.Group,
        children: order[id],
        ...restOfGroup,
      });
      order[id].forEach((componentId: string) => {
        if (components[componentId]) {
          delete components[componentId].itemType;
          delete components[componentId].propertyPath;
          formLayout.push({
            id: componentId,
            type: components[componentId].type,
            ...components[componentId],
          });
        } else {
          extractChildrenFromGroupInternal(components, containers, order, formLayout, componentId);
        }
      });
    }
  }
  return createExternalLayout(formLayout, customRootProperties, customDataProperties);
}

function extractChildrenFromGroupInternal(
  components: IFormDesignerComponents,
  containers: IFormDesignerContainers,
  order: IFormLayoutOrder,
  formLayout: ExternalComponent[],
  groupId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { itemType, propertyPath, ...restOfGroup } = containers[groupId];
  formLayout.push({
    id: groupId,
    type: ComponentType.Group,
    children: order[groupId],
    ...restOfGroup,
  });
  order[groupId].forEach((childId: string) => {
    if (components[childId]) {
      delete components[childId].itemType;
      delete components[childId].propertyPath;
      formLayout.push({
        id: childId,
        ...components[childId],
      });
    } else {
      extractChildrenFromGroupInternal(components, containers, order, formLayout, childId);
    }
  });
}

export function extractChildrenFromGroup(
  group: ExternalComponent,
  components: ExternalComponent[],
  convertedLayout: IInternalLayout
) {
  const { id, children, type, ...restOfGroup } = group;
  convertedLayout.containers[id] = {
    ...restOfGroup,
    itemType: 'CONTAINER',
    propertyPath: formItemConfigs[type].defaultProperties.propertyPath,
  };
  convertedLayout.order[id] = children || [];
  children?.forEach((componentId: string) => {
    const component: ExternalComponent =
      components.find((candidate: ExternalComponent) => candidate.id === componentId);
    if (component.type === 'Group') {
      extractChildrenFromGroup(component, components, convertedLayout);
    } else {
      convertedLayout.components[componentId] = {
        ...component,
        itemType: 'COMPONENT',
        propertyPath: formItemConfigs[component.type].defaultProperties.propertyPath,
      } as FormComponent;
    }
  });
}

export const mapComponentToToolbarElement = <T extends ComponentType>(c: FormItemConfigs[T]): IToolbarElement => ({
  label: c.name,
  icon: c.icon,
  type: c.name,
});

export function idExists(
  id: string,
  components: IFormDesignerComponents,
  containers: IFormDesignerContainers
): boolean {
  return (
    Object.keys(containers || {}).findIndex((key) => key.toUpperCase() === id.toUpperCase()) > -1 ||
    Object.keys(components || {}).findIndex((key) => key.toUpperCase() === id.toUpperCase()) > -1
  );
}

/**
 * Checks if a layout has navigation buttons.
 * @param layout The layout to check.
 * @returns True if the layout has navigation buttons, false otherwise.
 */
export const hasNavigationButtons = (layout: IInternalLayout): boolean => {
  const { components } = layout;
  return Object.values(components).map(({ type }) => type).includes(ComponentType.NavigationButtons);
}

/**
 * Finds the id of a component or a container's parent container.
 * @param layout The layout in which the component is located.
 * @param itemId The id of the component or container.
 * @returns The id of the container that contains the component.
 */
export const findParentId = (layout: IInternalLayout, itemId: string): string => {
  const { order } = layout;
  return Object.keys(order).find((key) => order[key].includes(itemId));
}

/**
 * Adds a component to a layout.
 * @param layout The layout to add the component to.
 * @param component The component to add.
 * @param containerId The id of the container to add the component to. Defaults to the base container id.
 * @param position The desired index of the component within its container. Set it to a negative value to add it at the end. Defaults to -1.
 * @returns The new layout.
 */
export const addComponent = (
  layout: IInternalLayout,
  component: FormComponent,
  containerId: string = BASE_CONTAINER_ID,
  position: number = -1,
): IInternalLayout => {
  const newLayout = deepCopy(layout);
  newLayout.components[component.id] = component;
  if (position < 0) newLayout.order[containerId].push(component.id);
  else newLayout.order[containerId].splice(position, 0, component.id);
  return newLayout;
};

/**
 * Adds a container to a layout.
 * @param layout The layout to add the container to.
 * @param container The container to add.
 * @param id The id of the container.
 * @param parentId The id of the container's parent container. Defaults to the base container id.
 * @param position The desired index of the container within its parent container. Set it to a negative value to add it at the end. Defaults to -1.
 * @returns The new layout.
 */
export const addContainer = (
  layout: IInternalLayout,
  container: FormContainer,
  id: string,
  parentId: string = BASE_CONTAINER_ID,
  position: number = -1,
): IInternalLayout => {
  const newLayout = deepCopy(layout);
  newLayout.containers[id] = container;
  newLayout.order[id] = [];
  if (position < 0) newLayout.order[parentId].push(id);
  else newLayout.order[parentId].splice(position, 0, id);
  return newLayout;
};

/**
 * Updates a container.
 * @param layout The layout to update.
 * @param updatedContainer The updated container.
 * @param containerId The current id of the updated container.
 * @returns The new layout.
 */
export const updateContainer = (
  layout: IInternalLayout,
  updatedContainer: FormContainer,
  containerId: string,
): IInternalLayout => {
  const oldLayout: IInternalLayout = deepCopy(layout);

  const currentId = containerId;
  const newId = updatedContainer.id || currentId;

  if (currentId !== newId) {
    // Update component ID:
    oldLayout.containers[newId] = {
      ...oldLayout.containers[currentId],
    };
    delete oldLayout.containers[currentId];

    // Update ID in parent container order:
    const parentContainer = Object.keys(oldLayout.order).find((containerId: string) => {
      return oldLayout.order[containerId].indexOf(currentId) > -1;
    });
    if (parentContainer) {
      const parentContainerOrder = oldLayout.order[parentContainer];
      const containerIndex = parentContainerOrder.indexOf(currentId);
      parentContainerOrder[containerIndex] = newId;
    }

    // Update ID of the containers order array:
    oldLayout.order[newId] = layout.order[currentId];
    delete oldLayout.order[currentId];
  }

  return {
    ...oldLayout,
    containers: {
      ...oldLayout.containers,
      [newId]: {
        ...oldLayout.containers[newId],
        ...updatedContainer,
      }
    }
  };
}

/**
 * Removes a component from a layout.
 * @param layout The layout to remove the component from.
 * @param componentId The id of the component to remove.
 * @returns The new layout.
 */
export const removeComponent = (layout: IInternalLayout, componentId: string): IInternalLayout => {
  const newLayout = deepCopy(layout);
  const containerId = findParentId(layout, componentId);
  if (containerId) {
    newLayout.order[containerId] = removeItemByValue(newLayout.order[containerId], componentId);
    delete newLayout.components[componentId];
  }
  return newLayout;
}

/**
 * Removes all components of a given type from a layout.
 * @param layout The layout to remove the components from.
 * @param componentType The type of the components to remove.
 * @returns The new layout.
 */
export const removeComponentsByType = (layout: IInternalLayout, componentType: ComponentType): IInternalLayout => {
  let newLayout = layout;
  Object
    .keys(layout.components)
    .filter((id) => layout.components[id].type === componentType)
    .forEach((id) => {
      newLayout = removeComponent(newLayout, id);
    });
  return newLayout;
}

/**
 * Adds a navigation button component to the end of the base container of a layout.
 * @param layout The layout to add the component to.
 * @param id The id of the new component.
 * @returns The new layout.
 */
export const addNavigationButtons = (layout: IInternalLayout, id: string): IInternalLayout => {
  const navigationButtons: FormComponent = {
    componentType: ComponentType.NavigationButtons,
    dataModelBindings: {},
    id,
    itemType: 'COMPONENT',
    onClickAction: () => {},
    showBackButton: true,
    textResourceBindings: { next: undefined, back: undefined, },
    type: ComponentType.NavigationButtons,
  };
  return addComponent(layout, navigationButtons);
}

/**
 * Creates a layout with no components.
 * @returns The empty layout.
 */
export const createEmptyLayout = (): IInternalLayout => (
  {
    components: {},
    containers: {
      [BASE_CONTAINER_ID]: {
        index: 0,
        itemType: 'CONTAINER',
      }
    },
    order: {
      [BASE_CONTAINER_ID]: [],
    },
    customRootProperties: {},
    customDataProperties: {},
  }
);

/**
 * Moves an item to another position.
 * @param layout The layout to move the item in.
 * @param id The id of the item to move.
 * @param newContainerId The id of the container to move the item to.
 * @param newPosition The desired index of the item within its new container.
 * @returns The new layout.
 */
export const moveLayoutItem = (
  layout: IInternalLayout,
  id: string,
  newContainerId: string = BASE_CONTAINER_ID,
  newPosition: number = 0,
): IInternalLayout => {
  const newLayout = deepCopy(layout);
  const oldContainerId = findParentId(layout, id);
  if (oldContainerId) {
    newLayout.order[oldContainerId] = removeItemByValue(newLayout.order[oldContainerId], id);
    newLayout.order[newContainerId] = insertArrayElementAtPos(newLayout.order[newContainerId], id, newPosition);
  }
  return newLayout;
};

/**
 * Adds a component of a given type to a layout.
 * @param layout The layout to add the component to.
 * @param componentType The type of the component to add.
 * @param id The id of the new component.
 * @param parentId The id of the container to add the component to. Defaults to the base container id.
 * @param position The desired index of the component within its container. Set it to a negative value to add it at the end. Defaults to -1.
 * @returns The new layout.
 */
export const addItemOfType = <T extends ComponentType>(
  layout: IInternalLayout,
  componentType: T,
  id: string,
  parentId: string = BASE_CONTAINER_ID,
  position: number = -1,
): IInternalLayout => {
  const newItem = generateFormItem<T>(componentType, id);
  if (newItem.itemType === 'COMPONENT') return addComponent(layout, newItem, parentId, position);
  else return addContainer(layout, newItem, id, parentId, position);
}

/**
 * Checks if a given item is a container.
 * @param layout The layout where the item should be found.
 * @param itemId The id of the item to check.
 * @returns True if the item is a container, false otherwise.
 */
export const isContainer = (layout: IInternalLayout, itemId: string): boolean =>
  Object.keys(layout.containers).includes(itemId);

/**
 * Checks if a given container has sub containers.
 * @param layout The layout where the container should be found.
 * @param itemId The id of the container to check.
 * @returns True if the container has sub containers, false otherwise.
 */
export const hasSubContainers = (layout: IInternalLayout, itemId: string): boolean =>
  isContainer(layout, itemId) && layout.order[itemId].some((id) => isContainer(layout, id));

/**
 * Calculates the deepness of the given container.
 * @param layout The layout of interest.
 * @param itemId The id of the container of interest.
 * @returns The number of the deepest level within the container.
 */
const numberOfContainerLevels = (layout: IInternalLayout, itemId: string): number => {
  if (!isContainer(layout, itemId) || !hasSubContainers(layout, itemId)) return 0;
  else return 1 + Math.max(...layout.order[itemId].map((id) => numberOfContainerLevels(layout, id)));
};

/**
 * Calculate the deepest level of a nested container in the layout.
 * @param layout The layout to calculate the deepness of.
 * @returns The deepest level of a nested container.
 */
export const getDepth = (layout: IInternalLayout): number => {
  const containers = Object.keys(layout.containers);
  if (containers.length <= 1) return 0;
  else return Math.max(...containers.map((id) => numberOfContainerLevels(layout, id)));
};

/**
 * Checks if the depth of a layout is within the allowed range.
 * @param layout The layout to check.
 * @returns True if the depth is within the allowed range, false otherwise.
 */
export const validateDepth = (layout: IInternalLayout): boolean =>
  getDepth(layout) <= MAX_NESTED_GROUP_LEVEL;
