import { object } from 'dot-object';

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

export interface IData {
  [key: string]: any;
}

/**
 * Convertes JSON to the flat datamodel used in Redux data store
 * @param data The formdata as JSON
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
 * Convertes JSON to the flat datamodel used in Redux data store
 * @param data The formdata as JSON
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
      toReturn[i] = data[i];
    }

  }
  return toReturn;
}
