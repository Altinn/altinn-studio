import { ILayout, ILayoutComponent, ILayoutGroup } from '../features/form/layout';
import { IRepeatingGroups } from '../types/global';

/*
* Returns the layout element with the given id, or undefined if no such element exists
*/
export function getLayoutElementById(elementId: string, formLayout: ILayout):
  ILayoutComponent | ILayoutGroup {
  if (!formLayout || !elementId) {
    return undefined;
  }
  return formLayout.find((element) => element.id === elementId);
}

/*
* Returns the index of the layout element with the given id, or -1 if no such element exists
*/
export function getLayoutElementIndexById(elementId: string, formLayout: [ILayoutComponent | ILayoutGroup]):
  number {
  if (!elementId || !formLayout) {
    return -1;
  }
  return formLayout.findIndex((element) => element.id === elementId);
}

export function getGroupId(elementId: string, formLayout: [ILayoutComponent | ILayoutGroup]):
  string {
  let groupId: string = null;
  const groups = formLayout.filter((e) => e.type === 'group');
  if (groups && groups.length > 0) {
    groups.some((g) => {
      const group = g as ILayoutGroup;
      if (group.children.includes(elementId)) {
        groupId = group.id;
        return true;
      }
      return false;
    });
  }
  return groupId;
}

export function getRepeatingGroups(formLayout: [ILayoutComponent | ILayoutGroup], formData: any) {
  const repeatingGroups: IRepeatingGroups = {};
  formLayout.filter((layoutElement) => layoutElement.type === 'group')
    .forEach((groupElement: ILayoutGroup) => {
      if (groupElement.repeating) {
        const groupFormData = Object.keys(formData).filter((key) => {
          return key.startsWith(groupElement.dataModelBindings.group);
        });
        if (groupFormData && groupFormData.length > 0) {
          const lastItem = groupFormData[groupFormData.length - 1];
          const regex = new RegExp(/\[([0-9]+)\]/);
          const match = lastItem.match(regex);
          if (match && match[1]) {
            const count = parseInt(match[1], 10);
            repeatingGroups[groupElement.id] = { count };
          }
        } else {
          repeatingGroups[groupElement.id] = { count: 0 };
        }
      }
    });
    console.log('repeating groups:: ', repeatingGroups);
  return repeatingGroups;
}

export function getRenderLayout(formLayout: [ILayoutComponent | ILayoutGroup], formData: any)
  : (ILayoutComponent | ILayoutGroup)[] {
  let renderLayout: (ILayoutComponent | ILayoutGroup)[] = [];
  let renderedAsGroup = [];

  formLayout.forEach((layoutElement) => {
    if (layoutElement.type === 'group') {
      renderedAsGroup = renderedAsGroup.concat((layoutElement as ILayoutGroup).children);
      if ((layoutElement as ILayoutGroup).repeating) {
        const groupFormData = Object.keys(formData).filter((key) => {
          return key.startsWith((layoutElement as ILayoutGroup).dataModelBindings.group);
        });
        if (groupFormData && groupFormData.length > 0) {
          const lastItem = groupFormData[groupFormData.length - 1];
          const regex = new RegExp(/\[([0-9]+)\]/);
          const match = lastItem.match(regex);
          if (match && match[1]) {
            const count = parseInt(match[1], 10);
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i <= count; i++) {
              const repeatingElement = {
                ...layoutElement,
                index: i,
                showAdd: i === count,
              };
              renderLayout = renderLayout.concat([repeatingElement]);
            }
          }
        } else {
          const repeatingElement = {
            ...layoutElement,
            index: 0,
            showAdd: true,
          };
          renderLayout = renderLayout.concat([repeatingElement]);
        }
      }
    } else if (!renderedAsGroup.includes(layoutElement.id)) {
      renderLayout = renderLayout.concat([layoutElement]);
    }
  });

  return renderLayout;
}
