import type {
  IInternalLayout,
  InternalLayoutComponents,
  InternalLayoutData,
  IToolbarElement,
} from '../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ArrayUtils, ObjectUtils } from '@studio/pure-functions';
import { ComponentType, type CustomComponentType } from 'app-shared/types/ComponentType';
import type { FormComponent } from '../types/FormComponent';
import { generateFormItem } from './component';
import type { FormItemConfigs } from '../data/formItemConfig';
import { formItemConfigs, allComponents, defaultComponents } from '../data/formItemConfig';
import type { FormContainer } from '../types/FormContainer';
import type { FormItem } from '../types/FormItem';
import * as formItemUtils from './formItemUtils';
import type { ContainerComponentType } from '../types/ContainerComponent';
import type { FormLayoutPage } from '../types/FormLayoutPage';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const mapComponentToToolbarElement = <T extends ComponentType | CustomComponentType>(
  c: FormItemConfigs[T],
): IToolbarElement => ({
  label: c.name,
  icon: c.icon,
  type: c.name,
});

/**
 * Checks if a layout has navigation buttons.
 * @param layout The layout to check.
 * @returns True if the layout has navigation buttons, false otherwise.
 */
export const hasNavigationButtons = (layout: IInternalLayout): boolean => {
  const { components } = layout;
  return Object.values(components)
    .map(({ type }) => type)
    .includes(ComponentType.NavigationButtons);
};

/**
 * Finds the id of a component or a container's parent container.
 * @param layout The layout in which the component is located.
 * @param itemId The id of the component or container.
 * @returns The id of the container that contains the component.
 */
export const findParentId = (layout: IInternalLayout, itemId: string): string => {
  const { order } = layout;
  return Object.keys(order).find((key) => order[key].includes(itemId));
};

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
  const newLayout = ObjectUtils.deepCopy(layout);
  component.pageIndex = calculateNewPageIndex(newLayout, containerId, position);
  newLayout.components[component.id] = component;
  if (position < 0) newLayout.order[containerId].push(component.id);
  else newLayout.order[containerId].splice(position, 0, component.id);
  return newLayout;
};

/**
 * Returns a page index for the new component if it is inside a multi page container.
 * Currently we do not support managing page indices in Studio, so this will default to the page index of the previous component.
 * @param layout
 * @param containerId
 * @param position
 */
const calculateNewPageIndex = (
  layout: IInternalLayout,
  containerId: string,
  position: number,
): number => {
  const parent = layout.containers[containerId];
  const isParentMultiPage = parent.type === ComponentType.RepeatingGroup && parent?.edit?.multiPage;
  if (!isParentMultiPage) return null;
  const previousComponentPosition = findPositionOfPreviousComponent(layout, containerId, position);
  if (previousComponentPosition === undefined) return 0;
  const previousComponentId = layout.order[containerId][previousComponentPosition];
  const previousComponent = getItem(layout, previousComponentId);
  return previousComponent?.pageIndex;
};

const findPositionOfPreviousComponent = (
  layout: IInternalLayout,
  containerId: string,
  position: number,
): number | undefined => {
  switch (position) {
    case 0:
      return undefined;
    case -1:
      return layout.order[containerId].length - 1;
    default:
      return position - 1;
  }
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
export const addContainer = <T extends ContainerComponentType>(
  layout: IInternalLayout,
  container: FormContainer<T>,
  id: string,
  parentId: string = BASE_CONTAINER_ID,
  position: number = -1,
): IInternalLayout => {
  const newLayout = ObjectUtils.deepCopy(layout);
  container.pageIndex = calculateNewPageIndex(newLayout, parentId, position);
  newLayout.containers[id] = container as FormContainer<T>;
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
export const updateContainer = <T extends ContainerComponentType>(
  layout: IInternalLayout,
  updatedContainer: FormContainer<T>,
  containerId: string,
): IInternalLayout => {
  const oldLayout: IInternalLayout = ObjectUtils.deepCopy(layout);

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
      [newId]: updatedContainer as FormContainer<T>,
    },
  };
};

/**
 * Removes a component from a layout.
 * @param layout The layout to remove the component from.
 * @param componentId The id of the component to remove.
 * @returns The new layout.
 */
export const removeComponent = (layout: IInternalLayout, componentId: string): IInternalLayout => {
  const newLayout = ObjectUtils.deepCopy(layout);
  const containerId = findParentId(layout, componentId);
  if (containerId) {
    newLayout.order[containerId] = ArrayUtils.removeItemByValue(
      newLayout.order[containerId],
      componentId,
    );
    delete newLayout.components[componentId];
  }
  return newLayout;
};

/**
 * Removes all components of a given type from a layout.
 * @param layout The layout to remove the components from.
 * @param componentType The type of the components to remove.
 * @returns The new layout.
 */
export const removeComponentsByType = (
  layout: IInternalLayout,
  componentType: ComponentType,
): IInternalLayout => {
  let newLayout = layout;
  Object.keys(layout.components)
    .filter((id) => layout.components[id].type === componentType)
    .forEach((id) => {
      newLayout = removeComponent(newLayout, id);
    });
  return newLayout;
};

