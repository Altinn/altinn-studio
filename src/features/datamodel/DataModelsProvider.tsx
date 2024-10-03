import React, { useCallback, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';
import type { JSONSchema7 } from 'json-schema';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getFirstDataElementId } from 'src/features/applicationMetadata/appMetadataUtils';
import { useCustomValidationConfigQuery } from 'src/features/customValidation/useCustomValidationQuery';
import { useCurrentDataModelName, useDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useDataModelSchemaQuery } from 'src/features/datamodel/useDataModelSchemaQuery';
import {
  getAllReferencedDataTypes,
  isDataTypeWritable,
  MissingClassRefException,
  MissingDataElementException,
  MissingDataTypeException,
} from 'src/features/datamodel/utils';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import type { SchemaLookupTool } from 'src/features/datamodel/useDataModelSchemaQuery';
import type { IExpressionValidations } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';

interface DataModelsState {
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
  setDataTypes: (allDataTypes: string[], writableDataTypes: string[], defaultDataType: string | undefined) => void;
  setInitialData: (dataType: string, initialData: object, dataElementId: string | null) => void;
  setDataModelSchema: (dataType: string, schema: JSONSchema7, lookupTool: SchemaLookupTool) => void;
  setExpressionValidationConfig: (dataType: string, config: IExpressionValidations | null) => void;
  setError: (error: Error) => void;
}

function initialCreateStore() {
  return createStore<DataModelsState & DataModelsMethods>()((set) => ({
    defaultDataType: undefined,
    allDataTypes: null,
    writableDataTypes: null,
    initialData: {},
    dataElementIds: {},
    initialValidations: null,
    schemas: {},
    schemaLookup: {},
    expressionValidationConfigs: {},
    error: null,

    setDataTypes: (allDataTypes, writableDataTypes, defaultDataType) => {
      set(() => ({ allDataTypes, writableDataTypes, defaultDataType }));
    },
    setInitialData: (dataType, initialData, dataElementId) => {
      set((state) => ({
        initialData: {
          ...state.initialData,
          [dataType]: initialData,
        },
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

const { Provider, useSelector, useMemoSelector, useLaxMemoSelector, useSelectorAsRef } = createZustandContext({
  name: 'DataModels',
  required: true,
  initialCreateStore,
});

export function DataModelsProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <DataModelsLoader />
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
  const instance = useLaxInstanceData();

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
      if (!isStateless && !instance?.data.find((data) => data.dataType === dataType)) {
        const error = new MissingDataElementException(dataType);
        window.logErrorOnce(error.message);
        continue;
      }

      allValidDataTypes.push(dataType);

      if (isDataTypeWritable(dataType, isStateless, instance)) {
        writableDataTypes.push(dataType);
      }
    }

    setDataTypes(allValidDataTypes, writableDataTypes, defaultDataType);
  }, [applicationMetadata, defaultDataType, isStateless, layouts, setDataTypes, instance]);

  // We should load form data and schema for all referenced data models, schema is used for dataModelBinding validation which we want to do even if it is readonly
  // We only need to load validation and expression validation config for data types that are not readonly. Additionally, backend will error if we try to validate a model we are not supposed to
  return (
    <>
      {allDataTypes?.map((dataType) => (
        <React.Fragment key={dataType}>
          <LoadInitialData
            dataType={dataType}
            overrideDataElement={dataType === overriddenDataType ? overriddenDataElement : undefined}
          />
          <LoadSchema dataType={dataType} />
        </React.Fragment>
      ))}
      {writableDataTypes?.map((dataType) => (
        <React.Fragment key={dataType}>
          <LoadExpressionValidationConfig dataType={dataType} />
        </React.Fragment>
      ))}
    </>
  );
}

function BlockUntilLoaded({ children }: PropsWithChildren) {
  const { allDataTypes, writableDataTypes, initialData, schemas, expressionValidationConfigs, error } = useSelector(
    (state) => state,
  );
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

  // in PDF mode, we do not load schema, validations, or expression validation config. So we should not block loading in that case
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

  return <>{children}</>;
}

interface LoaderProps {
  dataType: string;
}

function LoadInitialData({ dataType, overrideDataElement }: LoaderProps & { overrideDataElement?: string }) {
  const setInitialData = useSelector((state) => state.setInitialData);
  const setError = useSelector((state) => state.setError);
  const instance = useLaxInstanceData();
  const dataElementId = overrideDataElement ?? getFirstDataElementId(instance, dataType);
  const url = useDataModelUrl({ dataType, dataElementId, includeRowIds: true });
  const { data, error } = useFormDataQuery(url);
  useEffect(() => {
    if (data && url) {
      setInitialData(dataType, data, dataElementId ?? null);
    }
  }, [data, dataElementId, dataType, setInitialData, url]);

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

export const DataModels = {
  useFullStateRef: () => useSelectorAsRef((state) => state),

  useLaxDefaultDataType: () => useLaxMemoSelector((state) => state.defaultDataType),

  useReadableDataTypes: () => useMemoSelector((state) => state.allDataTypes ?? []),
  useLaxReadableDataTypes: () => useLaxMemoSelector((state) => state.allDataTypes!),

  useWritableDataTypes: () => useMemoSelector((state) => state.writableDataTypes!),

  useDataModelSchema: (dataType: string) => useSelector((state) => state.schemas[dataType]),

  useLookupBinding: () => {
    const { schemaLookup, allDataTypes } = useSelector((state) => state);
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
    useMemoSelector((state) => (state.defaultDataType ? state.dataElementIds[state.defaultDataType] : null)),

  useDataElementIdForDataType: (dataType: string) => useMemoSelector((state) => state.dataElementIds[dataType]),

  useGetDataElementIdForDataType: () => {
    const dataElementIds = useMemoSelector((state) => state.dataElementIds);
    return useCallback((dataType: string) => dataElementIds[dataType], [dataElementIds]);
  },
};
