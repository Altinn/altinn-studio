import type { IRawTextResource } from 'src/features/language/textResources/index';

export function resourcesAsMap(resources: IRawTextResource[]) {
  return resources.reduce((acc, { id, ...resource }) => ({ ...acc, [id]: resource }), {});
}
