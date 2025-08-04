import React, { useCallback, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import { createStore } from 'zustand';
import type { JSONSchema7 } from 'json-schema';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getFirstDataElementId } from 'src/features/applicationMetadata/appMetadataUtils';
import { useCustomValidationConfigQuery } from 'src/features/customValidation/useCustomValidationQuery';
import { UpdateDataElementIdsForCypress } from 'src/features/datamodel/DataElementIdsForCypress';
import { useCurrentDataModelName, useDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useDataModelSchemaQuery } from 'src/features/datamodel/useDataModelSchemaQuery';
import {
  getAllReferencedDataTypes,
  getValidPrefillDataFromQueryParams,
  isDataTypeWritable,
  MissingClassRefException,
  MissingDataElementException,
  MissingDataTypeException,
} from 'src/features/datamodel/utils';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import {
  instanceQueries,
  useInstanceDataElements,
  useInstanceDataQueryArgs,
} from 'src/features/instance/InstanceContext';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import type { SchemaLookupTool } from 'src/features/datamodel/useDataModelSchemaQuery';
import type { IExpressionValidations } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';

interface DataModelsState {
  layoutSetId: string | undefined;
  defaultDataType: string | undefined;
  allDataTypes: string[] | null;
  writableDataTypes: string[] | null;
  initialData: { [dataType: string]: object };
  dataElementIds: { [dataType: string]: string | null };
  schemas: { [dataType: string]: JSONSchema7 };
  schemaLookup: { [dataType: string]: SchemaLookupTool };
  expressionValidationConfigs: { [dataType: string]: IExpressionValidations | null };
  error: Error | null;
}

interface DataModelsMethods {
  setDataTypes: (
    allDataTypes: string[],
    writableDataTypes: string[],
    defaultDataType: string | undefined,
    layoutSetId: string | undefined,
  ) => void;
  setInitialData: (dataType: string, initialData: object) => void;
  setDataElementId: (dataType: string, dataElementId: string | null) => void;
  setDataModelSchema: (dataType: string, schema: JSONSchema7, lookupTool: SchemaLookupTool) => void;
  setExpressionValidationConfig: (dataType: string, config: IExpressionValidations | null) => void;
  setError: (error: Error) => void;
}

function initialCreateStore() {
  return createStore<DataModelsState & DataModelsMethods>()((set) => ({
    layoutSetId: undefined,
    defaultDataType: undefined,
    allDataTypes: null,
    writableDataTypes: null,
    initialData: {},
    dataElementIds: {},
    schemas: {},
    schemaLookup: {},
    expressionValidationConfigs: {},
    error: null,

    setDataTypes: (allDataTypes, writableDataTypes, defaultDataType, layoutSetId) => {
      set((s) => ({
        allDataTypes: deepEqual(allDataTypes, s.allDataTypes) ? s.allDataTypes : allDataTypes,
        writableDataTypes: deepEqual(writableDataTypes, s.writableDataTypes) ? s.writableDataTypes : writableDataTypes,
        defaultDataType,
        layoutSetId,
      }));
    },
    setInitialData: (dataType, initialData) => {
      set((state) => ({
        initialData: {
          ...state.initialData,
          [dataType]: initialData,
        },
      }));
    },
    setDataElementId: (dataType, dataElementId) => {
      set((state) => ({
        dataElementIds: {
          ...state.dataElementIds,
          [dataType]: dataElementId,
        },
      }));
    },
    setDataModelSchema: (dataType, schema, lookupTool) => {
      set((state) => ({
        schemas: {
          ...state.schemas,
          [dataType]: schema,
        },
        schemaLookup: {
          ...state.schemaLookup,
          [dataType]: lookupTool,
        },
      }));
    },
    setExpressionValidationConfig: (dataType, config) => {
      set((state) => ({
        expressionValidationConfigs: {
          ...state.expressionValidationConfigs,
          [dataType]: config,
        },
      }));
    },
    setError(error: Error) {
      set((state) => {
        // Only set the first error, no need to overwrite if additional errors occur
        if (!state.error) {
          return { error };
        }
        return {};
      });
    },
  }));
}

const { Provider, useSelector, useLaxSelector, useSelectorAsRef, useStaticSelector } = createZustandContext({
  name: 'DataModels',
  required: true,
  initialCreateStore,
});

export function DataModelsProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <DataModelsLoader />
      {window.Cypress && <UpdateDataElementIdsForCypress />}
      <BlockUntilLoaded>{children}</BlockUntilLoaded>
    </Provider>
  );
}

