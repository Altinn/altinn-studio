import { useMemo } from 'react';

import { useCustomValidationConfig } from 'src/features/customValidation/CustomValidationContext';
import { evalExpr } from 'src/features/expressions';
import { FD } from 'src/features/formData/FormDataWrite';
import { type FieldValidations, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { getKeyWithoutIndex } from 'src/utils/databindings';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { useNodeTraversalSilent } from 'src/utils/layout/useNodeTraversal';
import type { Expression } from 'src/features/expressions/types';

const __default__ = {};

export function useExpressionValidation(): FieldValidations {
  const formData = FD.useDebounced();
  const customValidationConfig = useCustomValidationConfig();
  const dataSources = useExpressionDataSources();
  const allNodes = useNodeTraversalSilent((t) => t.allNodes());
  const nodeDataSelector = NodesInternal.useNodeDataSelector();

  /**
   * Should only update when form data changes
   */
  return useMemo(() => {
    if (!customValidationConfig || Object.keys(customValidationConfig).length === 0 || !formData || !allNodes) {
      return __default__;
    }

    return allNodes.reduce((validations, node) => {
      const dmb = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
      if (!dmb) {
        return validations;
      }

      for (const field of Object.values(dmb)) {
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
          const isInvalid = evalExpr(validationDef.condition as Expression, node, dataSources, {
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
  }, [customValidationConfig, formData, allNodes, nodeDataSelector, dataSources]);
}
