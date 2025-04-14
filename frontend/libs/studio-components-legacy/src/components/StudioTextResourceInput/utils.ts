import type { TextResource } from '../../types/TextResource';
import { ArrayUtils } from '@studio/pure-functions';
import { Mode } from './types/Mode';

export function getTextResourceById(
  textResources: TextResource[],
  id: string,
): TextResource | undefined {
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

export function createNewTextResource(value: string): TextResource {
  return {
    id: generateRandomTextResourceId(),
    value: value,
  };
}

function generateRandomTextResourceId(min = 1000, max = 9999): string {
  const randomNumber: number = Math.floor(Math.random() * (max - min + 1) + min);
  return `id_${randomNumber}`;
}
