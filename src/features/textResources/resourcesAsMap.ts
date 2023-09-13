import type { IRawTextResource, TextResourceMap } from 'src/features/textResources/index';
import type { ITextResource } from 'src/types/shared';

export function resourcesAsMap(resources: IRawTextResource[]) {
  return resources.reduce((acc, { id, ...resource }) => ({ ...acc, [id]: resource }), {});
}

export function mapAsResources(map: TextResourceMap): ITextResource[] {
  return Object.entries(map).map(([_, resource]) => ({ ...resource, value: resource?.value ?? '' }));
}
