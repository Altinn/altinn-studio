import { INDEX_KEY_INDICATOR_REGEX } from 'src/utils/databindings';
import type { IFormData } from 'src/features/form/data';
import type { IGroupEditProperties, IGroupFilter, ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentTypes, ILayout, ILayoutComponent } from 'src/layout/layout';
import type { IAttachmentState } from 'src/shared/resources/attachments';
import type {
  IFileUploadersWithTag,
  ILayoutNavigation,
  ILayoutSets,
  IMapping,
  IOptionsChosen,
  IRepeatingGroups,
  ITextResourceBindings,
} from 'src/types';
import type { ITextResource } from 'src/types/shared';

interface SplitKey {
  baseComponentId: string;
  stringDepth: string;
  stringDepthWithLeadingDash: string;
  depth: number[];
}

/**
 * Takes a dashed component id (possibly inside a repeating group row), like 'myComponent-0-1' and returns
 * a workable object:
 *   {
 *     baseComponentId: 'myComponent',
 *     stringDepth: '0-1',
 *     stringDepthWithLeadingDash: '-0-1',
 *     depth: [0, 1],
 *   }
 */
export function splitDashedKey(componentId: string): SplitKey {
  const parts = componentId.split('-');

  const depth: number[] = [];
  while (parts.length) {
    const toConsider = parts.pop();

    // Since our form component IDs are usually UUIDs, they will contain hyphens and may even end in '-<number>'.
    // We'll assume the application has less than 5-digit repeating group elements (the last leg of UUIDs are always
    // longer than 5 digits).
    if (toConsider?.match(/^\d{1,5}$/)) {
      depth.push(parseInt(toConsider, 10));
    } else {
      depth.reverse();
      const stringDepth = depth.join('-').toString();
      return {
        baseComponentId: [...parts, toConsider].join('-'),
        stringDepth: stringDepth,
        stringDepthWithLeadingDash: stringDepth ? `-${stringDepth}` : '',
        depth: depth,
      };
    }
  }

  return {
    baseComponentId: componentId,
    stringDepth: '',
    stringDepthWithLeadingDash: '',
    depth: [],
  };
}

const getMaxIndexInKeys = (keys: string[], nested = false) => {
  const arrayIndexRegex = new RegExp(/\[(\d+)]/);
  const nestedArrayIndexRegex = new RegExp(/^.+?\[(\d+)].+?\[(\d+)]/);
  return Math.max(
    ...keys.map((formDataKey) => {
      const match = formDataKey.match(nested ? nestedArrayIndexRegex : arrayIndexRegex);
      const indexAsString = match && match[nested ? 2 : 1];
      if (indexAsString) {
        return parseInt(indexAsString, 10);
      }
      return -1;
    }),
  );
};

export function getRepeatingGroups(formLayout: ILayout, formData: any) {
  const repeatingGroups: IRepeatingGroups = {};

  const groups = formLayout.filter((layoutElement) => layoutElement.type === 'Group');

  const childGroups: string[] = [];
  groups.forEach((group: ILayoutGroup) => {
    group.children?.forEach((childId: string) => {
      formLayout
        .filter((element) => {
          if (element.type !== 'Group') return false;
          if (group.edit?.multiPage) {
            return childId.split(':')[1] === element.id;
          }
          return element.id === childId;
        })
        .forEach((childGroup) => childGroups.push(childGroup.id));
    });
  });

  // filter away groups that should be rendered as child groups
  const filteredGroups = groups.filter((group) => childGroups.indexOf(group.id) === -1);

  filteredGroups.forEach((groupElement: ILayoutGroup) => {
    if (groupElement.maxCount && groupElement.maxCount > 1) {
      const groupFormData = Object.keys(formData)
        .filter((key) => {
          return groupElement.dataModelBindings?.group && key.startsWith(groupElement.dataModelBindings.group);
        })
        .sort();
      if (groupFormData && groupFormData.length > 0) {
        const maxIndex = getMaxIndexInKeys(groupFormData);
        if (maxIndex !== -1) {
          const index = maxIndex;
          repeatingGroups[groupElement.id] = {
            index,
            dataModelBinding: groupElement.dataModelBindings?.group,
            editIndex: -1,
            multiPageIndex: -1,
          };
          const groupElementChildGroups: string[] = [];
          groupElement.children?.forEach((id) => {
            if (groupElement.edit?.multiPage && childGroups.includes(id.split(':')[1])) {
              groupElementChildGroups.push(id.split(':')[1]);
            } else if (childGroups.includes(id)) {
              groupElementChildGroups.push(id);
            }
          });
          groupElementChildGroups.forEach((childGroupId: string) => {
            const childGroup = groups.find((element) => element.id === childGroupId);
            [...Array(index + 1)].forEach((_x: any, childGroupIndex: number) => {
              const groupId = `${childGroup?.id}-${childGroupIndex}`;
              repeatingGroups[groupId] = {
                index: getIndexForNestedRepeatingGroup(
                  formData,
                  childGroup?.dataModelBindings?.group,
                  groupElement?.dataModelBindings?.group,
                  childGroupIndex,
                ),
                baseGroupId: childGroup?.id,
                editIndex: -1,
                multiPageIndex: -1,
                dataModelBinding: childGroup?.dataModelBindings?.group,
              };
            });
          });
        }
      } else {
        repeatingGroups[groupElement.id] = {
          index: -1,
          dataModelBinding: groupElement.dataModelBindings?.group,
          editIndex: -1,
          multiPageIndex: -1,
        };
      }
    }
  });
  return repeatingGroups;
}

