import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import type { EnvironmentEntry } from './types';

const environmentConfigType = 'altinn:EnvironmentConfig';
const eFormidlingDataTypesType = 'altinn:EFormidlingDataTypes';
const dataTypeType = 'altinn:DataType';

/**
 * Conversions between moddle elements and plain `EnvironmentEntry` values, so that everything above
 * this file can be written and tested without bpmn-js.
 */

/** `<altinn:correspondenceResource env="tt02">value</altinn:correspondenceResource>` and friends. */
export const fromEnvironmentConfigElements = (
  elements: ModdleElement[] | undefined,
): EnvironmentEntry<string>[] =>
  (elements ?? []).map((element) => ({ env: element.env, value: element.value ?? '' }));

export const toEnvironmentConfigElements = (
  entries: EnvironmentEntry<string>[],
  moddle: Moddle,
  existingElements: ModdleElement[] | undefined,
): ModdleElement[] =>
  mapEntriesToElements(
    entries,
    existingElements,
    (element, entry) => element.env === entry.env && (element.value ?? '') === entry.value,
    ({ env, value }) => moddle.create(environmentConfigType, { env, value }),
  );

/** `<altinn:dataTypes env="tt02"><altinn:dataType>model</altinn:dataType></altinn:dataTypes>`. */
export const fromEFormidlingDataTypesElements = (
  elements: ModdleElement[] | undefined,
): EnvironmentEntry<string[]>[] =>
  (elements ?? []).map((element) => ({ env: element.env, value: readDataTypes(element) }));

export const toEFormidlingDataTypesElements = (
  entries: EnvironmentEntry<string[]>[],
  moddle: Moddle,
  existingElements: ModdleElement[] | undefined,
): ModdleElement[] =>
  mapEntriesToElements(
    entries,
    existingElements,
    (element, entry) => element.env === entry.env && hasDataTypes(element, entry.value),
    ({ env, value }) =>
      moddle.create(eFormidlingDataTypesType, {
        env,
        values: value.map((dataType) => moddle.create(dataTypeType, { dataType })),
      }),
  );

/**
 * A `<altinn:dataType/>` with no id in it reads as an empty string rather than being dropped here:
 * the layer above decides what to do with it, and it can only decide that if it is told.
 */
const readDataTypes = (element: ModdleElement): string[] =>
  ((element.values ?? []) as ModdleElement[]).map(
    (dataTypeElement) => dataTypeElement.dataType ?? '',
  );

const hasDataTypes = (element: ModdleElement, dataTypes: string[]): boolean => {
  const elementDataTypes = readDataTypes(element);
  return (
    elementDataTypes.length === dataTypes.length &&
    elementDataTypes.every((dataType, index) => dataType === dataTypes[index])
  );
};

/**
 * Turns entries back into elements, handing back the element an entry came from whenever nothing
 * about that entry changed.
 *
 * Without this, a write re-creates every element from `{env, value}`, and an attribute the altinn
 * moddle schema does not declare - `<altinn:correspondenceResource fallback="later-version">` from
 * a hand-written or newer-schema file, say - is parked in moddle's `$attrs` and left behind. `env`
 * and `value` are all `altinn:EnvironmentConfig` declares today, so no *declared* property is lost
 * either way; everything else the parsed element carries is what reuse saves, and files carry such
 * things today. The example is deliberately unprefixed: moddle strips the namespace prefix off an
 * unknown *prefixed* attribute on every save, edit or not, so that case is mangled either way.
 *
 * Reuse is per entry, not per child: a changed `EFormidlingDataTypes` entry gets freshly created
 * `altinn:DataType` children, so adding one id loses what its siblings carried beyond their own.
 * The one entry the user just edited is likewise re-created, because its value is by definition not
 * the one the file had.
 *
 * The invariant undo rests on: a reused element is never mutated in place. The undo handler
 * snapshots the old array, whose elements are these same objects, and every write replaces the
 * whole list and re-creates what changed - so the snapshot stays true. An `element.value = ...`
 * added later would corrupt it silently, and nothing here would catch it.
 */
const mapEntriesToElements = <TValue>(
  entries: EnvironmentEntry<TValue>[],
  existingElements: ModdleElement[] | undefined,
  isUnchanged: (element: ModdleElement, entry: EnvironmentEntry<TValue>) => boolean,
  createElement: (entry: EnvironmentEntry<TValue>) => ModdleElement,
): ModdleElement[] => {
  const unclaimedElements = [...(existingElements ?? [])];
  return entries.map((entry) => {
    const index = unclaimedElements.findIndex((element) => isUnchanged(element, entry));
    return index === -1 ? createElement(entry) : unclaimedElements.splice(index, 1)[0];
  });
};
