import { IRepeatingGroups } from 'src/types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../features/form/layout';

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

export function getRepeatingGroups(formLayout: [ILayoutComponent | ILayoutGroup], formData: any) {
  const repeatingGroups: IRepeatingGroups = {};
  const regex = new RegExp(/\[([0-9]+)\]/);
  formLayout.filter((layoutElement) => layoutElement.type.toLowerCase() === 'group')
    .forEach((groupElement: ILayoutGroup) => {
      if (groupElement.maxCount > 1) {
        const groupFormData = Object.keys(formData).filter((key) => {
          return key.startsWith(groupElement.dataModelBindings.group);
        });
        if (groupFormData && groupFormData.length > 0) {
          const lastItem = groupFormData[groupFormData.length - 1];
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
  return repeatingGroups;
}
