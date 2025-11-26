import type { TextResource } from '../../types/TextResource';

export function retrieveSelectedValues(
  textResources: TextResource[],
  id?: string | null,
): string[] {
  return id != null && doesTextResourceExist(textResources, id) ? [id] : [];
}

function doesTextResourceExist(textResources: TextResource[], id: string): boolean {
  return textResources.some((textResource) => textResource.id === id);
}
