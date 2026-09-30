import { useEffect, useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

export function Summary2LayoutValidator({ externalItem }: ComponentLayoutValidationProps<'Summary2'>) {
  const addError = FormStore.layoutDiagnostics.useAddError();

  const errors = useMemo(() => {
    const errors: string[] = [];
    const overrides = externalItem.overrides;
    if (overrides) {
      const uniqueComponentIds = new Set<string>();
      const uniqueComponentTypes = new Set<string>();

      for (const override of overrides) {
        if ('componentId' in override) {
          if (uniqueComponentIds.has(override.componentId)) {
            errors.push(`Duplicate componentId '${override.componentId}' in summary overrides`);
          } else {
            uniqueComponentIds.add(override.componentId);
          }
        }
        if ('componentType' in override) {
          if (uniqueComponentTypes.has(override.componentType)) {
            errors.push(`Duplicate componentType '${override.componentType}' in summary overrides`);
          } else {
            uniqueComponentTypes.add(override.componentType);
          }
        }
        if ('componentType' in override && 'componentId' in override) {
          errors.push(`Both componentType and componentId are set in summary overrides`);
        }
      }
    }

    return errors;
  }, [externalItem]);

  useEffect(() => {
    if (errors.length > 0) {
      const error = `Summary overrides contain errors: \n- ${errors.join('\n- ')}`;
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    }
  }, [errors, externalItem.id, addError]);

  return null;
}
