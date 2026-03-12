import type { IData } from 'src/types/shared';

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
