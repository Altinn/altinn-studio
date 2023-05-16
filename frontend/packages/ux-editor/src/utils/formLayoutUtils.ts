import type { Dispatch } from 'redux';
import type { IComponent } from '../components';
import { ComponentType } from '../components';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type {
  IExternalFormLayout,
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IInternalLayout,
  IToolbarElement,
  IWidget,
} from '../types/global';
import { IExternalComponent, LayoutItemType } from '../types/global';
import i18next from 'i18next';
import { useAddFormComponentMutation } from '../hooks/mutations/useAddFormComponentMutation';
import { useAddFormContainerMutation } from '../hooks/mutations/useAddFormContainerMutation';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { deepCopy } from 'app-shared/pure';
import { removeItemByValue } from 'app-shared/utils/arrayUtils';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { FormComponent } from '../types/FormComponent';

const { addWidget } = FormLayoutActions;

export function convertFromLayoutToInternalFormat(formLayout: IExternalFormLayout): IInternalLayout {
  const convertedLayout: IInternalLayout = createEmptyLayout();

  if (!formLayout || !formLayout.data) return convertedLayout;

  const formLayoutCopy: IExternalFormLayout = deepCopy(formLayout);
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
export function topLevelComponents(layout: IExternalComponent[]): IExternalComponent[] {
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
  layout: IExternalComponent[],
  customRootProperties: KeyValuePairs,
  customDataProperties: KeyValuePairs,
): IExternalFormLayout => ({
  ...customRootProperties,
  $schema: layoutSchemaUrl(),
  data: { ...customDataProperties, layout },
});

export function convertInternalToLayoutFormat(internalFormat: IInternalLayout): IExternalFormLayout {
  const formLayout: IExternalComponent[] = [];

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
      formLayout.push({
        id,
        type: components[id].type,
        ...components[id],
      });
    } else if (containers[id]) {
      const { itemType, ...restOfGroup } = containers[id];
      formLayout.push({
        id,
        type: ComponentType.Group,
        children: order[id],
        ...restOfGroup,
      });
      order[id].forEach((componentId: string) => {
        if (components[componentId]) {
          delete components[componentId].itemType;
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
  formLayout: IExternalComponent[],
  groupId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { itemType, ...restOfGroup } = containers[groupId];
  formLayout.push({
    id: groupId,
    type: ComponentType.Group,
    children: order[groupId],
    ...restOfGroup,
  });
  order[groupId].forEach((childId: string) => {
    if (components[childId]) {
      delete components[childId].itemType;
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
  group: IExternalComponent,
  components: IExternalComponent[],
  convertedLayout: IInternalLayout
) {
  const { id, children, type, ...restOfGroup } = group;
  convertedLayout.containers[id] = {
    ...restOfGroup,
    itemType: 'CONTAINER',
  };
  convertedLayout.order[id] = children || [];
  children?.forEach((componentId: string) => {
    const component: IExternalComponent =
      components.find((candidate: IExternalComponent) => candidate.id === componentId);
    if (component.type === 'Group') {
      extractChildrenFromGroup(component, components, convertedLayout);
    } else {
      convertedLayout.components[componentId] = {
        ...component,
        itemType: 'COMPONENT',
      } as FormComponent;
    }
  });
}

export const mapWidgetToToolbarElement = (
  widget: IWidget,
  order: IFormLayoutOrder,
  t: typeof i18next.t,
  dispatch: Dispatch
): IToolbarElement => {
  return {
    label: t(widget.displayName),
    icon: 'fa fa-3rd-party-alt',
    type: widget.displayName,
    actionMethod: (containerId: string, position: number) => {
      dispatch(
        addWidget({
          widget,
          position,
          containerId,
        })
      );
    },
  };
};

export const mapComponentToToolbarElement = (
  c: IComponent,
  t: typeof i18next.t,
  order: IFormLayoutOrder,
  dispatch: Dispatch,
  addFormComponentMutation: ReturnType<typeof useAddFormComponentMutation>,
  addFormContainerMutation: ReturnType<typeof useAddFormContainerMutation>,
): IToolbarElement => {
  const customProperties = c.customProperties || {};
  let actionMethod = (containerId: string, position: number) => {
    addFormComponentMutation.mutate({
      component: {
        type: c.name,
        itemType: LayoutItemType.Component,
        textResourceBindings:
          c.name === 'Button'
            ? { title: t('ux_editor.modal_properties_button_type_submit') }
            : {},
        dataModelBindings: {},
        ...deepCopy(customProperties),
      },
      position,
      containerId,
    });
  };

  if (c.name === ComponentType.Group) {
    actionMethod = (containerId: string, index: number) => {
      addFormContainerMutation.mutate({
        container: {
          maxCount: 0,
          dataModelBindings: {},
          itemType: 'CONTAINER',
        },
        positionAfterId: null,
        addToId: containerId,
        callback: null,
        destinationIndex: index,
      });
    };
  }
  return {
    label: c.name,
    icon: c.Icon,
    type: c.name,
    actionMethod,
  } as IToolbarElement;
};

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

export const validComponentId = /^[0-9a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/;

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
 * Finds the id of the container that contains a given component.
 * @param layout The layout in which the component is located.
 * @param componentId The id of the component.
 * @returns The id of the container that contains the component.
 */
export const findContainerId = (layout: IInternalLayout, componentId: string): string => {
  const { order } = layout;
  return Object.keys(order).find((key) => order[key].includes(componentId));
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
}

/**
 * Removes a component from a layout.
 * @param layout The layout to remove the component from.
 * @param componentId The id of the component to remove.
 * @returns The new layout.
 */
export const removeComponent = (layout: IInternalLayout, componentId: string): IInternalLayout => {
  const newLayout = deepCopy(layout);
  const containerId = findContainerId(layout, componentId);
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
    textResourceBindings: { next: 'next', back: 'back', },
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
