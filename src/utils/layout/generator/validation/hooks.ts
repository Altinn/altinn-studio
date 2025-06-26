import type { JSONSchema7 } from 'json-schema';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useValidateDataModelBindingsAny<T extends CompTypes>(
  node: LayoutNode<T>,
  bindings: IDataModelBindings<T>,
  key: string,
  validTypes: string[],
  isRequired = 'isDataModelBindingsRequired' in node.def ? node.def.isDataModelBindingsRequired(node as never) : false,
  name = key,
): [string[], undefined] | [undefined, JSONSchema7] {
  const lookupBinding = DataModels.useLookupBinding();
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

export function useValidateDataModelBindingsSimple<T extends CompTypes>(
  node: LayoutNode<T>,
  bindings: IDataModelBindings<T>,
  isRequired = 'isDataModelBindingsRequired' in node.def ? node.def.isDataModelBindingsRequired(node as never) : false,
): string[] {
  const [errors] = useValidateDataModelBindingsAny(
    node,
    bindings,
    'simpleBinding',
    ['string', 'number', 'integer', 'boolean'],
    isRequired,
    'simple',
  );

  return errors || [];
}

export function useValidateDataModelBindingsList<T extends CompTypes>(
  node: LayoutNode<T>,
  bindings: IDataModelBindings<T>,
  isRequired = 'isDataModelBindingsRequired' in node.def ? node.def.isDataModelBindingsRequired(node as never) : false,
): string[] {
  const [errors, result] = useValidateDataModelBindingsAny(node, bindings, 'list', ['array'], isRequired);
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
