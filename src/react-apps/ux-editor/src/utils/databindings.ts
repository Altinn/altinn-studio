import { object } from 'dot-object';

/**
 * Converts the formdata in store (that is flat) to a JSON
 * object that matches the JSON datamodel defined by the service from
 * XSD. This is needed for the API to understand
 * @param formData the complete datamodel in store
 */
export function convertDataBindingToModel(formData: any, dataModelElements: IDataModelFieldElement[]): any {
  return object(Object.assign({}, formData));
}

export interface IData {
  [key: string]: any;
}

/**
 * Convertes JSON to the flat datamodel used in Redux data store
 * @param data The formdata as JSON
 */
export function convertModelToDataBinding(data: any, model: IDataModelFieldElement[]): any {
  const result = flattenObject(data);
  return filterFormData(result, model);
}

const filterFormData = (data: any, model: IDataModelFieldElement[]): any => {
  const filteredResult: any = {};
  Object.keys(data).forEach((key: string) => {
    const formDataKey = getKeyWithoutIndex(key);
    if (model.find((m) => m.DataBindingName === formDataKey && m.Type === 'Field')) {
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
