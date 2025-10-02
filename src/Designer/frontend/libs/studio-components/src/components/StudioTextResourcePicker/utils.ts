import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';

export function retrieveSelectedValues(textResources: TextResource[], id?: string): string[] {
  return doesTextResourceExist(textResources, id) && id ? [id] : [];
}

function doesTextResourceExist(textResources: TextResource[], id?: string): boolean {
  return textResources.some((textResource) => textResource.id === id);
}