function DataModelsLoader() {
  const applicationMetadata = useApplicationMetadata();
  const setDataTypes = useSelector((state) => state.setDataTypes);
  const allDataTypes = useSelector((state) => state.allDataTypes);
  const writableDataTypes = useSelector((state) => state.writableDataTypes);
  const layouts = useLayouts();
  const defaultDataType = useCurrentDataModelName();
  const isStateless = useApplicationMetadata().isStatelessApp;
  const queryClient = useQueryClient();
  const { hasResultFromInstantiation, instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();

  const dataElements =
    queryClient.getQueryData(
      instanceQueries.instanceData({ hasResultFromInstantiation, instanceOwnerPartyId, instanceGuid }).queryKey,
    )?.data ?? emptyArray;

  const layoutSetId = useCurrentLayoutSetId();

  // Subform
  const overriddenDataElement = useTaskStore((state) => state.overriddenDataModelUuid);
  const overriddenDataType = useTaskStore((state) => state.overriddenDataModelType);

  // Find all data types referenced in dataModelBindings in the layout
  useEffect(() => {
    const referencedDataTypes = getAllReferencedDataTypes(layouts, defaultDataType);
    const allValidDataTypes: string[] = [];
    const writableDataTypes: string[] = [];

    // Verify that referenced data types are defined in application metadata, have a classRef, and have a corresponding data element in the instance data
    for (const dataType of referencedDataTypes) {
      const typeDef = applicationMetadata.dataTypes.find((dt) => dt.id === dataType);

      if (!typeDef) {
        const error = new MissingDataTypeException(dataType);
        window.logErrorOnce(error.message);
        continue;
      }
      if (!typeDef?.appLogic?.classRef) {
        const error = new MissingClassRefException(dataType);
        window.logErrorOnce(error.message);
        continue;
      }

      // We don't check this if the data model is overridden, because dataElements (from the instance) may not
      // even be up to date yet when (for example) a subform has just been added.
      const isOverridden = overriddenDataType === dataType && !!overriddenDataElement;
      if (!isStateless && !isOverridden && !dataElements.find((data) => data.dataType === dataType)) {
        const error = new MissingDataElementException(dataType);
        window.logErrorOnce(error.message);
        continue;
      }

      allValidDataTypes.push(dataType);

      if (isDataTypeWritable(dataType, isStateless, dataElements)) {
        writableDataTypes.push(dataType);
      }
    }

    setDataTypes(allValidDataTypes, writableDataTypes, defaultDataType, layoutSetId);
  }, [
    applicationMetadata,
    defaultDataType,
    isStateless,
    layouts,
    setDataTypes,
    dataElements,
    layoutSetId,
    overriddenDataType,
    overriddenDataElement,
  ]);

  // We should load form data and schema for all referenced data models, schema is used for dataModelBinding validation which we want to do even if it is readonly
  // We only need to load expression validation config for data types that are not readonly. Additionally, backend will error if we try to validate a model we are not supposed to
  return (
    <>
      {allDataTypes?.map((dataType) => (
        <LoadInitialData
          key={dataType}
          dataType={dataType}
          overrideDataElement={dataType === overriddenDataType ? overriddenDataElement : undefined}
        />
      ))}
      {allDataTypes?.map((dataType) => (
        <LoadSchema
          key={dataType}
          dataType={dataType}
        />
      ))}
      {writableDataTypes?.map((dataType) => (
        <LoadExpressionValidationConfig
          key={dataType}
          dataType={dataType}
        />
      ))}
    </>
  );
}

function BlockUntilLoaded({ children }: PropsWithChildren) {
  const { layoutSetId, allDataTypes, writableDataTypes, initialData, schemas, expressionValidationConfigs, error } =
    useSelector((state) => state);
  const actualCurrentTask = useCurrentLayoutSetId();
  const isPDF = useIsPdf();

  if (error) {
    // Error trying to fetch data, if missing rights we display relevant page
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }

    return <DisplayError error={error} />;
  }

  if (!allDataTypes || !writableDataTypes) {
    return <Loader reason='data-types' />;
  }

  if (layoutSetId !== actualCurrentTask) {
    // The layout-set has changed since the state was set, so we need to wait for the new layout-set to be loaded
    // and the relevant data model bindings there to be parsed.
    return <Loader reason='layout-set-change' />;
  }

  // in PDF mode, we do not load schema, or expression validation config. So we should not block loading in that case
  // Edit: Since #2244, layout and data model binding validations work differently, so enabling schema loading to make things work for now.

  for (const dataType of allDataTypes) {
    if (!Object.keys(initialData).includes(dataType)) {
      return <Loader reason='initial-data' />;
    }

    if (!Object.keys(schemas).includes(dataType)) {
      return <Loader reason='data-model-schema' />;
    }
  }

  for (const dataType of writableDataTypes) {
    if (!isPDF && !Object.keys(expressionValidationConfigs).includes(dataType)) {
      return <Loader reason='expression-validation-config' />;
    }
  }

  return children;
}

