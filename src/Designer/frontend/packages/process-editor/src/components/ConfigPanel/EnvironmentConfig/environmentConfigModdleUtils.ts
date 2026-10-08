import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import type { EnvironmentEntry } from './types';

/**
 * Reads and creates text entries such as `<altinn:correspondenceResource
 * env="tt02">value</altinn:correspondenceResource>`.
 */
export const fromEnvironmentConfigElements = (
  elements: ModdleElement[] | undefined,
): EnvironmentEntry<string>[] =>
  (elements ?? []).map((element) => ({ env: element.env, value: element.value ?? '' }));

export const toEnvironmentConfigElements = (
  entries: EnvironmentEntry<string>[],
  moddle: Moddle,
): ModdleElement[] =>
  entries.map(({ env, value }) => moddle.create('altinn:EnvironmentConfig', { env, value }));
