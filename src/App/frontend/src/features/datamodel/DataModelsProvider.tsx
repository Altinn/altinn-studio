import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useFormBootstrap, useLaxFormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import type { DataModelSchemaResult } from 'src/features/datamodel/SchemaLookupTool';
import type { IExpressionValidations } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';

interface DataModelsState {
  defaultDataType: string;
  allDataTypes: string[];
  writableDataTypes: string[];
  initialData: { [dataType: string]: object };
  dataElementIds: { [dataType: string]: string | null };
  schemaResults: { [dataType: string]: DataModelSchemaResult };
  expressionValidationConfigs: { [dataType: string]: IExpressionValidations | null };
}

export function DataModelsProvider({ children }: PropsWithChildren) {
  return children;
}

function useDataModelsState(): DataModelsState {
  const { dataModels, defaultDataType, allDataTypes, writableDataTypes } = useFormBootstrap();
  return useDataModelsStateFromSource(dataModels, defaultDataType, allDataTypes, writableDataTypes);
}

function useLaxDataModelsState() {
  const bootstrap = useLaxFormBootstrap();
  const state = useDataModelsStateFromSource(
    bootstrap === ContextNotProvided ? emptyDataModels : bootstrap.dataModels,
    bootstrap === ContextNotProvided ? '' : bootstrap.defaultDataType,
    bootstrap === ContextNotProvided ? emptyArray : bootstrap.allDataTypes,
    bootstrap === ContextNotProvided ? emptyArray : bootstrap.writableDataTypes,
  );

  return bootstrap === ContextNotProvided ? ContextNotProvided : state;
}

function useDataModelsStateFromSource(
  dataModels: ReturnType<typeof useFormBootstrap>['dataModels'],
  defaultDataType: string,
  allDataTypes: string[],
  writableDataTypes: string[],
) {
  return useMemo(() => {
    const initialData: Record<string, object> = {};
    const dataElementIds: Record<string, string | null> = {};
    const schemaResults: Record<string, DataModelSchemaResult> = {};
    const expressionValidationConfigs: Record<string, IExpressionValidations | null> = {};

    for (const [dataType, dataModel] of Object.entries(dataModels)) {
      initialData[dataType] = dataModel.initialData;
      dataElementIds[dataType] = dataModel.dataElementId;
      schemaResults[dataType] = dataModel.schemaResult;
      expressionValidationConfigs[dataType] = dataModel.expressionValidationConfig;
    }

    return {
      defaultDataType,
      allDataTypes,
      writableDataTypes,
      initialData,
      dataElementIds,
      schemaResults,
      expressionValidationConfigs,
    };
  }, [allDataTypes, dataModels, defaultDataType, writableDataTypes]);
}

function useLookupBinding() {
  const { schemaResults, allDataTypes } = useDataModelsState();

  return useMemo(() => {
    if (allDataTypes.every((dt) => schemaResults[dt])) {
      return (reference: IDataModelReference) =>
        schemaResults[reference.dataType].lookupTool.getSchemaForPath(reference.field);
    }

    return undefined;
  }, [allDataTypes, schemaResults]);
}

function useFullStateRef() {
  const state = useDataModelsState();
  const ref = useRef(state);

  useEffect(() => {
    ref.current = state;
  }, [state]);

  return ref;
}

const emptyArray: string[] = [];
const emptyDataModels: ReturnType<typeof useFormBootstrap>['dataModels'] = {};

export const DataModels = {
  useFullStateRef,

  useDefaultDataType: () => useDataModelsState().defaultDataType,
  useLaxDefaultDataType: () => {
    const state = useLaxDataModelsState();
    return state === ContextNotProvided ? ContextNotProvided : state.defaultDataType;
  },
  useInitialData: () => useDataModelsState().initialData,

  useReadableDataTypes: () => useDataModelsState().allDataTypes ?? emptyArray,
  useLaxReadableDataTypes: () => {
    const state = useLaxDataModelsState();
    return state === ContextNotProvided ? ContextNotProvided : (state.allDataTypes ?? emptyArray);
  },
  useWritableDataTypes: () => useDataModelsState().writableDataTypes ?? emptyArray,

  useDataModelSchema: (dataType: string) => useDataModelsState().schemaResults[dataType],

  useSchemaLookup: () => {
    const { schemaResults } = useDataModelsState();
    return useMemo(
      () =>
        Object.fromEntries(Object.entries(schemaResults).map(([dataType, result]) => [dataType, result.lookupTool])),
      [schemaResults],
    );
  },

  useLookupBinding,

  useExpressionValidationConfig: (dataType: string) => useDataModelsState().expressionValidationConfigs[dataType],

  useDefaultDataElementId: () => {
    const state = useDataModelsState();
    return state.defaultDataType ? state.dataElementIds[state.defaultDataType] : null;
  },

  useDataElementIdForDataType: (dataType: string) => useDataModelsState().dataElementIds[dataType],

  useGetDataElementIdForDataType: () => {
    const dataElementIds = useDataModelsState().dataElementIds;
    return useCallback((dataType: string) => dataElementIds[dataType], [dataElementIds]);
  },

  useDataElementIds: () => useDataModelsState().dataElementIds,
};