/**
 * Adds a navigation button component to the end of the base container of a layout.
 * @param layout The layout to add the component to.
 * @param id The id of the new component.
 * @returns The new layout.
 */
export const addNavigationButtons = (layout: IInternalLayout, id: string): IInternalLayout => {
  const navigationButtons: FormComponent = {
    id,
    itemType: 'COMPONENT',
    onClickAction: () => {},
    showBackButton: true,
    textResourceBindings: { next: undefined, back: undefined },
    type: ComponentType.NavigationButtons,
  };
  return addComponent(layout, navigationButtons);
};

/**
 * Creates a layout with no components.
 * @returns The empty layout.
 */
export const createEmptyLayout = (): IInternalLayout => ({
  ...createEmptyLayoutData(),
  customRootProperties: {},
});

export const createEmptyLayoutData = (): InternalLayoutData => ({
  ...createEmptyComponentStructure(),
  customDataProperties: {},
});

export const createEmptyComponentStructure = (): InternalLayoutComponents => ({
  components: {},
  containers: {
    [BASE_CONTAINER_ID]: {
      id: BASE_CONTAINER_ID,
      index: 0,
      itemType: 'CONTAINER',
      type: undefined,
      pageIndex: null,
    },
  },
  order: {
    [BASE_CONTAINER_ID]: [],
  },
});

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
  const newLayout = ObjectUtils.deepCopy(layout);
  const oldContainerId = findParentId(layout, id);
  const item = getItem(newLayout, id);
  item.pageIndex = calculateNewPageIndex(newLayout, newContainerId, newPosition);
  if (oldContainerId) {
    newLayout.order[oldContainerId] = ArrayUtils.removeItemByValue(
      newLayout.order[oldContainerId],
      id,
    );
    newLayout.order[newContainerId] = ArrayUtils.insertArrayElementAtPos(
      newLayout.order[newContainerId],
      id,
      newPosition,
    );
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
export const addItemOfType = <T extends ComponentType | CustomComponentType>(
  layout: IInternalLayout,
  componentType: T,
  id: string,
  parentId: string = BASE_CONTAINER_ID,
  position: number = -1,
): IInternalLayout => {
  const newItem: FormItem<T> = generateFormItem<T>(componentType, id);
  return newItem.itemType === 'CONTAINER'
    ? addContainer(layout, newItem, id, parentId, position)
    : addComponent(layout, newItem, parentId, position);
};

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
  else
    return 1 + Math.max(...layout.order[itemId].map((id) => numberOfContainerLevels(layout, id)));
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

export const isComponentTypeValidChild = (
  layout: IInternalLayout,
  parentId: string,
  componentType: ComponentType,
): boolean => {
  if (parentId === BASE_CONTAINER_ID) return true;
  const parent = getItem(layout, parentId);
  if (!formItemUtils.isContainer(parent)) return false;
  const parentTypeConfig = formItemConfigs[parent.type];
  return parentTypeConfig.validChildTypes?.includes(componentType);
};

export const getChildIds = (layout: IInternalLayout, parentId: string): string[] =>
  layout.order?.[parentId] || [];

/**
 * Recursively finds all the children of a container.
 * @param layout The layout to search in.
 * @param parentId The id of the container to find all children of.
 * @returns An array of all the children of the container.
 */
export const getAllDescendants = (layout: IInternalLayout, parentId: string): string[] =>
  getChildIds(layout, parentId).flatMap((id) =>
    ArrayUtils.prepend(getAllDescendants(layout, id), id),
  );

export const getItem = (layout: IInternalLayout, itemId: string): FormComponent | FormContainer =>
  layout.components[itemId] || layout.containers[itemId];

export const hasMultiPageGroup = (layout: IInternalLayout): boolean =>
  Object.values(layout.containers).some(
    (container) => container.type === ComponentType.RepeatingGroup && container.edit?.multiPage,
  );

export const isItemChildOfContainer = (
  layout: IInternalLayout,
  itemId: string,
  containerType?: ContainerComponentType,
): boolean => {
  const parentId = findParentId(layout, itemId);
  if (parentId === BASE_CONTAINER_ID || !parentId) return false;
  const parent = getItem(layout, parentId);
  return !containerType || parent.type === containerType;
};

/**
 * Checks if a component with the given id exists in the given layout.
 * @param id The id of the component to check for.
 * @param layout The layout to check.
 * @returns True if the id exists in the layout, false otherwise.
 */
export const idExistsInLayout = (id: string, layout: IInternalLayout): boolean =>
  Object.keys(layout.components || {}).some((key) => key.toUpperCase() === id.toUpperCase()) ||
  Object.keys(layout.containers || {}).some((key) => key.toUpperCase() === id.toUpperCase());

/**
 * Checks if there are components with duplicated ids in the layout.
 * @param layout The layout to check.
 * @returns True if some items in the array are duplicated and false otherwise.
 */
export const duplicatedIdsExistsInLayout = (layout: IInternalLayout): boolean => {
  if (!layout?.order) return false;
  const idsInLayout = ObjectUtils.flattenObjectValues(layout.order);
  return !ArrayUtils.areItemsUnique(idsInLayout);
};

/**
 * Checks if there are component with duplicated ids across all layouts in the layoutset.
 * @param layouts The layouts to check.
 * @returns dublicated layouts.
 */
export const findLayoutsContainingDuplicateComponents = (
  layouts: Record<string, IInternalLayout>,
) => {
  const componentMap = new Map<string, string>();
  const duplicateLayouts = new Set<string>();
  const duplicateComponents = new Set<string>();

  const layoutPages: FormLayoutPage[] = Object.keys(layouts).map((key) => ({
    page: key,
    data: layouts[key],
  }));
  layoutPages.forEach(({ page, data }) => {
    const components = ObjectUtils.flattenObjectValues(data.order);
    components.forEach((component) => {
      if (componentMap.has(component)) {
        duplicateLayouts.add(page);
        duplicateLayouts.add(componentMap.get(component));
        duplicateComponents.add(component);
      } else {
        componentMap.set(component, page);
      }
    });
  });
  return {
    duplicateLayouts: [...duplicateLayouts],
    duplicateComponents: [...duplicateComponents],
  };
};

/**
 * Get the duplicated ids in the layout
 * @param layout The layout to check
 * @returns An array of unique duplicated ids
 */
export const getDuplicatedIds = (layout: IInternalLayout): string[] => {
  const idsInLayout = ObjectUtils.flattenObjectValues(layout.order);
  const duplicatedIds = idsInLayout.filter((id, index) => idsInLayout.indexOf(id) !== index);
  const uniqueDuplicatedIds = Array.from(new Set(duplicatedIds));
  return uniqueDuplicatedIds;
};

/**
 * Get all (valid) ids in the layout
 * @param layout The layout
 * @returns An array of all ids in the layout
 * */
export const getAllFormItemIds = (layout: IInternalLayout): string[] =>
  ObjectUtils.flattenObjectValues(layout.order);

/**
 * Gets all available componenent types to add for a given container
 * @param layout
 * @param containerId
 * @returns
 */
export const getAvailableChildComponentsForContainer = (
  layout: IInternalLayout,
  containerId: string,
): KeyValuePairs<IToolbarElement[]> => {
  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {};

  if (containerId !== BASE_CONTAINER_ID) {
    const containerType = layout.containers[containerId].type;
    if (formItemConfigs[containerType]?.validChildTypes) {
      Object.keys(allComponents).forEach((key) => {
        const componentListForKey = [];
        allComponents[key].forEach((element: ComponentType) => {
          if (formItemConfigs[containerType].validChildTypes.includes(element)) {
            componentListForKey.push(mapComponentToToolbarElement(formItemConfigs[element]));
          }
        });

        if (componentListForKey.length > 0) {
          allComponentLists[key] = componentListForKey;
        }
      });
    }
  } else {
    Object.keys(allComponents).forEach((key) => {
      allComponentLists[key] = allComponents[key].map((element: ComponentType) =>
        mapComponentToToolbarElement(formItemConfigs[element]),
      );
    });
  }
  return allComponentLists;
};

/**
 * Gets all default componenent types to add for a given container
 * @param layout
 * @param containerId
 * @returns
 */
export const getDefaultChildComponentsForContainer = (
  layout: IInternalLayout,
  containerId: string,
): IToolbarElement[] => {
  if (containerId !== BASE_CONTAINER_ID) {
    const containerType = layout.containers[containerId].type;
    if (
      formItemConfigs[containerType]?.validChildTypes &&
      formItemConfigs[containerType].validChildTypes.length < 10
    ) {
      return formItemConfigs[containerType].validChildTypes.map((element: ComponentType) =>
        mapComponentToToolbarElement(formItemConfigs[element]),
      );
    }
  }
  const defaultComponentLists: IToolbarElement[] = [];
  defaultComponents.forEach((element) => {
    defaultComponentLists.push(mapComponentToToolbarElement(formItemConfigs[element]));
  });
  return defaultComponentLists;
};

/**
 * Get all components in the given layout
 * @param layout The layout
 * @param excludeTypes Optional array to exclude certain component types
 * @returns An array of all components in the layout, excluding the types in the excludeTypes array
 * */
export const getAllLayoutComponents = (
  layout: IInternalLayout,
  excludeTypes?: ComponentType[],
): (FormComponent | FormContainer)[] => {
  const components = Object.values(layout.components).filter(
    (component) => !excludeTypes || !excludeTypes.includes(component.type),
  );
  const containers = Object.values(layout.containers).filter(
    (container) =>
      container.type !== undefined && (!excludeTypes || !excludeTypes.includes(container.type)),
  );
  return [...containers, ...components];
};
