import { useCallback, useEffect, useMemo } from 'react';

import dot from 'dot-object';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { FD } from 'src/features/formData/FormDataWrite';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { useInnerLanguageWithForcedPathSelector } from 'src/features/language/useLanguage';
import {
  type DataSourceOverrides,
  type ExpressionDataSources,
  useExpressionDataSources,
} from 'src/utils/layout/useExpressionDataSources';
import { getStatefulDataModelUrl } from 'src/utils/urls/appUrlHelper';
import type { ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IDataModelReference } from 'src/layout/common.generated';

export function useSubformFormData(dataElementId: string) {
  const instanceId = useStrictInstanceId();
  const url = getStatefulDataModelUrl(instanceId, dataElementId);
  const { isFetching: isSubformDataFetching, data: subformData, error: subformDataError } = useFormDataQuery(url);

  useEffect(() => {
    if (subformDataError) {
      window.logErrorOnce(`Error loading data element ${dataElementId} from server.\n`, subformDataError);
    }
  }, [dataElementId, subformDataError]);

  return { isSubformDataFetching, subformData, subformDataError };
}

function useDataModelNamesForSubform(dataType: string) {
  const dataModelNames = DataModels.useReadableDataTypes();
  return useMemo(
    () => (dataModelNames.includes(dataType) ? dataModelNames : [...dataModelNames, dataType]),
    [dataModelNames, dataType],
  );
}

function useFormDataSelectorForSubform(dataType: string, subformData: unknown) {
  const formDataSelector = FD.useDebouncedSelector();
  return useCallback(
    (reference: IDataModelReference) => {
      if (reference.dataType !== dataType) {
        return formDataSelector(reference);
      }
      const result = dot.pick(reference.field, subformData);
      return result;
    },
    [formDataSelector, dataType, subformData],
  );
}

function useLangToolsSelectorForSubform(dataType: string, subformData: unknown) {
  return useInnerLanguageWithForcedPathSelector(
    dataType,
    useDataModelNamesForSubform(dataType),
    useFormDataSelectorForSubform(dataType, subformData),
  );
}

function useOverriddenDataSourcesForSubform(
  dataType: string,
  subformData: unknown,
): DataSourceOverrides['dataSources'] {
  return {
    defaultDataType: () => dataType,
    currentDataModelPath: () => undefined,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    dataModelNames: () => useDataModelNamesForSubform(dataType),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    formDataSelector: () => useFormDataSelectorForSubform(dataType, subformData),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    langToolsSelector: () => useLangToolsSelectorForSubform(dataType, subformData),
  };
}

const dataSourcesNotSupportedInSubform = new Set([
  'attachmentsSelector',
  'hiddenComponents',
  'layoutLookups',
  'displayValues',
] satisfies (keyof ExpressionDataSources)[]);

export function useExpressionDataSourcesForSubform(
  dataType: string,
  subformData: unknown,
  toEvaluate: unknown,
): ExpressionDataSources {
  const overriddenDataSourcesForSubform = useOverriddenDataSourcesForSubform(dataType, subformData);

  const dataSourceOverrides: DataSourceOverrides = {
    dataSources: overriddenDataSourcesForSubform,
    unsupportedDataSources: dataSourcesNotSupportedInSubform,
    errorSuffix: '"entryDisplayName" or "cellContent" in Subform component',
  };

  return useExpressionDataSources(toEvaluate, dataSourceOverrides);
}

export function getSubformEntryDisplayName(
  entryDisplayName: ExprValToActualOrExpr<ExprVal.String>,
  dataSources: ExpressionDataSources,
  baseComponentId: string,
): string | null {
  const errorIntroText = `Invalid expression for component '${baseComponentId}'`;
  if (!ExprValidation.isValidOrScalar(entryDisplayName, ExprVal.String, errorIntroText)) {
    return null;
  }

  const resolvedValue = evalExpr(entryDisplayName, dataSources, {
    returnType: ExprVal.String,
    defaultValue: '',
    errorIntroText,
  });
  return resolvedValue ? String(resolvedValue) : null;
}

export function evalSubformString(
  expr: ExprValToActualOrExpr<ExprVal.String> | undefined,
  dataSources: ExpressionDataSources,
  defaultValue = '',
): string {
  if (!ExprValidation.isValidOrScalar(expr, ExprVal.String)) {
    return defaultValue;
  }

  try {
    const resolvedValue = evalExpr(expr, dataSources, {
      returnType: ExprVal.String,
      defaultValue,
    });

    return resolvedValue ? String(resolvedValue) : defaultValue;
  } catch (error) {
    console.error('Error evaluating subform expression:', error);
    return defaultValue;
  }
}
