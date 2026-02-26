import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';

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
