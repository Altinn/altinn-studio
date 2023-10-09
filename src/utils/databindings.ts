import { dot, object } from 'dot-object';

import { getParentGroup } from 'src/utils/validation/validation';
import type { IAttachment, IAttachments } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { IDataModelBindingsList, IDataModelBindingsSimple, IMapping } from 'src/layout/common.generated';
import type { CompFileUploadExternal } from 'src/layout/FileUpload/config.generated';
import type { CompFileUploadWithTagExternal } from 'src/layout/FileUploadWithTag/config.generated';
import type { CompExternal, CompOrGroupExternal, IDataModelBindings, ILayout } from 'src/layout/layout';
import type { IRepeatingGroup, IRepeatingGroups } from 'src/types';

/**
 * Converts the formdata in store (that is flat) to a JSON
 * object that matches the JSON datamodel defined by the service from
 * XSD. This is needed for the API to understand
 * @param formData the complete datamodel in store
 */
export function convertDataBindingToModel(formData: any): any {
  return object({ ...formData });
}

export function filterOutInvalidData({ data, invalidKeys = [] }: { data: IFormData; invalidKeys: string[] }) {
  if (!invalidKeys) {
    return data;
  }

  const result = {};
  Object.keys(data).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key) && !invalidKeys.includes(key)) {
      result[key] = data[key];
    }
  });

  return result;
}

export const INDEX_KEY_INDICATOR_REGEX = /\[{\d+}]/;
export const GLOBAL_INDEX_KEY_INDICATOR_REGEX = /\[{\d+}]/g;

/**
 * Converts JSON to the flat datamodel used in Redux data store
 * @param data The form data as JSON
 */
export function convertModelToDataBinding(data: any): IFormData {
  return flattenObject(data);
}

export function getKeyWithoutIndex(keyWithIndex: string): string {
  if (keyWithIndex?.indexOf('[') === -1) {
    return keyWithIndex;
  }

  return getKeyWithoutIndex(
    keyWithIndex.substring(0, keyWithIndex.indexOf('[')) + keyWithIndex.substring(keyWithIndex.indexOf(']') + 1),
  );
}

export function getBaseDataModelBindings(dataModelBindings: IDataModelBindings): IDataModelBindings {
  if (typeof dataModelBindings === 'undefined') {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(dataModelBindings).map(([bindingKey, field]) => [bindingKey, getKeyWithoutIndex(field)]),
  );
}

export function getKeyWithoutIndexIndicators(keyWithIndexIndicators: string): string {
  return keyWithIndexIndicators.replaceAll(GLOBAL_INDEX_KEY_INDICATOR_REGEX, '');
}

/*
  Gets possible combinations of repeating group or nested groups
  Example input ["group", "group.subGroup"] (note that sub groups should)
  For the group setup
  {
    group: {
      index: 2
    },
    subGroup-0: {
      index: 2
    },
    subGroup-1: {
      index: 1
    }
  }
  Would produce the following output: [[0, 0], [0, 1], [0, 2], [1, 0]]
*/
export function getIndexCombinations(
  baseGroupBindings: string[],
  repeatingGroups: IRepeatingGroups | null,
): number[][] {
  const combinations: number[][] = [];

  if (!baseGroupBindings?.length || !repeatingGroups) {
    return combinations;
  }

  const repeatingGroupValues = Object.values(repeatingGroups);
  const mainGroupMaxIndex = repeatingGroupValues.find((group) => group.dataModelBinding === baseGroupBindings[0])
    ?.index;

  if (mainGroupMaxIndex === undefined) {
    return combinations;
  }

  if (baseGroupBindings.length === 1) {
    return Array.from(Array(mainGroupMaxIndex + 1).keys()).map((x) => [x]);
  } else {
    const subGroupBinding = baseGroupBindings[1];
    for (let mainGroupIndex = 0; mainGroupIndex <= mainGroupMaxIndex; mainGroupIndex++) {
      const subGroupKey = Object.keys(repeatingGroups).filter(
        (key) =>
          repeatingGroups[key].dataModelBinding === subGroupBinding && mainGroupIndex === Number(key.split('-').pop()),
      )[0];
      const subGroupMaxIndex = repeatingGroups[subGroupKey]?.index;

      if (subGroupMaxIndex < 0) {
        combinations.push([mainGroupIndex]);
        continue;
      }

      for (let subGroupIndex = 0; subGroupIndex <= subGroupMaxIndex; subGroupIndex++) {
        combinations.push([mainGroupIndex, subGroupIndex]);
      }
    }
  }

  return combinations;
}

