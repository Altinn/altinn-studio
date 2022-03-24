/* eslint-disable max-len */
import { object } from 'dot-object';
import { ILayout, ILayoutGroup } from 'src/features/form/layout';
import { IMapping, IRepeatingGroup } from 'src/types';
import { getParentGroup } from './validation';
import { IFormData } from 'src/features/form/data/formDataReducer';

/**
 * Converts the formdata in store (that is flat) to a JSON
 * object that matches the JSON datamodel defined by the service from
 * XSD. This is needed for the API to understand
 * @param formData the complete datamodel in store
 */
export function convertDataBindingToModel(formData: any): any {
  return object({ ...formData });
}

export function filterOutInvalidData(data: any, invalidKeys: string[]) {
  const result = {};
  Object.keys(data).forEach((key) => {
    // eslint-disable-next-line no-prototype-builtins
    if (data.hasOwnProperty(key) && !invalidKeys.includes(key)) {
      result[key] = data[key];
    }
  });

  return result;
}

export interface IData {
  [key: string]: any;
}

/**
 * Converts JSON to the flat datamodel used in Redux data store
 * @param data The form data as JSON
 */
export function convertModelToDataBinding(data: any): any {
  return flattenObject(data);
}

export function getKeyWithoutIndex(keyWithIndex: string): string {
  if (keyWithIndex.indexOf('[') === -1) {
    return keyWithIndex;
  }

  return getKeyWithoutIndex(
    keyWithIndex.substring(0, keyWithIndex.indexOf('[')) +
      keyWithIndex.substring(keyWithIndex.indexOf(']') + 1),
  );
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
        if (Array.isArray(data[i])) {
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

export function removeGroupData(
  formData: any,
  index: any,
  layout: ILayout,
  groupId: string,
  repeatingGroup: IRepeatingGroup,
): any {
  const result = { ...formData };
  const groupElementId = repeatingGroup.baseGroupId || groupId;
  const groupElement: ILayoutGroup = layout.find((element) => {
    return element.id === groupElementId;
  }) as ILayoutGroup;
  const parentGroup = getParentGroup(groupElement.id, layout);

  let groupDataModelBinding;
  if (parentGroup) {
    const splitId = groupId.split('-');
    const parentIndex = Number.parseInt(splitId[splitId.length - 1], 10);
    const parentDataBinding = parentGroup.dataModelBindings?.group;
    const indexedParentDataBinding = `${parentDataBinding}[${parentIndex}]`;
    groupDataModelBinding = groupElement.dataModelBindings?.group.replace(
      parentDataBinding,
      indexedParentDataBinding,
    );
  } else {
    groupDataModelBinding = groupElement.dataModelBindings.group;
  }

  deleteGroupData(result, groupDataModelBinding, index);

  if (index < repeatingGroup.count + 1) {
    for (let i = index + 1; i <= repeatingGroup.count + 1; i++) {
      deleteGroupData(result, groupDataModelBinding, i, true);
    }
  }

  return result;
}

function deleteGroupData(
  formData: any,
  groupDataModelBinding: string,
  index: number,
  shiftData?: boolean,
) {
  const prevData = { ...formData };
  Object.keys(formData)
    .filter((key) => key.startsWith(`${groupDataModelBinding}[${index}]`))
    .forEach((key) => {
      // eslint-disable-next-line no-param-reassign
      delete formData[key];
      if (shiftData) {
        const newKey = key.replace(
          `${groupDataModelBinding}[${index}]`,
          `${groupDataModelBinding}[${index - 1}]`,
        );
        // eslint-disable-next-line no-param-reassign
        formData[newKey] = prevData[key];
      }
    });
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
