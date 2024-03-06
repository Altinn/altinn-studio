import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { buildNodeValidation, selectValidations, validationNodeFilter } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Gets all validations that are bound to a data model field,
 * including component validations which have a binding key association.
 */
export function useBindingValidationsForNode<
  N extends LayoutNode,
  T extends CompTypes = N extends BaseLayoutNode<any, infer T> ? T : never,
>(node: N): { [binding in keyof NonNullable<IDataModelBindings<T>>]: NodeValidation[] } | undefined {
  const fieldSelector = Validation.useFieldSelector();
  const componentSelector = Validation.useComponentSelector();
  const visibilitySelector = Validation.useVisibilitySelector();

  return useMemo(() => {
    if (!node.item.dataModelBindings) {
      return undefined;
    }
    const mask = getVisibilityForNode(node, visibilitySelector);
    const bindingValidations = {};
    for (const [bindingKey, field] of Object.entries(node.item.dataModelBindings)) {
      bindingValidations[bindingKey] = [];

      const fieldValidation = fieldSelector(field, (fields) => fields[field]);
      if (fieldValidation) {
        const validations = selectValidations(fieldValidation, mask);
        bindingValidations[bindingKey].push(
          ...validations
            .filter(validationNodeFilter(node))
            .map((validation) => buildNodeValidation(node, validation, bindingKey)),
        );
      }
      const component = componentSelector(node.item.id, (components) => components[node.item.id]);
      if (component?.bindingKeys?.[bindingKey]) {
        const validations = selectValidations(component.bindingKeys[bindingKey], mask);
        bindingValidations[bindingKey].push(
          ...validations
            .filter(validationNodeFilter(node))
            .map((validation) => buildNodeValidation(node, validation, bindingKey)),
        );
      }
    }
    return bindingValidations as { [binding in keyof NonNullable<IDataModelBindings<T>>]: NodeValidation[] };
  }, [node, visibilitySelector, fieldSelector, componentSelector]);
}