export function mapFileUploadersWithTag(formLayout: ILayout, attachmentState: IAttachmentState) {
  const fileUploaders: IFileUploadersWithTag = {};
  for (const componentId of Object.keys(attachmentState.attachments)) {
    const baseComponentId = splitDashedKey(componentId).baseComponentId;
    const component = formLayout.find((layoutElement) => layoutElement.id === baseComponentId);
    if (!component || component.type !== 'FileUploadWithTag') {
      continue;
    }

    const attachments = attachmentState.attachments[componentId];
    const chosenOptions: IOptionsChosen = {};
    for (let index = 0; index < attachments.length; index++) {
      const tags = attachments[index].tags;
      if (tags) {
        chosenOptions[attachments[index].id] = tags[0];
      }
    }
    fileUploaders[componentId] = {
      editIndex: -1,
      chosenOptions,
    };
  }
  return fileUploaders;
}

function getIndexForNestedRepeatingGroup(
  formData: any,
  groupBinding: string | undefined,
  parentGroupBinding: string | undefined,
  parentIndex: number,
): number {
  if (!groupBinding || !parentGroupBinding) {
    return -1;
  }
  const indexedGroupBinding = groupBinding.replace(parentGroupBinding, `${parentGroupBinding}[${parentIndex}]`);
  const groupFormData = Object.keys(formData)
    .filter((key) => {
      return key.startsWith(indexedGroupBinding);
    })
    .sort();
  if (groupFormData && groupFormData.length > 0) {
    return getMaxIndexInKeys(groupFormData, true);
  }
  return -1;
}

export function getNextView(
  navOptions: ILayoutNavigation | undefined,
  layoutOrder: string[] | null,
  currentView: string,
  goBack?: boolean,
) {
  let result;
  if (navOptions) {
    if (goBack && navOptions.previous) {
      return navOptions.previous;
    }

    if (!goBack && navOptions.next) {
      return navOptions.next;
    }
  }

  if (layoutOrder) {
    const currentViewIndex = layoutOrder.indexOf(currentView);
    const newViewIndex = goBack ? currentViewIndex - 1 : currentViewIndex + 1;
    result = layoutOrder[newViewIndex];
  }

  return result;
}

