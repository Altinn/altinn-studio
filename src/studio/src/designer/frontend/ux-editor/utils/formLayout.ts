/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
import { IFormDesignerState } from '../reducers/formDesignerReducer';
// tslint:disable-next-line:no-var-requires
const uuid = require('uuid/v4');

export function getParentContainerId(containerId: string, formDesignerState: IFormDesignerState): string {
  const order = formDesignerState.layout.order;
  const baseContainerId = Object.keys(formDesignerState.layout.order)[0];
  for (const containerKey in order) {
    if (containerKey) {
      for (const elementId of order[containerKey]) {
        if (elementId === containerId) {
          return containerKey;
        }
      }
    }
  }
  return baseContainerId;
}

export function convertFromLayoutToInternalFormat(formLayout: any[]): IFormDesignerLayout {
  const convertedLayout: IFormDesignerLayout = {
    containers: {},
    components: {},
    order: {},
  };

  if (!formLayout) {
    return convertedLayout;
  }
  formLayout = JSON.parse(JSON.stringify(formLayout));
  const baseContainerId: string = uuid();
  convertedLayout.order[baseContainerId] = [];
  convertedLayout.containers[baseContainerId] = {
    index: 0,
    itemType: 'CONTAINER',
  };

  for (const element of formLayout) {
    if (element.type !== 'Group') {
      const { id, ...rest } = element;
      if (!rest.type) {
        rest.type = rest.component;
        delete rest.component;
      }
      rest.itemType = 'COMPONENT';
      convertedLayout.components[id] = rest;
      convertedLayout.order[baseContainerId].push(id);
    } else {
      extractChildrenFromGroup(element, formLayout, convertedLayout);
      convertedLayout.order[baseContainerId].push(element.id);
    }
  }
  return convertedLayout;
}

export function convertInternalToLayoutFormat(internalFormat: IFormDesignerLayout): any[] {
  const {
    components, containers, order,
  } = JSON.parse(JSON.stringify(internalFormat)) as IFormDesignerLayout;

  const baseContainerId = Object.keys(internalFormat.containers)[0];
  const formLayout = [];
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
        delete components[componentId].itemType;
        formLayout.push({
          id: componentId,
          ...components[componentId],
        });
      });
    }
  }
  return formLayout;
}

export function extractChildrenFromGroup(group: any, components: any, convertedLayout: any) {
  const {
    id, children, ...restOfGroup
  } = group;
  restOfGroup.itemType = 'CONTAINER';
  convertedLayout.containers[id] = restOfGroup;
  convertedLayout.order[id] = children || [];
  children?.forEach((componentId: string) => {
    const component = components.find((candidate: any) => candidate.id === componentId);
    const location = components.findIndex((candidate: any) => candidate.id === componentId);
    component.itemType = 'COMPONENT';
    delete component.id;
    convertedLayout.components[componentId] = component;
    components.splice(location, 1);
  });
}
