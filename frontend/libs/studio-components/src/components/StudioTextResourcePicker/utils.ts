import type { TextResource } from '../../types/TextResource';

export function doesTextResourceExist(textResources: TextResource[], id: string): boolean {
  return textResources.some((textResource) => textResource.id === id);
}
