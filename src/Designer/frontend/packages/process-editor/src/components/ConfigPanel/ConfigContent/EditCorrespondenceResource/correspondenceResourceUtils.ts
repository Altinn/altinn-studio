import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';

/**
 * The app runtime resolves the correspondence resource per environment: an entry carrying an `env`
 * attribute applies to that environment, and the entry without one applies to every other. The
 * configuration panel edits that environment-independent entry, so entries scoped to an environment
 * are carried through untouched rather than replaced.
 */
export const getGlobalCorrespondenceResource = (
  correspondenceResources: ModdleElement[] | undefined,
): ModdleElement | undefined =>
  correspondenceResources?.find((correspondenceResource) => !correspondenceResource.env);

export const withUpdatedGlobalCorrespondenceResource = (
  correspondenceResources: ModdleElement[] | undefined,
  value: string,
  moddle: Moddle,
): ModdleElement[] => {
  const existingResources = correspondenceResources ?? [];
  const updatedResource = moddle.create('altinn:EnvironmentConfig', { value });
  const globalIndex = existingResources.findIndex(
    (correspondenceResource) => !correspondenceResource.env,
  );

  if (globalIndex === -1) {
    return [...existingResources, updatedResource];
  }

  return existingResources.map((correspondenceResource, index) =>
    index === globalIndex ? updatedResource : correspondenceResource,
  );
};