interface LoaderProps {
  dataType: string;
}

function LoadInitialData({ dataType, overrideDataElement }: LoaderProps & { overrideDataElement?: string }) {
  const setInitialData = useSelector((state) => state.setInitialData);
  const setDataElementId = useSelector((state) => state.setDataElementId);
  const setError = useSelector((state) => state.setError);
  const dataElements = useInstanceDataElements(dataType);
  const dataElementId = overrideDataElement ?? getFirstDataElementId(dataElements, dataType);
  const metaData = useApplicationMetadata();

  const url = useDataModelUrl({
    dataType,
    dataElementId,
    includeRowIds: true,
    prefillFromQueryParams: getValidPrefillDataFromQueryParams(metaData, dataType),
  });

  const { data, error } = useFormDataQuery(url);

  useEffect(() => {
    if (!data || !url) {
      return;
    }
    sessionStorage.removeItem('queryParams');
    setInitialData(dataType, data);
  }, [data, dataType, metaData.id, setInitialData, url]);

  useEffect(() => {
    setDataElementId(dataType, dataElementId ?? null);
  }, [dataElementId, dataType, setDataElementId]);

  useEffect(() => {
    error && setError(error);
  }, [error, setError]);

  return null;
}

function LoadSchema({ dataType }: LoaderProps) {
  const setDataModelSchema = useSelector((state) => state.setDataModelSchema);
  const setError = useSelector((state) => state.setError);
  // No need to load schema in PDF
  // Edit: Since #2244, layout and data model binding validations work differently, so enabling schema loading to make things work for now.
  // const enabled = !useIsPdf();
  const { data, error } = useDataModelSchemaQuery(true, dataType);

  useEffect(() => {
    if (data) {
      setDataModelSchema(dataType, data.schema, data.lookupTool);
    }
  }, [data, dataType, setDataModelSchema]);

  useEffect(() => {
    error && setError(error);
  }, [error, setError]);

  return null;
}

function LoadExpressionValidationConfig({ dataType }: LoaderProps) {
  const setExpressionValidationConfig = useSelector((state) => state.setExpressionValidationConfig);
  const setError = useSelector((state) => state.setError);
  // No need to load validation config in PDF
  const enabled = !useIsPdf();
  const { data, isSuccess, error } = useCustomValidationConfigQuery(enabled, dataType);

  useEffect(() => {
    if (isSuccess) {
      setExpressionValidationConfig(dataType, data);
    }
  }, [data, dataType, isSuccess, setExpressionValidationConfig]);

  useEffect(() => {
    error && setError(error);
  }, [error, setError]);

  return null;
}

const emptyArray = [];
export const DataModels = {
  useFullStateRef: () => useSelectorAsRef((state) => state),

  useDefaultDataType: () => useSelector((state) => state.defaultDataType),
  useLaxDefaultDataType: () => useLaxSelector((state) => state.defaultDataType),
  useInitialData: () => useSelector((state) => state.initialData),

  // The following hooks use emptyArray if the value is null, so cannot be used to determine whether or not the datamodels are finished loading
  useReadableDataTypes: () => useSelector((state) => state.allDataTypes ?? emptyArray),
  useLaxReadableDataTypes: () => useLaxSelector((state) => state.allDataTypes ?? emptyArray),
  useWritableDataTypes: () => useSelector((state) => state.writableDataTypes ?? emptyArray),

  useDataModelSchema: (dataType: string) => useSelector((state) => state.schemas[dataType]),
  useSchemaLookup: () => useSelector((state) => state.schemaLookup),

  useLookupBinding: () => {
    // Using a static selector to avoid re-rendering. While the state can update later, we don't need
    // to re-run data model validations, etc.
    const { schemaLookup, allDataTypes } = useStaticSelector((state) => state);
    return useMemo(() => {
      if (allDataTypes?.every((dt) => schemaLookup[dt])) {
        return (reference: IDataModelReference) => schemaLookup[reference.dataType].getSchemaForPath(reference.field);
      }
      return undefined;
    }, [allDataTypes, schemaLookup]);
  },

  useExpressionValidationConfig: (dataType: string) =>
    useSelector((state) => state.expressionValidationConfigs[dataType]),

  useDefaultDataElementId: () =>
    useSelector((state) => (state.defaultDataType ? state.dataElementIds[state.defaultDataType] : null)),

  useDataElementIdForDataType: (dataType: string) => useSelector((state) => state.dataElementIds[dataType]),

  useGetDataElementIdForDataType: () => {
    const dataElementIds = useSelector((state) => state.dataElementIds);
    return useCallback((dataType: string) => dataElementIds[dataType], [dataElementIds]);
  },

  useDataElementIds: () => useSelector((state) => state.dataElementIds),
};
