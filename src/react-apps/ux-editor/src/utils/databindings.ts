import * as deepmerge from 'deepmerge';

/**
 * Converts the formdata in store (that is flat) to a JSON 
 * object that matches the JSON datamodel defined by the service from 
 * XSD. This is needed for the API to understand
 * @param dataModels the complete datamodel in store
 */
export function convertDataBindingToModel(dataModels: any): any {
  const dataModelsArray: any[] = [];
  for (const model in dataModels) {
    if (model) {
      let lastElement = true;
      const value = dataModels[model];
      dataModelsArray.push(
        model.split('.').reduceRight((obj: string, next: string) => {
          if (lastElement) {
            lastElement = false;
            return {
              [next]: value,
            };
          }
          lastElement = false;
          return {
            [next]: obj,
          };
        }, {}),
      );
    }
  }
  return deepmerge.all(dataModelsArray);
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
  Object.keys(data).forEach((formDataKey: string) => {
    if (model.find(m => m.DataBindingName === formDataKey && m.Type === 'Field')) {
      filteredResult[formDataKey] = data[formDataKey];
    }
  });
  return filteredResult;
}

/**
 * Convertes JSON to the flat datamodel used in Redux data store
 * @param data The formdata as JSON
 */
export function flattenObject(data: any): any {
  const toReturn: IData = {};

  for (const i in data) {
    if (!data.hasOwnProperty(i)) {
      continue;
    }

    if ((typeof data[i]) === 'object') {
      const flatObject = flattenObject(data[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) {
          continue;
        }
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = data[i];
    }
  }
  return toReturn;
}