/**
 * Returns key indexes:
 *
 * MyForm.Group[0].SubGroup[1]
 *              ^           ^
 *
 * as an array => [0, 1]
 */
export function getKeyIndex(keyWithIndex: string): number[] {
  const match = keyWithIndex.match(/\[\d+]/g) || [];
  return match.map((n) => parseInt(n.replace('[', '').replace(']', ''), 10));
}

/**
 * Converts JSON to the flat datamodel used in Redux data store
 * @param data The form data as JSON
 */
export function flattenObject(data: any): IFormData {
  const flat = dot(data);

  for (const key of Object.keys(flat)) {
    if (flat[key] === null || (Array.isArray(flat[key]) && flat[key].length === 0)) {
      delete flat[key];
    } else if (flat[key] === '' && key.indexOf('.') > 0) {
      // For backwards compatibility, delete keys inside deeper object that are empty strings. This behaviour is
      // not always consistent, as it is only a case for deeper object (not direct properties).
      delete flat[key];
    } else {
      // Cast all values to strings, for backwards compatibility. Lots of code already written in frontend
      // expects data to be formatted as strings everywhere, and since this is a web application, even numeric
      // inputs have their values stored as strings.
      flat[key] = flat[key].toString();
    }
  }

  return flat;
}

/**
 * @deprecated
 * @see LayoutNode
 * @see ExprContext
 */
export function getGroupDataModelBinding(repeatingGroup: IRepeatingGroup, groupId: string, layout: ILayout) {
  const parentGroup = getParentGroup(repeatingGroup.baseGroupId || groupId, layout);
  if (parentGroup) {
    const splitId = groupId.split('-');
    const parentIndex = Number.parseInt(splitId[splitId.length - 1], 10);
    const parentDataBinding = 'dataModelBindings' in parentGroup ? parentGroup.dataModelBindings?.group : undefined;
    const indexedParentDataBinding = `${parentDataBinding}[${parentIndex}]`;
    if (repeatingGroup.dataModelBinding && parentDataBinding) {
      return repeatingGroup.dataModelBinding.replace(parentDataBinding, indexedParentDataBinding);
    }
    return undefined;
  }

  return repeatingGroup.dataModelBinding;
}

export function removeGroupData(
  formData: IFormData,
  index: number,
  layout: ILayout,
  groupId: string,
  repeatingGroup: IRepeatingGroup,
): IFormData {
  const result = { ...formData };
  const groupDataModelBinding = getGroupDataModelBinding(repeatingGroup, groupId, layout);

  deleteGroupData(result, groupDataModelBinding, index, true);

  if (index < repeatingGroup.index + 1) {
    for (let i = index + 1; i <= repeatingGroup.index + 1; i++) {
      deleteGroupData(result, groupDataModelBinding, i, true, true);
    }
  }

  return result;
}

function hasBindings(component: CompOrGroupExternal): component is Extract<CompExternal, { dataModelBindings: any }> {
  return 'dataModelBindings' in component;
}

function hasSimpleBinding(binding: IDataModelBindings | undefined): binding is IDataModelBindingsSimple {
  return !!(binding && 'simpleBinding' in binding && binding.simpleBinding);
}

function hasListBinding(binding: IDataModelBindings | undefined): binding is IDataModelBindingsList {
  return !!(binding && 'list' in binding && binding.list);
}

function compHasSimpleBinding(
  component: CompOrGroupExternal,
): component is CompOrGroupExternal & { dataModelBindings: IDataModelBindingsSimple } {
  return hasBindings(component) && hasSimpleBinding(component.dataModelBindings);
}

function compHasListBinding(
  component: CompOrGroupExternal,
): component is CompOrGroupExternal & { dataModelBindings: IDataModelBindingsList } {
  return hasBindings(component) && hasListBinding(component.dataModelBindings);
}