export function removeRepeatingGroupFromUIConfig(
  repeatingGroups: IRepeatingGroups,
  repeatingGroupId: string,
  index: number,
  shiftData?: boolean,
): IRepeatingGroups {
  const newRepGroups = { ...repeatingGroups };
  delete newRepGroups[`${repeatingGroupId}-${index}`];
  if (shiftData) {
    const groupKeys = Object.keys(repeatingGroups).filter((key: string) => key.startsWith(repeatingGroupId));

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

export const getRepeatingGroupStartStopIndex = (
  repeatingGroupIndex: number,
  edit: IGroupEditProperties | undefined,
) => {
  if (typeof repeatingGroupIndex === 'undefined') {
    return { startIndex: 0, stopIndex: -1 };
  }

  const start = edit?.filter?.find(({ key }) => key === 'start')?.value;
  const stop = edit?.filter?.find(({ key }) => key === 'stop')?.value;
  const startIndex = start ? parseInt(start) : 0;
  const stopIndex = stop ? Math.min(parseInt(stop) - 1, repeatingGroupIndex) : repeatingGroupIndex;
  return { startIndex, stopIndex };
};

export function createRepeatingGroupComponents(
  container: ILayoutGroup,
  renderComponents: (ILayoutComponent | ILayoutGroup)[],
  repeatingGroupIndex: number,
  textResources: ITextResource[],
  hiddenFields?: string[],
): Array<Array<ILayoutComponent | ILayoutGroup>> {
  const componentArray: Array<Array<ILayoutComponent | ILayoutGroup>> = [];
  const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(repeatingGroupIndex, container.edit);
  for (let index = startIndex; index <= stopIndex; index++) {
    componentArray.push(
      createRepeatingGroupComponentsForIndex({
        container,
        renderComponents,
        textResources,
        index,
        hiddenFields,
      }),
    );
  }
  return componentArray;
}

interface ICreateRepeatingGroupComponentsForIndexProps {
  container: ILayoutGroup;
  renderComponents: (ILayoutComponent | ILayoutGroup)[];
  textResources: ITextResource[];
  index: number;
  hiddenFields?: string[];
}

export function createRepeatingGroupComponentsForIndex({
  container,
  renderComponents,
  textResources,
  index,
  hiddenFields,
}: ICreateRepeatingGroupComponentsForIndexProps) {
  return renderComponents.map((component: ILayoutComponent | ILayoutGroup) => {
    if (component.type === 'Group' && component.panel?.groupReference) {
      // Do not treat as a regular group child as this is merely an option
      // to add elements for another group from this group context
      return {
        ...component,
        id: `${component.id}-${index}`,
        baseComponentId: component.id, // used to indicate that it is a child group
      };
    }

    const componentDeepCopy: ILayoutComponent | ILayoutGroup = JSON.parse(JSON.stringify(component));
    const dataModelBindings = { ...componentDeepCopy.dataModelBindings };
    const groupDataModelBinding = container.dataModelBindings?.group;
    Object.keys(dataModelBindings).forEach((key) => {
      dataModelBindings[key] = dataModelBindings[key].replace(
        groupDataModelBinding,
        `${groupDataModelBinding}[${index}]`,
      );
    });
    const deepCopyId = `${componentDeepCopy.id}-${index}`;
    componentDeepCopy.textResourceBindings = getVariableTextKeysForRepeatingGroupComponent(
      textResources,
      componentDeepCopy.textResourceBindings as ITextResourceBindings,
      index,
    );
    const hidden = !!hiddenFields?.find((field) => field === `${deepCopyId}[${index}]`);
    let mapping: IMapping | undefined;
    if ('mapping' in componentDeepCopy) {
      mapping = setMappingForRepeatingGroupComponent(componentDeepCopy.mapping, index);
    }
    return {
      ...componentDeepCopy,
      textResourceBindings: componentDeepCopy.textResourceBindings,
      dataModelBindings,
      id: deepCopyId,
      baseComponentId: componentDeepCopy.baseComponentId || componentDeepCopy.id,
      hidden,
      mapping,
    };
  });
}

export function setMappingForRepeatingGroupComponent(mapping: IMapping | undefined, index: number | undefined) {
  if (mapping) {
    const indexedMapping: IMapping = {
      ...mapping,
    };
    const mappingsWithRepeatingGroupSources = Object.keys(mapping).filter((source) =>
      source.match(INDEX_KEY_INDICATOR_REGEX),
    );
    mappingsWithRepeatingGroupSources.forEach((sourceMapping) => {
      delete indexedMapping[sourceMapping];
      const newSource = sourceMapping.replace(INDEX_KEY_INDICATOR_REGEX, `[${index}]`);
      indexedMapping[newSource] = mapping[sourceMapping];
      delete indexedMapping[sourceMapping];
    });
    return indexedMapping;
  } else {
    return undefined;
  }
}

export function getVariableTextKeysForRepeatingGroupComponent(
  textResources: ITextResource[],
  textResourceBindings: ITextResourceBindings | undefined,
  index: number,
) {
  const copyTextResourceBindings = { ...textResourceBindings };
  if (textResources && textResourceBindings) {
    const bindingsWithVariablesForRepeatingGroups = Object.keys(copyTextResourceBindings).filter((key) => {
      const textKey = copyTextResourceBindings[key];
      const textResource = textResources.find((text) => text.id === textKey);
      return textResource && textResource.variables && textResource.variables.find((v) => v.key.indexOf('[{0}]') > -1);
    });

    bindingsWithVariablesForRepeatingGroups.forEach((key) => {
      copyTextResourceBindings[key] = `${copyTextResourceBindings[key]}-${index}`;
    });
  }
  return copyTextResourceBindings;
}

/**
 * Checks if there are required fields in this layout (or fields that potentially can be marked as required if some
 * dynamic behaviour dictates it).
 */
export function hasRequiredFields(layout: ILayout): boolean {
  return !!layout.find((c: ILayoutComponent) => c.required === true || Array.isArray(c.required));
}

/**
 * Find child components in layout (or inside some group) matching some criteria. Returns a list of just those
 * components.
 * @param layout Layout list
 * @param options Optional options
 * @param options.matching Function which should return true for every component to be included in the returned list.
 *    If not provided, all components are returned.
 * @param options.rootGroupId Component id for a group to use as root, instead of iterating the entire layout.
 * @deprecated Use nodesInLayout() instead. TODO: Rewrite usages
 */
export function findChildren(
  layout: ILayout,
  options?: {
    matching?: (component: ILayoutComponent) => boolean;
    rootGroupId?: string;
  },
): ILayoutComponent[] {
  const out: ILayoutComponent[] = [];
  const root: string = options?.rootGroupId || '';
  const toConsider = new Set<string>();
  const otherGroupComponents: { [groupId: string]: Set<string> } = {};

  if (root) {
    for (const item of layout) {
      if (item.type === 'Group' && item.children) {
        for (const childId of item.children) {
          const cleanId = item.edit?.multiPage ? childId.split(':')[1] : childId;
          if (item.id === root) {
            toConsider.add(cleanId);
          } else {
            if (typeof otherGroupComponents[item.id] === 'undefined') {
              otherGroupComponents[item.id] = new Set();
            }
            otherGroupComponents[item.id].add(cleanId);
          }
        }
      }
    }

    // Go over other groups, catching child groups defined out-of-order
    for (const otherGroupId in otherGroupComponents) {
      if (toConsider.has(otherGroupId)) {
        otherGroupComponents[otherGroupId].forEach((id) => toConsider.add(id));
      }
    }
  }

  for (const item of layout) {
    if (item.type === 'Group' || (root && !toConsider.has(item.id))) {
      continue;
    }
    if (options && options.matching) {
      options.matching(item) && out.push(item);
    } else {
      out.push(item);
    }
  }

  return out;
}

/**
 * Takes a layout and removes the components in it that belong to groups. This returns
 * only the top-level layout components.
 */
export function topLevelComponents(layout: ILayout) {
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

/**
 * Takes a layout and splits it into two return parts; the last will contain
 * all the buttons on the bottom of the input layout, while the first returned
 * value is the input layout except for these extracted components.
 */
export function extractBottomButtons(layout: ILayout) {
  const extract = new Set<ComponentTypes>(['NavigationButtons', 'Button', 'PrintButton']);

  const toMainLayout: ILayout = [];
  const toErrorReport: ILayout = [];
  for (const component of [...layout].reverse()) {
    if (extract.has(component.type) && toMainLayout.length === 0) {
      toErrorReport.push(component);
    } else {
      toMainLayout.push(component);
    }
  }

  return [toMainLayout.reverse(), toErrorReport.reverse()];
}

/**
 * Some tasks other than data (for instance confirm, or other in the future) can be configured to behave like data steps
 * @param task the task
 * @param layoutSets the layout sets
 */
export function behavesLikeDataTask(task: string | null | undefined, layoutSets: ILayoutSets | null): boolean {
  if (!task) {
    return false;
  }

  return layoutSets?.sets.some((set) => set.tasks?.includes(task)) || false;
}

/**
 * (Deprecate this function) Returns the filtered indices of a repeating group.
 * This is a buggy implementation, but is used for backward compatibility until a new major version is released.
 * @see https://github.com/Altinn/app-frontend-react/issues/339#issuecomment-1286624933
 * @param formData IFormData
 * @param filter IGroupEditProperties.filter or undefined.
 * @returns a list of indices for repeating group elements after applying filters, or null if no filters are provided or if no elements match.
 * @deprecated
 */
export function getRepeatingGroupFilteredIndices(formData: IFormData, filter?: IGroupFilter[]): number[] | null {
  if (filter && filter.length > 0) {
    const rule = filter.at(-1);
    const formDataKeys: string[] = Object.keys(formData).filter((key) => {
      const keyWithoutIndex = key.replaceAll(/\[\d*]/g, '');
      return keyWithoutIndex === rule?.key && formData[key] === rule.value;
    });
    if (formDataKeys && formDataKeys.length > 0) {
      return formDataKeys.map((key) => {
        const match = key.match(/\[(\d*)]/g);
        const currentIndex = (match && match[match.length - 1]) || '[0]';
        return parseInt(currentIndex.substring(1, currentIndex.indexOf(']')), 10);
      });
    }
  }
  return null;
}
