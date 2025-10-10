import React, { useEffect, useMemo, useState } from 'react';

import { FrontendValidationSource, ValidationMask } from '..';
import type { FieldValidations, IExpressionValidation } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FD } from 'src/features/formData/FormDataWrite';
import { Validation } from 'src/features/validation/validationContext';
import { NestedDataModelLocationProviders } from 'src/utils/layout/DataModelLocation';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprValToActualOrExpr, ExprValueArgs } from 'src/features/expressions/types';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

// This collects single-field validation updates to store in a big object containing all expression field validations
// for a given data type.
type ValidationCollectorApi = {
  setFieldValidations: (fieldKey: string, validations: FieldValidations[string]) => void;
};

export function ExpressionValidation() {
  const writableDataTypes = DataModels.useWritableDataTypes();

  return (
    <>
      {writableDataTypes.map((dataType) => (
        <DataTypeValidation
          key={dataType}
          dataType={dataType}
        />
      ))}
    </>
  );
}

function DataTypeValidation({ dataType }: { dataType: string }) {
  const updateDataModelValidations = Validation.useUpdateDataModelValidations();
  const dataElementId = DataModels.useDataElementIdForDataType(dataType);
  const expressionValidationConfig = DataModels.useExpressionValidationConfig(dataType);

  const [allFieldValidations, setAllFieldValidations] = useState<FieldValidations>({});
  const collector: ValidationCollectorApi = useMemo(
    () => ({
      setFieldValidations: (fieldKey, validations) => {
        setAllFieldValidations((prev) => ({ ...prev, [fieldKey]: validations }));
      },
    }),
    [],
  );

  useEffect(() => {
    if (!dataElementId) {
      return;
    }

    updateDataModelValidations('expression', dataElementId, allFieldValidations);
  }, [allFieldValidations, updateDataModelValidations, dataElementId]);

  if (!dataElementId || !expressionValidationConfig) {
    return null;
  }

  return (
    <>
      {Object.keys(expressionValidationConfig).map((field) => (
        <BaseFieldExpressionValidation
          key={field}
          dataElementId={dataElementId}
          validationDefs={expressionValidationConfig[field]}
          reference={{ dataType, field }}
          collector={collector}
        />
      ))}
    </>
  );
}

function BaseFieldExpressionValidation({
  dataElementId,
  validationDefs,
  reference,
  collector,
}: {
  dataElementId: string;
  validationDefs: IExpressionValidation[];
  reference: IDataModelReference;
  collector: ValidationCollectorApi;
}) {
  const allPaths = FD.useDebouncedAllPaths(reference);

  return (
    <>
      {allPaths.map((field) => (
        <NestedDataModelLocationProviders
          key={field}
          reference={{ dataType: reference.dataType, field }}
        >
          <FieldExpressionValidation
            dataElementId={dataElementId}
            reference={{ dataType: reference.dataType, field }}
            validationDefs={validationDefs}
            collector={collector}
          />
        </NestedDataModelLocationProviders>
      ))}
    </>
  );
}

function FieldExpressionValidation({
  dataElementId,
  reference,
  validationDefs,
  collector,
}: {
  dataElementId: string;
  reference: IDataModelReference;
  validationDefs: IExpressionValidation[];
  collector: ValidationCollectorApi;
}) {
  const baseDataSources = useExpressionDataSources(validationDefs);
  const dataSources: ExpressionDataSources = useMemo(
    () => ({ ...baseDataSources, defaultDataType: reference.dataType }),
    [baseDataSources, reference.dataType],
  );

  useEffect(() => {
    const field = reference.field;
    const validations: FieldValidations[string] = [];

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

    collector.setFieldValidations(reference.field, validations);
  }, [collector, validationDefs, dataElementId, dataSources, reference.field, reference.dataType]);

  return null;
}
