import type { TextResource } from '../../types/TextResource';

export function getTextResourceById(textResources: TextResource[], id: string): TextResource {
  return textResources.find((textResource) => textResource.id === id);
}

export function editTextResourceValue(textResource: TextResource, newValue: string): TextResource {
  return {
    ...textResource,
    value: newValue,
  };
}

export function changeTextResourceInList(
  textResources: TextResource[],
  newTextResource: TextResource,
): TextResource[] {
  const index = textResources.findIndex((textResource) => textResource.id === newTextResource.id);
  const newResources = [...textResources];
  newResources[index] = newTextResource;
  return newResources;
}
