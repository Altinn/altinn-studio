import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import type { EnvironmentEntry } from './types';

/** `<altinn:correspondenceResource env="tt02">value</altinn:correspondenceResource>` and friends. */
export const fromEnvironmentConfigElements = (
  elements: ModdleElement[] | undefined,
): EnvironmentEntry<string>[] =>
  (elements ?? []).map((element) => ({ env: element.env, value: element.value ?? '' }));

export const toEnvironmentConfigElements = (
  entries: EnvironmentEntry<string>[],
  moddle: Moddle,
): ModdleElement[] =>
  entries.map(({ env, value }) => moddle.create('altinn:EnvironmentConfig', { env, value }));

/** `<altinn:dataTypes env="tt02"><altinn:dataType>model</altinn:dataType></altinn:dataTypes>`. */
export const fromEFormidlingDataTypesElements = (
  elements: ModdleElement[] | undefined,
): EnvironmentEntry<string[]>[] =>
  (elements ?? []).map((element) => ({
    env: element.env,
    value: ((element.values ?? []) as ModdleElement[])
      .map((dataTypeElement) => dataTypeElement.dataType)
      .filter(Boolean),
  }));

export const toEFormidlingDataTypesElements = (
  entries: EnvironmentEntry<string[]>[],
  moddle: Moddle,
): ModdleElement[] =>
  entries.map(({ env, value }) =>
    moddle.create('altinn:EFormidlingDataTypes', {
      env,
      values: value.map((dataType) => moddle.create('altinn:DataType', { dataType })),
    }),
  );