export function removeAttachmentReference(
  formData: IFormData,
  attachmentId: string,
  attachments: IAttachments,
  dataModelBindings: IDataModelBindings<'FileUpload' | 'FileUploadWithTag'>,
  componentId: string,
): IFormData {
  if (!hasSimpleBinding(dataModelBindings) && !hasListBinding(dataModelBindings)) {
    return formData;
  }

  const result = { ...formData };

  if (hasSimpleBinding(dataModelBindings) && typeof result[dataModelBindings.simpleBinding] === 'string') {
    delete result[dataModelBindings.simpleBinding];
  } else if (hasListBinding(dataModelBindings)) {
    let index = -1;
    const dataModelWithoutIndex = getKeyWithoutIndex(dataModelBindings.list);
    for (const key in result) {
      if (getKeyWithoutIndex(key).startsWith(dataModelWithoutIndex) && result[key] === attachmentId) {
        const lastIndex = getKeyIndex(key).pop();
        if (lastIndex !== undefined) {
          index = lastIndex;
        }
        break;
      }
    }

    if (index === -1) {
      throw new Error(
        `Unable to find attachment ID "${attachmentId}" in a key starting with "${dataModelWithoutIndex}" in form data: ${JSON.stringify(
          result,
        )}`,
      );
    }

    deleteGroupData(result, dataModelBindings.list, index, true);

    for (let laterIdx = index + 1; laterIdx <= attachments[componentId].length - 1; laterIdx++) {
      deleteGroupData(result, dataModelBindings.list, laterIdx, true, true);
    }
  }

  return result;
}

export function deleteGroupData(
  data: { [key: string]: any },
  keyStart: string | undefined,
  index: number,
  isDataModelBinding: boolean,
  shiftData?: boolean,
) {
  if (!keyStart) {
    return;
  }

  const prevData = { ...data };
  Object.keys(data)
    .filter((key) => key.startsWith(isDataModelBinding ? `${keyStart}[${index}]` : `${keyStart}-${index}`))
    .forEach((key) => {
      delete data[key];
      if (shiftData) {
        const newKey = key.replace(
          isDataModelBinding ? `${keyStart}[${index}]` : `${keyStart}-${index}`,
          isDataModelBinding ? `${keyStart}[${index - 1}]` : `${keyStart}-${index - 1}`,
        );
        data[newKey] = prevData[key];
      }
    });
}

interface FoundAttachment {
  attachment: IAttachment;
  component: CompFileUploadExternal | CompFileUploadWithTagExternal;
  componentId: string;
  index: number;
}

/**
 * Find all attachments added to file upload components in a given group. Uploading attachments in repeating groups
 * requires data model bindings with references to the attachment(s) in form data.
 */
export function findChildAttachments(
  formData: IFormData,
  attachments: IAttachments,
  layout: ILayout,
  groupId: string,
  repeatingGroup: IRepeatingGroup,
  index: number,
): FoundAttachment[] {
  const groupDataModelBinding = getGroupDataModelBinding(repeatingGroup, groupId, layout);
  const out: FoundAttachment[] = [];
  const components = layout.filter((c) => c.type === 'FileUpload' || c.type === 'FileUploadWithTag');
  const formDataKeys = Object.keys(formData).filter((key) => key.startsWith(`${groupDataModelBinding}[${index}]`));

  for (const key of formDataKeys) {
    const dataBinding = getKeyWithoutIndex(key);
    const component = components.find(
      (c) =>
        (compHasSimpleBinding(c) && c.dataModelBindings?.simpleBinding === dataBinding) ||
        (compHasListBinding(c) && c.dataModelBindings?.list === dataBinding),
    ) as unknown as CompFileUploadExternal | CompFileUploadWithTagExternal;

    if (component) {
      const groupKeys = getKeyIndex(key);
      if (compHasListBinding(component)) {
        groupKeys.pop();
      }

      const componentId = component.id + (groupKeys.length ? `-${groupKeys.join('-')}` : '');
      const foundIndex = (attachments[componentId] || []).findIndex((a) => a.id === formData[key]);
      if (foundIndex > -1) {
        const attachment = attachments[componentId][foundIndex];
        out.push({
          attachment,
          component,
          componentId,
          index: foundIndex,
        });
      }
    }
  }

  return out;
}

export function mapFormData(formData: IFormData, mapping: IMapping | undefined) {
  const mappedFormData = {};
  if (!formData) {
    return mappedFormData;
  }

  if (!mapping) {
    return formData;
  }

  Object.keys(mapping).forEach((source: string) => {
    const target: string = mapping[source];
    mappedFormData[target] = formData[source];
  });
  return mappedFormData;
}
