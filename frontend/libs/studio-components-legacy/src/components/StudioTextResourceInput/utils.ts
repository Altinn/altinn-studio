import type { TextResource } from '../../types/TextResource';

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

export function createNewTextResource(value: string): TextResource {
  return {
    id: generateRandomTextResourceId(),
    value,
  };
}

export function generateRandomTextResourceId(length: number = 12): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return `id_${result}`;
}

export function getTextResourceValueIfTextResourceExists(
  textResources: TextResource[],
  textResource: TextResource,
): string {
  const isCurrentIdATextResource: boolean = textResources.some(
    (item: TextResource) => item.id === textResource?.id,
  );
  return isCurrentIdATextResource ? textResource.value : '';
}
