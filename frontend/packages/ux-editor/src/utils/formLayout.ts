import type { Dispatch } from 'redux';
import type { IComponent, IThirdPartyComponentDefinition } from '../components';
import { ComponentTypes } from '../components';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { LayoutItemType } from '../types/global';
import { addTextResources } from '../features/appData/textResources/textResourcesSlice';
import { getComponentTitleByComponentType } from './language';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { v4 as uuidv4 } from 'uuid';

import type {
  IFormLayout,
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
  IWidget,
  ICreateFormContainer,
  IToolbarElement,
} from '../types/global';

const { addFormComponent, addFormContainer, addWidget, updateActiveListOrder } = FormLayoutActions;

export function convertFromLayoutToInternalFormat(formLayout: any[]): IFormLayout {
  const convertedLayout: IFormLayout = {
    containers: {},
    components: {},
    order: {},
  };

  const baseContainerId: string = uuidv4();
  convertedLayout.order[baseContainerId] = [];
  convertedLayout.containers[baseContainerId] = {
    index: 0,
    itemType: 'CONTAINER',
  };

  if (!formLayout) {
    return convertedLayout;
  }
  const formLayoutCopy: any[] = JSON.parse(JSON.stringify(formLayout));

  for (const element of topLevelComponents(formLayoutCopy)) {
    if (element.type.toLowerCase() !== 'group') {
      const { id, ...rest } = element;
      if (!rest.type) {
        rest.type = rest.component;
        delete rest.component;
      }
      rest.itemType = 'COMPONENT';
      convertedLayout.components[id] = rest;
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
export function topLevelComponents(layout: any[]) {
  const inGroup = new Set<string>();
  layout.forEach((component) => {
    if (component.type === 'Group') {
      const childList = component.edit?.multiPage
        ? component.children.map((childId) => childId.split(':')[1] || childId)
        : component.children;
      childList.forEach((childId) => inGroup.add(childId));
    }
  });
  return layout.filter((component) => !inGroup.has(component.id));
}

export function convertInternalToLayoutFormat(internalFormat: IFormLayout): any[] {
  const { components, containers, order } = JSON.parse(
    JSON.stringify(internalFormat)
  ) as IFormLayout;

  const baseContainerId = Object.keys(internalFormat.containers)[0];
  const formLayout: any[] = [];
  let groupChildren: string[] = [];
  Object.keys(order).forEach((groupKey: string) => {
    if (groupKey !== baseContainerId) {
      groupChildren = groupChildren.concat(order[groupKey]);
    }
  });

  for (const id of order[baseContainerId]) {
    if (components[id] && !groupChildren.includes(id)) {
      delete components[id].itemType;
      formLayout.push({
        id,
        ...components[id],
      });
    } else if (containers[id]) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { itemType, ...restOfGroup } = containers[id];
      formLayout.push({
        id,
        type: 'Group',
        children: order[id],
        ...restOfGroup,
      });
      order[id].forEach((componentId: string) => {
        if (components[componentId]) {
          delete components[componentId].itemType;
          formLayout.push({
            id: componentId,
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
  formLayout: any[],
  groupId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { itemType, ...restOfGroup } = containers[groupId];
  formLayout.push({
    id: groupId,
    type: 'Group',
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

export function extractChildrenFromGroup(group: any, components: any[], convertedLayout: any) {
  const { id, children, ...restOfGroup } = group;
  restOfGroup.itemType = 'CONTAINER';
  delete restOfGroup.type;
  convertedLayout.containers[id] = restOfGroup;
  convertedLayout.order[id] = children || [];
  children?.forEach((componentId: string) => {
    const component = components.find((candidate: any) => candidate.id === componentId);
    const internalComponent = { ...component };
    if (component.type === 'Group') {
      internalComponent.itemType = 'CONTAINER';
      extractChildrenFromGroup(component, components, convertedLayout);
    } else {
      internalComponent.itemType = 'COMPONENT';
      delete internalComponent.id;
      convertedLayout.components[componentId] = internalComponent;
    }
  });
}

export const mapThirdPartyComponentToToolbarElement = (
  component: IThirdPartyComponentDefinition,
  activeList: any,
  order: any,
  language: any,
  dispatch: Dispatch
): IToolbarElement => {
  const { textResourceBindings, ...rest } = JSON.parse(
    JSON.stringify(component.componentDefinition)
  );
  return {
    label: getLanguageFromKey(component.displayName, language),
    icon: 'fa fa-3rd-party-alt',
    type: ComponentTypes.ThirdParty,
    actionMethod: (containerId: string, position: number) => {
      dispatch(
        addFormComponent({
          component: {
            type: ComponentTypes.ThirdParty,
            itemType: LayoutItemType.Component,
            textResourceBindings: textResourceBindings || {
              title: getLanguageFromKey(component.displayName, language),
            },
            dataModelBindings: {},
            ...rest,
          },
          position,
          containerId,
        })
      );
      dispatch(addTextResources({ textResources: component.texts }));
      dispatch(updateActiveListOrder({ containerList: activeList, orderList: order }));
    },
  };
};

export const mapWidgetToToolbarElement = (
  widget: IWidget,
  activeList: any,
  order: any[],
  language: any,
  dispatch: Dispatch
): IToolbarElement => {
  return {
    label: getLanguageFromKey(widget.displayName, language),
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
  language: any,
  activeList: any,
  order: any[],
  dispatch: Dispatch
): IToolbarElement => {
  const customProperties = c.customProperties || {};
  let actionMethod = (containerId: string, position: number) => {
    dispatch(
      addFormComponent({
        component: {
          type: c.name,
          itemType: LayoutItemType.Component,
          textResourceBindings: {
            title:
              c.name === 'Button'
                ? getLanguageFromKey('ux_editor.modal_properties_button_type_submit', language)
                : getComponentTitleByComponentType(c.name, language),
          },
          dataModelBindings: {},
          ...JSON.parse(JSON.stringify(customProperties)),
        },
        position,
        containerId,
      })
    );
    dispatch(updateActiveListOrder({ containerList: activeList, orderList: order }));
  };

  if (c.name === ComponentTypes.Group) {
    actionMethod = (containerId: string, index: number) => {
      dispatch(
        addFormContainer({
          container: {
            maxCount: 0,
            dataModelBindings: {},
            itemType: 'CONTAINER',
          } as ICreateFormContainer,
          positionAfterId: null,
          addToId: containerId,
          callback: null,
          destinationIndex: index,
        })
      );
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
