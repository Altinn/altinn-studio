import type { IData, IInstance } from 'src/types/shared';

// Even though the process state is part of the instance data we fetch from the server, we don't want to expose it
// to the rest of the application. This is because the process state is also fetched separately, and that
// is the one we want to use, as it contains more information about permissions than the instance data provides.
export function removeProcessFromInstance(instance: IInstance & { process?: unknown }): IInstance {
  const { process: _process, ...rest } = instance;
  return rest;
}

export function getFirstDataElementId(dataElements: IData[], dataType: string) {
  const elements = dataElements.filter((element) => element.dataType === dataType);
  if (elements.length > 1) {
    window.logWarnOnce(
      `Found multiple data elements with data type ${dataType} in instance, cannot determine which one to use`,
    );
    return undefined;
  }

  return elements.length > 0 ? elements[0].id : undefined;
}
