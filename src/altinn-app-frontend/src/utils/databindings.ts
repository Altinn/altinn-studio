import { object } from 'dot-object';

import { getParentGroup } from 'src/utils/validation';
import type { IFormData } from 'src/features/form/data';
import type { ILayout, ILayoutCompFileUpload } from 'src/features/form/layout';
import type {
  IAttachment,
  IAttachments,
} from 'src/shared/resources/attachments';
import type {
  IDataModelBindings,
  IMapping,
  IRepeatingGroup,
  IRepeatingGroups,
} from 'src/types';

/**
 * Converts the formdata in store (that is flat) to a JSON
 * object that matches the JSON datamodel defined by the service from
 * XSD. This is needed for the API to understand
 * @param formData the complete datamodel in store
 */
export function convertDataBindingToModel(formData: any): any {
  return object({ ...formData });
}

export function filterOutInvalidData({
  data,
  invalidKeys = [],
}: {
  data: IFormData;
  invalidKeys: string[];
}) {
  if (!invalidKeys) {
    return data;
  }

  const result = {};
  Object.keys(data).forEach((key) => {
    if (
      Object.prototype.hasOwnProperty.call(data, key) &&
      !invalidKeys.includes(key)
    ) {
      result[key] = data[key];
    }
  });

  return result;
}

export interface IData {
  [key: string]: any;
}

export const INDEX_KEY_INDICATOR_REGEX = /\[{\d+\}]/;
export const GLOBAL_INDEX_KEY_INDICATOR_REGEX = /\[{\d+\}]/g;

/**
 * Converts JSON to the flat datamodel used in Redux data store
 * @param data The form data as JSON
 */
export function convertModelToDataBinding(data: any): any {
  return flattenObject(data);
}

export function getKeyWithoutIndex(keyWithIndex: string): string {
  if (keyWithIndex?.indexOf('[') === -1) {
    return keyWithIndex;
  }

  return getKeyWithoutIndex(
    keyWithIndex.substring(0, keyWithIndex.indexOf('[')) +
      keyWithIndex.substring(keyWithIndex.indexOf(']') + 1),
  );
}

export function getKeyWithoutIndexIndicators(
  keyWithIndexIndicators: string,
): string {
  return keyWithIndexIndicators.replaceAll(
    GLOBAL_INDEX_KEY_INDICATOR_REGEX,
    '',
  );
}

export function keyHasIndexIndicators(key: string): boolean {
  return key.match(GLOBAL_INDEX_KEY_INDICATOR_REGEX)?.length > 0;
}

/** Replaces index indicators with indexes
 * @param keyWithIndexIndicators The key with index indicators
 * @param index The indexes to replace the index indicators with
 * Example input:
 *  keyWithIndexIndicators: SomeField.Group[{0}].SubGroup[{1}].Field
 *  index: [0, 1]
 * Example output:
 *  SomeField.Group[0].SubGroup[1].Field
 */
export function replaceIndexIndicatorsWithIndexes(
  key: string,
  indexes: number[] = [],
) {
  return indexes.reduce((acc, index) => {
    return acc.replace(INDEX_KEY_INDICATOR_REGEX, `[${index}]`);
  }, key);
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
  repeatingGroups: IRepeatingGroups,
): number[][] {
  const combinations: number[][] = [];

  if (!baseGroupBindings?.length || !repeatingGroups) {
    return combinations;
  }

  const repeatingGroupValues = Object.values(repeatingGroups);
  const mainGroupMaxIndex = repeatingGroupValues.find(
    (group) => group.dataModelBinding === baseGroupBindings[0],
  ).index;

  if (baseGroupBindings.length === 1) {
    return Array.from(Array(mainGroupMaxIndex + 1).keys()).map((x) => [x]);
  } else {
    const subGroupBinding = baseGroupBindings[1];
    for (
      let mainGroupIndex = 0;
      mainGroupIndex <= mainGroupMaxIndex;
      mainGroupIndex++
    ) {
      const subGroupKey = Object.keys(repeatingGroups).filter(
        (key) =>
          repeatingGroups[key].dataModelBinding === subGroupBinding &&
          mainGroupIndex === Number(key.split('-').pop()),
      )[0];
      const subGroupMaxIndex = repeatingGroups[subGroupKey]?.index;

      if (subGroupMaxIndex < 0) {
        combinations.push([mainGroupIndex]);
        continue;
      }

      for (
        let subGroupIndex = 0;
        subGroupIndex <= subGroupMaxIndex;
        subGroupIndex++
      ) {
        combinations.push([mainGroupIndex, subGroupIndex]);
      }
    }
  }

  return combinations;
}

/**
 * Returns base group data bindings
 * SomeField.Group[{0}].SubGroup[{1}].Field
 *                  ^             ^
 * Will return ["SomeField.Group", "SomeField.Group.SubGroup"]
 */
