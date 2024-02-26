import { useMemo } from 'react';

import { useCustomValidationConfig } from 'src/features/customValidation/CustomValidationContext';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FD } from 'src/features/formData/FormDataWrite';
import { type FieldValidations, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { useAsRef } from 'src/hooks/useAsRef';
import { getKeyWithoutIndex } from 'src/utils/databindings';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { ExprConfig, Expression } from 'src/features/expressions/types';

const EXPR_CONFIG: ExprConfig<ExprVal.Boolean> = {
  defaultValue: false,
  returnType: ExprVal.Boolean,
  resolvePerRow: false,
};

const __default__ = {};

export function useExpressionValidation(): FieldValidations {
  const formData = FD.useDebounced();
  const customValidationConfig = useCustomValidationConfig();
  const nodesRef = useAsRef(useNodes());

  /**
   * Should only update when form data changes
   */
  return useMemo(() => {
    if (!customValidationConfig || Object.keys(customValidationConfig).length === 0 || !formData) {
      return __default__;
    }

    return nodesRef.current.allNodes().reduce((validations, node) => {
      if (!node.item.dataModelBindings) {
        return validations;
      }

      for (const field of Object.values(node.item.dataModelBindings)) {
        /**
         * Should not run validations on the same field multiple times
         */
        if (validations[field]) {
          continue;
        }

        const baseField = getKeyWithoutIndex(field);
        const validationDefs = customValidationConfig[baseField];
        if (!validationDefs) {
          continue;
        }

        for (const validationDef of validationDefs) {
          const isInvalid = evalExpr(validationDef.condition as Expression, node, node.getDataSources(), {
            config: EXPR_CONFIG,
            positionalArguments: [field],
          });
          if (isInvalid) {
            if (!validations[field]) {
              validations[field] = [];
            }

            validations[field].push({
              field,
              source: FrontendValidationSource.Expression,
              message: { key: validationDef.message },
              severity: validationDef.severity,
              category: validationDef.showImmediately ? 0 : ValidationMask.Expression,
            });
          }
        }
      }

      return validations;
    }, {});
  }, [customValidationConfig, nodesRef, formData]);
}
