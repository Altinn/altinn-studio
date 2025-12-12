import { useMemo } from 'react';

import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import type { ResolvedCompExternal } from 'nextsrc/nextpoc/stores/layoutStore';

import type { FormComponentProps } from 'src/layout/common.generated';

export function isFormComponentProps(
  component: ResolvedCompExternal,
): component is ResolvedCompExternal & FormComponentProps {
  return component != null && ('readOnly' in component || 'required' in component || 'showValidations' in component);
}
function evaluateBooleanOrExpression(
  maybeExpression: boolean | any[],
  parentBinding: string | undefined,
  itemIndex: number | undefined,
) {
  if (Array.isArray(maybeExpression)) {
    const { evaluateExpression } = layoutStore.getState();
    // @ts-ignore
    return !!evaluateExpression(maybeExpression, parentBinding, itemIndex);
  }
  return maybeExpression;
}

export function useValidateComponent(
  component: ResolvedCompExternal,
  currentValue?: any,
  parentBinding?: string,
  itemIndex?: number,
) {
  return useMemo(() => {
    if (!isFormComponentProps(component)) {
      return [];
    }

    const errors: string[] = [];

    const isRequired = component.required
      ? evaluateBooleanOrExpression(component.required, parentBinding, itemIndex)
      : false;

    if (isRequired) {
      if (!currentValue) {
        errors.push('This value is required');
      }
    }

    return errors;
  }, [component, currentValue, parentBinding, itemIndex]);
}
