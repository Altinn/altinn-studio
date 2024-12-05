import type { TextResource } from '../../types/TextResource';
import { ArrayUtils } from '@studio/pure-functions';

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
  return ArrayUtils.replaceByPredicate(
    textResources,
    (textResource) => textResource.id === newTextResource.id,
    newTextResource,
  );
}
