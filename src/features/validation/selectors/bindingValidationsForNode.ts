import { useMemo } from 'react';

import type { ComponentValidation, FieldValidation, NodeValidation } from '..';

import { Validation } from 'src/features/validation/validationContext';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type OutValues = NodeValidation<ComponentValidation | FieldValidation>[];

/**
 * Gets all validations that are bound to a data model field,
 * including component validations which have a binding key association.
 */
export function useBindingValidationsForNode<
  N extends LayoutNode,
  T extends CompTypes = N extends LayoutNode<infer T> ? T : never,
>(node: N): { [binding in keyof NonNullable<IDataModelBindings<T>>]: OutValues } | undefined {
  const showAll = Validation.useShowAllBackendErrors();
  const component = NodesInternal.useVisibleValidations(node, showAll);
  const dataModelBindings = useDataModelBindingsFor(node.baseId);

  return useMemo(() => {
    if (!dataModelBindings) {
      return undefined;
    }

    const bindingValidations: { [bindingKey: string]: OutValues } = {};
    for (const bindingKey of Object.keys(dataModelBindings)) {
      bindingValidations[bindingKey] = [];

      const validations = component as ComponentValidation[];
      bindingValidations[bindingKey].push(
        ...validations
          .filter((v) => 'bindingKey' in v && v.bindingKey === bindingKey)
          .map((validation) => ({ ...validation, bindingKey, node }) as NodeValidation<ComponentValidation>),
      );
    }

    return bindingValidations as {
      [binding in keyof NonNullable<IDataModelBindings<T>>]: OutValues;
    };
  }, [component, node, dataModelBindings]);
}
