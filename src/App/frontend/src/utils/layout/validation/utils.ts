import type { JSONSchema7 } from 'json-schema';

import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import { getRepeatingBinding, isRepeatingComponent } from 'src/features/form/layout/utils/repeating';
import { isDataModelBindingsRequired } from 'src/layout';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';

export function validateDataModelBindingsAny<T extends CompTypes>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  lookupBinding: DataModelBindingValidationContext['lookupBinding'],
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

  const [result, error] = lookupBinding(indexDataModelReferenceForValidation(baseComponentId, value, layoutLookups));
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

/**
 * Rewrites a data model reference so schema validation can resolve bindings inside repeating-group bodies.
 *
 * This preserves strict schema lookup while adding the synthetic row indexes that flat layout validation
 * does not have at hand.
 */
export function indexDataModelReferenceForValidation(
  baseComponentId: string,
  reference: IDataModelReference,
  layoutLookups: LayoutLookups,
): IDataModelReference {
  const parentRepeatingBindings = getParentRepeatingGroupBindings(baseComponentId, layoutLookups);
  if (parentRepeatingBindings.length === 0) {
    return reference;
  }

  let indexedReference = reference;
  for (const repeatingGroupBinding of parentRepeatingBindings) {
    if (indexedReference.dataType !== repeatingGroupBinding.dataType) {
      continue;
    }

    const groupField = repeatingGroupBinding.field;
    const suffix = indexedReference.field.slice(groupField.length);
    if (
      indexedReference.field === groupField ||
      (indexedReference.field.startsWith(`${groupField}.`) && !suffix.startsWith('['))
    ) {
      indexedReference = {
        ...indexedReference,
        field: `${groupField}[0]${indexedReference.field.slice(groupField.length)}`,
      };
    }
  }

  return indexedReference;
}

function getParentRepeatingGroupBindings(baseComponentId: string, layoutLookups: LayoutLookups): IDataModelReference[] {
  const repeatingGroupBindings: IDataModelReference[] = [];
  let childId = baseComponentId;
  let parent = layoutLookups.componentToParent[childId];

  while (parent?.type === 'node') {
    const parentComponent = layoutLookups.allComponents[parent.id];
    const isClaimedByRepeatedBody =
      parentComponent?.type === 'RepeatingGroup'
        ? (parentComponent.children?.includes(childId) ?? false)
        : (layoutLookups.componentToChildren[parent.id]?.includes(childId) ?? false);

    if (isRepeatingComponent(parentComponent) && isClaimedByRepeatedBody) {
      const repeatingBinding = getRepeatingBinding(parentComponent.type, parentComponent.dataModelBindings);
      if (repeatingBinding) {
        repeatingGroupBindings.push(repeatingBinding);
      }
    }

    childId = parent.id;
    parent = layoutLookups.componentToParent[childId];
  }

  return repeatingGroupBindings;
}

export function validateDataModelBindingsSimple<T extends CompTypes>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  lookupBinding: DataModelBindingValidationContext['lookupBinding'],
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
  lookupBinding: DataModelBindingValidationContext['lookupBinding'],
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
