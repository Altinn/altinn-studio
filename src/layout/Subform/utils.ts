/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useMemo } from 'react';

import dot from 'dot-object';

import { ContextNotProvided } from 'src/core/contexts/context';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { FD } from 'src/features/formData/FormDataWrite';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { useInnerLanguageWithForcedNodeSelector } from 'src/features/language/useLanguage';
import {
  type DataSourceOverrides,
  type ExpressionDataSources,
  useExpressionDataSources,
} from 'src/utils/layout/useExpressionDataSources';
import { getStatefulDataModelUrl } from 'src/utils/urls/appUrlHelper';
import type { ExprConfig, ExprValToActualOrExpr, NodeReference } from 'src/features/expressions/types';
import type { IDataModelReference } from 'src/layout/common.generated';

export function useSubformFormData(dataElementId: string) {
  const instanceId = useStrictInstanceId();
  const url = getStatefulDataModelUrl(instanceId, dataElementId, true);
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
      return dot.pick(reference.field, subformData);
    },
    [formDataSelector, dataType, subformData],
  );
}

function useLangToolsSelectorForSubform(dataType: string, subformData: unknown) {
  return useInnerLanguageWithForcedNodeSelector(
    dataType,
    useDataModelNamesForSubform(dataType),
    useFormDataSelectorForSubform(dataType, subformData),
    selectorContextNotProvided,
  );
}

function selectorContextNotProvided(..._args: unknown[]): typeof ContextNotProvided {
  return ContextNotProvided;
}

function useOverriddenDataSourcesForSubform(
  dataType: string,
  subformData: unknown,
): DataSourceOverrides['dataSources'] {
  return {
    defaultDataType: () => dataType,
    currentDataModelPath: () => undefined,
    dataModelNames: () => useDataModelNamesForSubform(dataType),
    formDataSelector: () => useFormDataSelectorForSubform(dataType, subformData),
    langToolsSelector: () => useLangToolsSelectorForSubform(dataType, subformData),
  };
}

const dataSourcesNotSupportedInSubform = new Set([
  'attachmentsSelector',
  'optionsSelector',
  'isHiddenSelector',
  'nodeDataSelector',
  'transposeSelector',
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
  reference: NodeReference,
): string | null {
  const errorIntroText = `Invalid expression for component '${reference.id}'`;
  if (!ExprValidation.isValidOrScalar(entryDisplayName, ExprVal.String, errorIntroText)) {
    return null;
  }

  const config: ExprConfig = {
    returnType: ExprVal.String,
    defaultValue: '',
  };

  const resolvedValue = evalExpr(entryDisplayName, reference, dataSources, { config, errorIntroText });
  return resolvedValue ? String(resolvedValue) : null;
}
