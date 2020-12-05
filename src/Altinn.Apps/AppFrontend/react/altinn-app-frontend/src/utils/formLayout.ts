/* eslint-disable no-loop-func */
/* eslint-disable max-len */
import { IRepeatingGroups, ILayoutNavigation } from 'src/types';
import { ILayout, ILayoutComponent, ILayoutGroup, ILayouts } from '../features/form/layout';

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

export function getRepeatingGroups(formLayout: ILayout, formData: any) {
  const repeatingGroups: IRepeatingGroups = {};
  const regex = new RegExp(/\[([0-9]+)\]/);

  const groups = formLayout.filter((layoutElement) => layoutElement.type.toLowerCase() === 'group');

  const childGroups: string[] = [];
  groups.forEach((group: ILayoutGroup) => {
    group.children?.forEach((childId: string) => {
      formLayout
        .filter(((element) => (element.id === childId && element.type.toLowerCase() === 'group')))
        .forEach((childGroup) => childGroups.push(childGroup.id));
    });
  });

  // filter away groups that should be rendered as child groups
  const filteredGroups = formLayout.filter((group) => childGroups.indexOf(group.id) === -1);

  filteredGroups.forEach((groupElement: ILayoutGroup) => {
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
          const groupElementChildGroups = groupElement.children?.filter((id) => childGroups.includes(id));
          groupElementChildGroups.forEach((childGroupId: string) => {
            const childGroup = groups.find((element) => element.id === childGroupId);
            [...Array(count + 1)].forEach((_x: any, index: number) => {
              const groupId = `${childGroup.id}-${index}`;
              repeatingGroups[groupId] = {
                count: getCountForRepeatingGroup(formData, childGroup.dataModelBindings?.group, groupElement.dataModelBindings.group, index),
                baseGroupId: childGroup.id,
              };
            });
          });
        }
      } else {
        repeatingGroups[groupElement.id] = { count: -1 };
      }
    }
  });
  return repeatingGroups;
}

function getCountForRepeatingGroup(formData: any, groupBinding: string, parentGroupBinding: string, parentIndex: number): number {
  const regex = new RegExp(/\[([0-9]+)](?!.*\[([0-9]+)])/);
  const indexedGroupBinding = groupBinding.replace(parentGroupBinding, `${parentGroupBinding}[${parentIndex}]`);
  const groupFormData = Object.keys(formData).filter((key) => {
    return key.startsWith(indexedGroupBinding);
  });
  if (groupFormData && groupFormData.length > 0) {
    const lastItem = groupFormData[groupFormData.length - 1];
    const match = lastItem.match(regex);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return -1;
}

export function getNextView(navOptions: ILayoutNavigation, layouts: ILayouts, currentView: string, goBack?: boolean) {
  let result;
  if (navOptions) {
    if (goBack && navOptions.previous) {
      return navOptions.previous;
    }

    if (!goBack && navOptions.next) {
      return navOptions.next;
    }
  }

  if (layouts) {
    const layoutIds = Object.keys(layouts);
    const currentViewIndex = layoutIds.indexOf(currentView);
    const newViewIndex = goBack ? currentViewIndex - 1 : currentViewIndex + 1;
    result = layoutIds[newViewIndex];
  }

  return result;
}

export function removeRepeatingGroupFromUIConfig(repeatingGroups: IRepeatingGroups, repeatingGroupId: string, index: number, shiftData?: boolean): IRepeatingGroups {
  const newRepGroups = { ...repeatingGroups };
  delete newRepGroups[`${repeatingGroupId}-${index}`];
  if (shiftData) {
    const groupKeys = Object.keys(repeatingGroups)
      .filter((key: string) => key.startsWith(repeatingGroupId));

    groupKeys.forEach((shiftFrom: string, keyIndex: number) => {
      if (keyIndex > index) {
        const shiftTo = groupKeys[keyIndex - 1];
        newRepGroups[shiftTo] = repeatingGroups[shiftFrom];
        delete newRepGroups[shiftFrom];
      }
    });
  }
  return newRepGroups;
}

export function createRepeatingGroupComponents(container: ILayoutGroup, renderComponents: (ILayoutComponent | ILayoutGroup)[], repeatingGroupIndex: number, hiddenFields?: string[]) {
  const componentArray = [];
  for (let i = 0; i <= repeatingGroupIndex; i++) {
    const childComponents = renderComponents.map((component: ILayoutComponent | ILayoutGroup) => {
      const componentDeepCopy: ILayoutComponent | ILayoutGroup = JSON.parse(JSON.stringify(component));
      const dataModelBindings = { ...componentDeepCopy.dataModelBindings };
      const groupDataModelBinding = container.dataModelBindings.group;
      Object.keys(dataModelBindings).forEach((key) => {
        // eslint-disable-next-line no-param-reassign
        dataModelBindings[key] = dataModelBindings[key].replace(groupDataModelBinding, `${groupDataModelBinding}[${i}]`);
      });
      const deepCopyId = `${componentDeepCopy.id}-${i}`;
      const hidden: boolean = !!hiddenFields?.find((field) => field === `${deepCopyId}[${i}]`);
      return {
        ...componentDeepCopy,
        dataModelBindings,
        id: deepCopyId,
        baseComponentId: componentDeepCopy.id,
        hidden,
      };
    });
    componentArray.push(childComponents);
  }
  return componentArray;
}
