import { useMemo } from 'react';

import type { ComponentValidation, FieldValidation, NodeRefValidation } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { useVisibleValidations } from 'src/features/validation/validationHooks';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { CompTypes, IDataModelBindings } from 'src/layout/layout';

type OutValues = NodeRefValidation<ComponentValidation | FieldValidation>[];

/**
 * Gets all validations that are bound to a data model field,
 * including component validations which have a binding key association.
 */
export function useBindingValidationsFor<T extends CompTypes>(
  baseComponentId: string,
): { [binding in keyof NonNullable<IDataModelBindings<T>>]: OutValues } | undefined {
  const showAll = FormStore.validation.useShowAllUnboundValidations();
  const indexedId = useIndexedId(baseComponentId);
  const component = useVisibleValidations(indexedId, showAll);
  const dataModelBindings = useDataModelBindingsFor(baseComponentId);

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
          .map(
            (validation) =>
              ({
                ...validation,
                bindingKey,
                nodeId: indexedId,
                baseComponentId,
              }) satisfies NodeRefValidation<ComponentValidation>,
          ),
      );
    }

    return bindingValidations as {
      [binding in keyof NonNullable<IDataModelBindings<T>>]: OutValues;
    };
  }, [component, baseComponentId, indexedId, dataModelBindings]);
}
