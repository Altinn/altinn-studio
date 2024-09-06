import { isDataModelReference } from 'src/utils/databindings';
import type { ILayouts } from 'src/layout/layout';
import type { IInstance } from 'src/types/shared';

export class MissingDataTypeException extends Error {
  public readonly dataType: string;

  constructor(dataType: string) {
    super(
      `Tried to reference the data type \`${dataType}\`, but no data type with this id was found in \`applicationmetadata.json\``,
    );
    this.dataType = dataType;
  }
}

export class MissingClassRefException extends Error {
  public readonly dataType: string;

  constructor(dataType: string) {
    super(
      `Tried to reference the data type \`${dataType}\`, but the data type in \`applicationmetadata.json\` was missing a \`classRef\``,
    );
    this.dataType = dataType;
  }
}

export class MissingDataElementException extends Error {
  public readonly dataType: string;

  constructor(dataType: string) {
    super(
      `Tried to reference the data type \`${dataType}\`, but no data element of this type was found in the instance data. This could be because the data type is missing a \`taskId\`, or it has \`autoCreate: false\` and no element has been created manually`,
    );
    this.dataType = dataType;
  }
}

export class MissingDataModelException extends Error {
  public readonly dataType: string;

  constructor(dataType: string) {
    super(`Tried to reference the data type \`${dataType}\`, but this data type is not writable or does not exist.`);
    this.dataType = dataType;
  }
}

/**
 * Looks through all layouts and returns a list of unique data types that are referenced in dataModelBindings,
 * it will also include the default data type, which is necessary in case there are string bindings
 */
export function getAllReferencedDataTypes(layouts: ILayouts, defaultDataType?: string) {
  const dataTypes = new Set<string>();

  if (defaultDataType) {
    dataTypes.add(defaultDataType);
  }

  for (const layout of Object.values(layouts)) {
    for (const component of layout ?? []) {
      if ('dataModelBindings' in component && component.dataModelBindings) {
        for (const binding of Object.values(component.dataModelBindings)) {
          if (isDataModelReference(binding)) {
            dataTypes.add(binding.dataType);
          }
        }
      }
      addDataTypesFromExpressionsRecursive(component, dataTypes);
    }
  }

  return [...dataTypes];
}

/**
 * Recurse component properties and look for data types in expressions ["dataModel", "...", "dataType"]
 * This will mutate the input Set and add the discovered data types directly
 * Logs a warning if a non-string (e.g. nested expression) is found where the data type is expected, as we cannot resolve expressions at this point
 */
function addDataTypesFromExpressionsRecursive(obj: unknown, dataTypes: Set<string>): void {
  if (obj == null || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return;
  }

  if (Array.isArray(obj)) {
    if (obj.at(0) === 'dataModel' && obj.length === 3) {
      const maybeDataType = obj.at(2);
      if (typeof maybeDataType === 'string') {
        dataTypes.add(maybeDataType);
      } else {
        window.logWarnOnce(
          'A non-string value was found when looking for dataType references in expressions, the following dataType could not be determined:\n',
          maybeDataType,
        );
      }
    }

    for (const child of obj) {
      addDataTypesFromExpressionsRecursive(child, dataTypes);
    }
  } else if (typeof obj === 'object') {
    for (const child of Object.values(obj)) {
      addDataTypesFromExpressionsRecursive(child, dataTypes);
    }
  }
}

/**
 * Used to determine if the data type is writable or if it is read only
 * If a data type is not writable, we cannot write to or validate it.
 * Assumes the first dataElement of the correct type is the one to use,
 * we also assume this when creating the url for loading and saving data models @see useDataModelUrl, getFirstDataElementId
 */
export function isDataTypeWritable(
  dataType: string | undefined,
  isStateless: boolean,
  instance: IInstance | undefined,
) {
  if (!dataType) {
    return false;
  }
  if (isStateless) {
    return true;
  }
  const dataElement = instance?.data.find((data) => data.dataType === dataType);
  return !!dataElement && dataElement.locked === false;
}
