import { object } from 'dot-object';
import { ILayout, ILayoutGroup } from 'src/features/form/layout';

const jsonPtr = require('json-ptr');

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

export const filterFormData = (data: any, model: any): any => {
  const filteredResult: any = {};
  const rootKey = Object.keys(model.properties)[0];
  const modelPath = model.properties[rootKey].$ref.slice(1);
  const pointer = jsonPtr.create(modelPath);
  const root = pointer.get(model);
  Object.keys(data).forEach((key: string) => {
    const formDataKey = getKeyWithoutIndex(key);
    const formDataRoot = formDataKey.split('.')[0];
    const element = root.properties[formDataRoot];
    if (element && (!element['@xsdType'] || element['@xsdType'] !== 'XmlAttribute')) {
      filteredResult[key] = data[key];
    }
  });
  return filteredResult;
};

export function getKeyWithoutIndex(keyWithIndex: string): string {
  if (keyWithIndex.indexOf('[') === -1) {
    return keyWithIndex;
  }

  return keyWithIndex.substring(0, keyWithIndex.indexOf('['))
    + keyWithIndex.substring(keyWithIndex.indexOf(']') + 1);
}

/**
 * Converts JSON to the flat datamodel used in Redux data store
 * @param data The form data as JSON
 */
export function flattenObject(data: any, index: boolean = false): any {
  const toReturn: IData = {};

  for (const i in data) {
    if (!data.hasOwnProperty(i)) {
      continue;
    }
    if (Array.isArray(data[i])) {
      const flatObject = flattenObject(data[i], true);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) {
          continue;
        }
        toReturn[i + '[' + x] = flatObject[x];
      }
    } else if ((typeof data[i]) === 'object') {
      const flatObject = flattenObject(data[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) {
          continue;
        }
        if (index) {
          toReturn[i + '].' + x] = flatObject[x];
        } else {
          toReturn[i + '.' + x] = flatObject[x];
        }
      }
    } else {
      toReturn[i] = data[i].toString();
    }
  }
  return toReturn;
}

export function removeGroupData(
  formData: any,
  index: any,
  layout: ILayout,
  groupId: string,
  repeatingGroupCount: number,
): any {
  const result = { ...formData };
  const groupElement: ILayoutGroup = layout.find((element) => {
    return element.id === groupId;
  }) as ILayoutGroup;
  const groupDataModelBinding = groupElement.dataModelBindings.group;
  deleteGroupData(result, groupDataModelBinding, index);

  if (index < repeatingGroupCount + 1) {
    for (let i = index + 1; i <= repeatingGroupCount + 1; i++) {
      deleteGroupData(result, groupDataModelBinding, i, true);
    }
  }

  return result;
}

function deleteGroupData(formData: any, groupDataModelBinding: string, index: number, shiftData?: boolean) {
  const prevData = { ...formData };
  Object.keys(formData).filter((key) => key.startsWith(`${groupDataModelBinding}[${index}]`))
    .forEach((key) => {
      // eslint-disable-next-line no-param-reassign
      delete formData[key];
      if (shiftData) {
        const newKey = key.replace(`${groupDataModelBinding}[${index}]`, `${groupDataModelBinding}[${index - 1}]`);
        // eslint-disable-next-line no-param-reassign
        formData[newKey] = prevData[key];
      }
    });
}
