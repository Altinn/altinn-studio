import { useMemo } from 'react';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FormStore } from 'src/features/form/FormContext';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { type ExpressionDataSources, useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
import type { FieldValidation, IExpressionValidation } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';

type ExpressionValidationOutput = {
  bindingKey: string;
  validations: FieldValidation[];
}[];

const emptyArray: never[] = [];

export function useExpressionValidation(bindings: [string, IDataModelReference][]): ExpressionValidationOutput {
  const dataModels = FormStore.bootstrap.useDataModels();

  const out: ExpressionValidationOutput = [];
  for (const [bindingKey, reference] of bindings) {
    const dataModel = dataModels[reference.dataType];
    const validationDefs = dataModel?.expressionValidationConfig?.[removeIndices(reference.field)] ?? emptyArray;
    const dataElementId = dataModel?.dataElementId ?? reference.dataType;

    // The data model bindings and their matching validation definitions are derived from static layout configuration.
    // They do not change over the lifetime of a rendered node instance.
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const validations = useExpressionValidationForBinding(reference, validationDefs, dataElementId);
    if (validations.length > 0) {
      out.push({ bindingKey, validations });
    }
  }

  return out;
}

function useExpressionValidationForBinding(
  reference: IDataModelReference,
  validationDefs: IExpressionValidation[],
  dataElementId: string,
): FieldValidation[] {
  const baseDataSources = useExpressionDataSources(validationDefs);
  const dataSources: ExpressionDataSources = useMemo(
    () => ({ ...baseDataSources, defaultDataType: reference.dataType }),
    [baseDataSources, reference.dataType],
  );

  return useMemo(() => {
    const validations: FieldValidation[] = [];
    const field = reference.field;

    for (const validationDef of validationDefs) {
      const valueArguments: ExprValueArgs<{ field: string }> = { data: { field }, defaultKey: 'field' };
      const isInvalid = evalExpr(validationDef.condition as ExprValToActualOrExpr<ExprVal.Boolean>, dataSources, {
        returnType: ExprVal.Boolean,
        defaultValue: false,
        positionalArguments: [field],
        valueArguments,
      });
      const evaluatedMessage = evalExpr(validationDef.message, dataSources, {
        returnType: ExprVal.String,
        defaultValue: '',
        positionalArguments: [field],
        valueArguments,
      });

      if (isInvalid) {
        validations.push({
          field,
          dataElementId,
          source: FrontendValidationSource.Expression,
          message: { key: evaluatedMessage },
          severity: validationDef.severity,
          category: validationDef.showImmediately ? 0 : ValidationMask.Expression,
        });
      }
    }

    return validations;
  }, [dataElementId, dataSources, reference.field, validationDefs]);
}

function removeIndices(field: string) {
  return field.replace(/\[\d+]/g, '');
}
