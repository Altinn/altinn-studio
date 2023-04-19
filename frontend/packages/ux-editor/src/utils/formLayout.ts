import type { Dispatch } from 'redux';
import type { IComponent } from '../components';
import { ComponentType } from '../components';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type {
  IFormComponent,
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

const { addWidget, updateActiveListOrder } = FormLayoutActions;

export function convertFromLayoutToInternalFormat(
  formLayout: IExternalComponent[],
  hidden: any
): IInternalLayout {
  const convertedLayout: IInternalLayout = {
    containers: {},
    components: {},
    order: {},
    hidden: hidden,
  };

  const baseContainerId: string = BASE_CONTAINER_ID;
  convertedLayout.order[baseContainerId] = [];
  convertedLayout.containers[baseContainerId] = {
    index: 0,
    itemType: 'CONTAINER',
  };

  if (!formLayout) {
    return convertedLayout;
  }
  const formLayoutCopy: IExternalComponent[] = deepCopy(formLayout);

  for (const element of topLevelComponents(formLayoutCopy)) {
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
      } as IFormComponent;
      convertedLayout.order[baseContainerId].push(id);
    } else {
      extractChildrenFromGroup(element, formLayoutCopy, convertedLayout);
      convertedLayout.order[baseContainerId].push(element.id);
    }
  }
  return convertedLayout;
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

export function convertInternalToLayoutFormat(internalFormat: IInternalLayout): IExternalComponent[] {
  const formLayout: IExternalComponent[] = [];

  if (!internalFormat) return formLayout;

  const { components, containers, order } = deepCopy(internalFormat);

  if (!containers) return formLayout;

  const containerIds = Object.keys(containers);
  if (!containerIds.length) return formLayout;

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  return formLayout;
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
      };
    }
  });
}

export const mapWidgetToToolbarElement = (
  widget: IWidget,
  activeList: any,
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
      dispatch(updateActiveListOrder({ containerList: activeList, orderList: order }));
    },
  };
};

export const mapComponentToToolbarElement = (
  c: IComponent,
  t: typeof i18next.t,
  activeList: any,
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
    dispatch(updateActiveListOrder({ containerList: activeList, orderList: order }));
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
