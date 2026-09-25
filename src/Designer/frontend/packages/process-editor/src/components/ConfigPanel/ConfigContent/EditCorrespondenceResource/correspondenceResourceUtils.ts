import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';

/**
 * An entry without env is the default resource. Edit this entry without changing environment
 * overrides.
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
