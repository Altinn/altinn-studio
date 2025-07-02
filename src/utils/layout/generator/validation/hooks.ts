import type { JSONSchema7 } from 'json-schema';

import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import { isDataModelBindingsRequired } from 'src/layout';
import type { DataModels } from 'src/features/datamodel/DataModelsProvider';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';

export function validateDataModelBindingsAny<T extends CompTypes>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  lookupBinding: ReturnType<(typeof DataModels)['useLookupBinding']>,
  layoutLookups: LayoutLookups,
  key: string,
  validTypes: string[],
  isRequired = isDataModelBindingsRequired(baseComponentId, layoutLookups),
  name = key,
): [string[], undefined] | [undefined, JSONSchema7] {
  const value: IDataModelReference = (bindings ?? {})[key] ?? undefined;
  if (!lookupBinding || window.forceNodePropertiesValidation === 'off') {
    return [[], undefined];
  }

  if (!value) {
    if (isRequired) {
      return [
        [`En ${name} datamodell-binding er påkrevd for denne komponenten, men mangler i layout-konfigurasjonen.`],
        undefined,
      ];
    }
    return [[], undefined];
  }

  const [result, error] = lookupBinding(value);
  if (error) {
    return [[lookupErrorAsText(error)], undefined];
  }

  const { type } = result;
  if (typeof type !== 'string') {
    return [[`${name}-datamodellbindingen peker mot en ukjent type i datamodellen`], undefined];
  }

  if (!validTypes.includes(type)) {
    return [
      [
        `${name}-datamodellbindingen peker mot en type definert som ${type} i datamodellen, ` +
          `men burde være en av ${validTypes.join(', ')}`,
      ],
      undefined,
    ];
  }

  return [undefined, result];
}

export function validateDataModelBindingsSimple<T extends CompTypes>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  lookupBinding: ReturnType<(typeof DataModels)['useLookupBinding']>,
  layoutLookups: LayoutLookups,
  isRequired = isDataModelBindingsRequired(baseComponentId, layoutLookups),
): string[] {
  const [errors] = validateDataModelBindingsAny(
    baseComponentId,
    bindings,
    lookupBinding,
    layoutLookups,
    'simpleBinding',
    ['string', 'number', 'integer', 'boolean'],
    isRequired,
    'simple',
  );

  return errors || [];
}

export function validateDataModelBindingsList<T extends CompTypes>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  lookupBinding: ReturnType<(typeof DataModels)['useLookupBinding']>,
  layoutLookups: LayoutLookups,
  isRequired = isDataModelBindingsRequired(baseComponentId, layoutLookups),
): string[] {
  const [errors, result] = validateDataModelBindingsAny(
    baseComponentId,
    bindings,
    lookupBinding,
    layoutLookups,
    'list',
    ['array'],
    isRequired,
  );
  if (errors) {
    return errors;
  }

  if (
    !result.items ||
    typeof result.items !== 'object' ||
    Array.isArray(result.items) ||
    !result.items.type ||
    result.items.type !== 'string'
  ) {
    return [`list-datamodellbindingen peker mot en ukjent type i datamodellen`];
  }

  return [];
}
