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

  for (const element of formLayout) {
    if (element.children) {
      // Container
      if (!convertedLayout.order[baseContainerId]) {
        convertedLayout.order[baseContainerId] = [element.id];
      } else {
        convertedLayout.order[baseContainerId].push(element.id);
      }
      extractChildrenFromContainer(element, convertedLayout);
    } else {
      if (!convertedLayout.containers[baseContainerId]) {
        convertedLayout.containers[baseContainerId] = {
          repeating: false,
          dataModelGroup: null,
          index: 0,
        };
      }
      const { id, ...rest } = element;
      if (!rest.type) {
        rest.type = rest.component;
        delete rest.component;
      }
      rest.itemType = 'COMPONENT';
      convertedLayout.components[id] = rest;
      if (!convertedLayout.order[baseContainerId]) {
        convertedLayout.order[baseContainerId] = [id];
      } else {
        convertedLayout.order[baseContainerId].push(id);
      }
    }
  }

  return convertedLayout;
}

export function convertInternalToLayoutFormat(internalFormat: IFormDesignerLayout): any[] {
  const { components, containers, order } = JSON.parse(JSON.stringify(internalFormat));
  let converted: any[] = [];

  function getChildrenFromContainer(containerId: string): any[] {
    const children: any[] = [];
    for (const id of order[containerId]) {
      if (components[id]) {
        if (!components[id].type) {
          components[id].type = components[id].component;
          delete components[id].component;
        }
        delete components[id].itemType;
        children.push({
          id,
          ...components[id],
        });
      } else {
        delete containers[id].itemType;
        children.push({
          id,
          type: 'Group',
          children: getChildrenFromContainer(id),
          ...containers[id],
        });
      }
    }
    return children;
  }

  for (const containerId in containers) {
    if (!containerId) {
      continue;
    }
    const container = containers[containerId];
    if (container.index === 0) {
      converted = getChildrenFromContainer(containerId);
    }
  }

  return converted;
}

export function extractChildrenFromContainer(container: any, convertedLayout: any) {
  const { id, children, ...restOfContainer } = container;
  restOfContainer.itemType = 'CONTAINER';
  convertedLayout.containers[id] = restOfContainer;
  for (const child of children) {
    if (child.children) {
      extractChildrenFromContainer(child, convertedLayout);
    } else {
      if (!convertedLayout.order[id]) {
        convertedLayout.order[id] = [child.id];
      } else {
        convertedLayout.order[id].push(child.id);
      }
      const { id: componentId, ...restOfChild } = child;
      restOfChild.itemType = 'COMPONENT';
      convertedLayout.components[componentId] = restOfChild;
    }
  }
}
