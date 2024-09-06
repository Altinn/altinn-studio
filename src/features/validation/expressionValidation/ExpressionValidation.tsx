import React, { useEffect } from 'react';

import { FrontendValidationSource, ValidationMask } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { evalExpr } from 'src/features/expressions';
import { FD } from 'src/features/formData/FormDataWrite';
import { Validation } from 'src/features/validation/validationContext';
import { getKeyWithoutIndex } from 'src/utils/databindings';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { useNodeTraversalSilent } from 'src/utils/layout/useNodeTraversal';
import type { Expression } from 'src/features/expressions/types';
import type { IDataModelReference, ILayoutSet } from 'src/layout/common.generated';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

export function ExpressionValidation() {
  const writableDataTypes = DataModels.useWritableDataTypes();

  return (
    <>
      {writableDataTypes.map((dataType) => (
        <IndividualExpressionValidation
          key={dataType}
          dataType={dataType}
        />
      ))}
    </>
  );
}

function IndividualExpressionValidation({ dataType }: { dataType: string }) {
  const updateDataModelValidations = Validation.useUpdateDataModelValidations();
  const formData = FD.useDebounced(dataType);
  const expressionValidationConfig = DataModels.useExpressionValidationConfig(dataType);
  const dataSources = useExpressionDataSources();
  const allNodes = useNodeTraversalSilent((t) => t.allNodes());
  const nodeDataSelector = NodesInternal.useNodeDataSelector();

  useEffect(() => {
    if (expressionValidationConfig && Object.keys(expressionValidationConfig).length > 0 && formData && allNodes) {
      const validations = {};

      for (const node of allNodes) {
        const dmb = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
        if (!dmb) {
          continue;
        }

        // Modify the hierarchy data sources to make the current dataModel the default one when running expression validations
        const currentLayoutSet = dataSources.currentLayoutSet;
        const modifiedCurrentLayoutSet: ILayoutSet | null = currentLayoutSet
          ? {
              ...currentLayoutSet,
              dataType,
            }
          : null;
        const modifiedDataSources: ExpressionDataSources = {
          ...dataSources,
          currentLayoutSet: modifiedCurrentLayoutSet,
        };

        for (const reference of Object.values(dmb as Record<string, IDataModelReference>)) {
          if (reference.dataType !== dataType) {
            continue;
          }

          const field = reference.field;

          /**
           * Should not run validations on the same field multiple times
           */
          if (validations[field]) {
            continue;
          }

          const baseField = getKeyWithoutIndex(field);
          const validationDefs = expressionValidationConfig[baseField];
          if (!validationDefs) {
            continue;
          }

          for (const validationDef of validationDefs) {
            const isInvalid = evalExpr(validationDef.condition as Expression, node, modifiedDataSources, {
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
      }

      updateDataModelValidations('expression', dataType, validations);
    }
  }, [
    expressionValidationConfig,
    formData,
    dataType,
    updateDataModelValidations,
    allNodes,
    nodeDataSelector,
    dataSources,
  ]);

  return null;
}
