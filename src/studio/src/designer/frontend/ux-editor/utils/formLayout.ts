/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
import { v4 as uuidv4 } from 'uuid';

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
  formLayout = JSON.parse(JSON.stringify(formLayout));

  for (const element of formLayout) {
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
      extractChildrenFromGroup(element, formLayout, convertedLayout);
      convertedLayout.order[baseContainerId].push(element.id);
    }
  }
  return convertedLayout;
}

export function convertInternalToLayoutFormat(internalFormat: IFormLayout): any[] {
  const {
    components, containers, order,
  } = JSON.parse(JSON.stringify(internalFormat)) as IFormLayout;

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
  components: IFormDesignerComponent,
  containers: IFormDesignerContainer,
  order: IFormLayoutOrder,
  formLayout: any[],
  groupId: string,
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

export function extractChildrenFromGroup(group: any, components: any, convertedLayout: any) {
  const {
    id, children, ...restOfGroup
  } = group;
  restOfGroup.itemType = 'CONTAINER';
  delete restOfGroup.type;
  convertedLayout.containers[id] = restOfGroup;
  convertedLayout.order[id] = children || [];
  children?.forEach((componentId: string) => {
    const component = components.find((candidate: any) => candidate.id === componentId);
    const location = components.findIndex((candidate: any) => candidate.id === componentId);
    if (component.type === 'Group') {
      component.itemType = 'CONTAINER';
      components.splice(location, 1);
      extractChildrenFromGroup(component, components, convertedLayout);
    } else {
      component.itemType = 'COMPONENT';
      delete component.id;
      convertedLayout.components[componentId] = component;
      components.splice(location, 1);
    }
  });
}