export function getBaseGroupDataModelBindingFromKeyWithIndexIndicators(
  key: string,
): string[] {
  const baseGroups: string[] = [];
  const matches = key.match(GLOBAL_INDEX_KEY_INDICATOR_REGEX);
  matches?.forEach((match) =>
    baseGroups.push(
      getKeyWithoutIndexIndicators(key.substring(0, key.indexOf(match))),
    ),
  );
  return baseGroups;
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
export function flattenObject(data: any, index = false): any {
  const toReturn: IData = {};

  Object.keys(data).forEach((i) => {
    if (!i || data[i] === undefined || data[i] === null) return;
    if (Array.isArray(data[i]) || typeof data[i] === 'object') {
      const flatObject = flattenObject(data[i], Array.isArray(data[i]));
      Object.keys(flatObject).forEach((x) => {
        if (!x || (!flatObject[x] && flatObject[x] !== 0)) return;
        let key = '';
        if (Array.isArray(data[i]) && x.match(/^\d+$/)) {
          key = `${i}[${x}]`;
        } else if (Array.isArray(data[i])) {
          key = `${i}[${x}`;
        } else {
          key = index ? `${i}].${x}` : `${i}.${x}`;
        }
        toReturn[key] = flatObject[x];
      });
    } else {
      toReturn[i] = data[i].toString();
    }
  });

  return toReturn;
}

export function getGroupDataModelBinding(
  repeatingGroup: IRepeatingGroup,
  groupId: string,
  layout: ILayout,
) {
  const parentGroup = getParentGroup(
    repeatingGroup.baseGroupId || groupId,
    layout,
  );
  if (parentGroup) {
    const splitId = groupId.split('-');
    const parentIndex = Number.parseInt(splitId[splitId.length - 1], 10);
    const parentDataBinding = parentGroup.dataModelBindings?.group;
    const indexedParentDataBinding = `${parentDataBinding}[${parentIndex}]`;
    return repeatingGroup.dataModelBinding.replace(
      parentDataBinding,
      indexedParentDataBinding,
    );
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
  const groupDataModelBinding = getGroupDataModelBinding(
    repeatingGroup,
    groupId,
    layout,
  );

  deleteGroupData(result, groupDataModelBinding, index, true);

  if (index < repeatingGroup.index + 1) {
    for (let i = index + 1; i <= repeatingGroup.index + 1; i++) {
      deleteGroupData(result, groupDataModelBinding, i, true, true);
    }
  }

  return result;
}

export function removeAttachmentReference(
  formData: IFormData,
  attachmentId: string,
  layout: ILayout,
  attachments: IAttachments,
  dataModelBindings: IDataModelBindings,
  componentId: string,
): IFormData {
  if (
    !dataModelBindings ||
    (!dataModelBindings.simpleBinding && !dataModelBindings.list)
  ) {
    return formData;
  }

  const result = { ...formData };

  if (
    dataModelBindings.simpleBinding &&
    typeof result[dataModelBindings.simpleBinding] === 'string'
  ) {
    delete result[dataModelBindings.simpleBinding];
  } else if (dataModelBindings.list) {
    let index = -1;
    const dataModelWithoutIndex = getKeyWithoutIndex(dataModelBindings.list);
    for (const key in result) {
      if (
        getKeyWithoutIndex(key).startsWith(dataModelWithoutIndex) &&
        result[key] === attachmentId
      ) {
        index = getKeyIndex(key).pop();
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

    for (
      let laterIdx = index + 1;
      laterIdx <= attachments[componentId].length - 1;
      laterIdx++
    ) {
      deleteGroupData(result, dataModelBindings.list, laterIdx, true, true);
    }
  }

  return result;
}

export function deleteGroupData(
  data: { [key: string]: any },
  keyStart: string,
  index: number,
  isDataModelBinding: boolean,
  shiftData?: boolean,
) {
  const prevData = { ...data };
  Object.keys(data)
    .filter((key) =>
      key.startsWith(
        isDataModelBinding ? `${keyStart}[${index}]` : `${keyStart}-${index}`,
      ),
    )
    .forEach((key) => {
      delete data[key];
      if (shiftData) {
        const newKey = key.replace(
          isDataModelBinding ? `${keyStart}[${index}]` : `${keyStart}-${index}`,
          isDataModelBinding
            ? `${keyStart}[${index - 1}]`
            : `${keyStart}-${index - 1}`,
        );
        data[newKey] = prevData[key];
      }
    });
}

interface FoundAttachment {
  attachment: IAttachment;
  component: ILayoutCompFileUpload;
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
  const groupDataModelBinding = getGroupDataModelBinding(
    repeatingGroup,
    groupId,
    layout,
  );
  const out: FoundAttachment[] = [];
  const components = layout.filter(
    (c) => c.type === 'FileUpload' || c.type === 'FileUploadWithTag',
  );
  const formDataKeys = Object.keys(formData).filter((key) =>
    key.startsWith(`${groupDataModelBinding}[${index}]`),
  );

  for (const key of formDataKeys) {
    const dataBinding = getKeyWithoutIndex(key);
    const component = components.find(
      (c) =>
        c.dataModelBindings?.simpleBinding === dataBinding ||
        c.dataModelBindings?.list === dataBinding,
    ) as unknown as ILayoutCompFileUpload;

    if (component) {
      const groupKeys = getKeyIndex(key);
      if (component.dataModelBindings.list) {
        groupKeys.pop();
      }

      const componentId =
        component.id + (groupKeys.length ? `-${groupKeys.join('-')}` : '');
      const foundIndex = (attachments[componentId] || []).findIndex(
        (a) => a.id === formData[key],
      );
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

export function mapFormData(formData: IFormData, mapping: IMapping) {
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

export function getFormDataFromFieldKey(
  fieldKey: string,
  dataModelBindings: IDataModelBindings,
  formData: any,
  groupDataBinding?: string,
  index?: number,
) {
  let dataModelBindingKey = dataModelBindings[fieldKey];
  if (groupDataBinding) {
    dataModelBindingKey = dataModelBindingKey.replace(
      groupDataBinding,
      `${groupDataBinding}[${index}]`,
    );
  }
  let value = formData[dataModelBindingKey];
  if (fieldKey === 'list') {
    value = [];
    for (const key of Object.keys(formData)) {
      if (
        key.startsWith(dataModelBindingKey) &&
        key.substring(dataModelBindingKey.length).match(/^\[\d+]$/)
      ) {
        const indexes = getKeyIndex(key);
        value[indexes.pop()] = formData[key];
      }
    }
    if (!value.length) {
      value = undefined;
    }
  }

  return value;
}
