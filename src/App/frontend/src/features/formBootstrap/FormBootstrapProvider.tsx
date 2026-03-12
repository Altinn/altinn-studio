import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren as ReactPropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { resolveExpressionValidationConfig } from 'src/features/customValidation/customValidationUtils';
import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { getUiFolderSettings } from 'src/features/form/ui';
import { UpdateDataElementIdsForCypress } from 'src/features/formBootstrap/DataElementIdsForCypress';
import { type FormBootstrapContextValue, type ProcessedDataModelInfo } from 'src/features/formBootstrap/types';
import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { createValidator } from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { IDataModelReference } from 'src/layout/common.generated';

const FormBootstrapContext = createContext<FormBootstrapContextValue | null>(null);

interface FormBootstrapProviderProps {
  uiFolder: string;
  dataElementIdOverride?: string;
}

export function FormBootstrapProvider({
  children,
  uiFolder,
  dataElementIdOverride,
}: ReactPropsWithChildren<FormBootstrapProviderProps>) {
  const defaultDataType = getUiFolderSettings(uiFolder)?.defaultDataType;
  const [prefill] = useState(() => getPrefillFromSessionStorage(defaultDataType));
  const { data, isLoading, error } = useFormBootstrapQuery({
    uiFolder,
    dataElementIdOverride,
    prefill,
  });

  useEffect(() => {
    if (data && prefill) {
      sessionStorage.removeItem('queryParams');
    }
  }, [data, prefill]);
  if (!defaultDataType) {
    throw new Error(`defaultDataType not found for uiFolder: ${uiFolder}`);
  }

  const processedLayouts = useMemo(() => {
    if (data?.layouts) {
      return processLayouts(data.layouts, defaultDataType);
    }

    return undefined;
  }, [data?.layouts, defaultDataType]);

  const dataModels = useMemo(() => {
    if (!data?.dataModels) {
      return undefined;
    }

    const appMetadata = getApplicationMetadata();
    return Object.fromEntries(
      Object.entries(data.dataModels).map(([dataType, value]) => {
        const dataTypeDef = appMetadata.dataTypes.find((dt) => dt.id === dataType);
        const rootElementPath = getRootElementPath(value.schema, dataTypeDef);
        const lookupTool = new SchemaLookupTool(value.schema, rootElementPath);
        const validator = createValidator(value.schema);

        return [
          dataType,
          {
            ...value,
            expressionValidationConfig: value.expressionValidationConfig
              ? resolveExpressionValidationConfig(value.expressionValidationConfig)
              : null,
            schemaResult: {
              schema: value.schema,
              rootElementPath,
              lookupTool,
              validator,
            },
          } satisfies ProcessedDataModelInfo,
        ];
      }),
    );
  }, [data?.dataModels]);

  const staticOptions = useMemo(() => {
    if (!data?.staticOptions) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(data.staticOptions ?? {}).map(([optionsId, optionSet]) => [
        optionsId,
        {
          options: castOptionsToStrings(optionSet.options),
          downstreamParameters: optionSet.downstreamParameters,
        },
      ]),
    );
  }, [data?.staticOptions]);

  const contextValue = useMemo<FormBootstrapContextValue | null>(() => {
    if (data && processedLayouts && dataModels && staticOptions) {
      return {
        uiFolder,
        layouts: processedLayouts.layouts,
        layoutLookups: makeLayoutLookups(processedLayouts.layouts),
        hiddenLayoutsExpressions: processedLayouts.hiddenLayoutsExpressions,
        expandedWidthLayouts: processedLayouts.expandedWidthLayouts,
        dataModels,
        allDataTypes: Object.keys(dataModels),
        staticOptions,
        initialValidationIssues: data?.validationIssues,
      };
    }

    return null;
  }, [data, processedLayouts, dataModels, staticOptions, uiFolder]);

  if (error) {
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }

    return <DisplayError error={error} />;
  }

  if (isLoading || !data) {
    return <Loader reason='bootstrap-form' />;
  }

  return (
    <FormBootstrapContext.Provider value={contextValue}>
      {window.Cypress && <UpdateDataElementIdsForCypress />}
      {children}
    </FormBootstrapContext.Provider>
  );
}

function useFormBootstrap() {
  const ctx = useContext(FormBootstrapContext);
  if (!ctx) {
    throw new Error('useFormBootstrap must be used within FormBootstrapProvider');
  }
  return ctx;
}

function useLaxFormBootstrap() {
  return useContext(FormBootstrapContext) ?? undefined;
}

export const FormBootstrap = {
  useLayouts: () => useFormBootstrap().layouts,
  useLaxLayouts: () => useLaxFormBootstrap()?.layouts,
  useLayoutLookups: () => useFormBootstrap().layoutLookups,
  useLaxLayoutLookups: () => useLaxFormBootstrap()?.layoutLookups,
  useHiddenLayoutsExpressions: () => useFormBootstrap().hiddenLayoutsExpressions,
  useLaxHiddenLayoutsExpressions: () => useLaxFormBootstrap()?.hiddenLayoutsExpressions,
  useExpandedWidthLayouts: () => useFormBootstrap().expandedWidthLayouts,

  useDataModels: () => useFormBootstrap().dataModels,
  useDefaultDataType: () => {
    const uiFolder = useFormBootstrap().uiFolder;
    return getUiFolderSettings(uiFolder)?.defaultDataType;
  },
  useLaxDefaultDataType: () => {
    const uiFolder = useLaxFormBootstrap()?.uiFolder;
    return uiFolder ? getUiFolderSettings(uiFolder)?.defaultDataType : ContextNotProvided;
  },
  useReadableDataTypes: () => useFormBootstrap().allDataTypes,
  useLaxReadableDataTypes: () => useLaxFormBootstrap()?.allDataTypes ?? ContextNotProvided,
  useWritableDataTypes: () => {
    const { allDataTypes, dataModels } = useFormBootstrap();
    return (
      useInstanceDataQuery({
        select: (instance) =>
          allDataTypes.filter((dataType) => {
            const elementId = dataModels[dataType]?.dataElementId;
            if (!elementId) {
              throw new Error(`Data element id not found for data type: ${dataType}`);
            }

            return instance.data.find((item) => item.id === elementId)?.locked !== true;
          }),
      }).data ?? allDataTypes
    );
  },
  useInitialData: () => {
    const dataModels = useFormBootstrap().dataModels;
    return useMemo(
      () => Object.fromEntries(Object.entries(dataModels).map(([dataType, info]) => [dataType, info.initialData])),
      [dataModels],
    );
  },
  useDataModelSchema: (dataType: string) => useFormBootstrap().dataModels[dataType]?.schemaResult,
  useSchemaLookup: () => {
    const dataModels = useFormBootstrap().dataModels;
    return useMemo(
      () =>
        Object.fromEntries(
          Object.entries(dataModels).map(([dataType, dataModel]) => [dataType, dataModel.schemaResult.lookupTool]),
        ),
      [dataModels],
    );
  },
  useLookupBinding: () => {
    const { dataModels, allDataTypes } = useFormBootstrap();
    return useMemo(() => {
      if (allDataTypes.every((dataType) => dataModels[dataType])) {
        return (reference: IDataModelReference) =>
          dataModels[reference.dataType].schemaResult.lookupTool.getSchemaForPath(reference.field);
      }

      return undefined;
    }, [allDataTypes, dataModels]);
  },
  useExpressionValidationConfig: (dataType: string) =>
    useFormBootstrap().dataModels[dataType]?.expressionValidationConfig,
  useDefaultDataElementId: () => {
    const { dataModels, uiFolder } = useFormBootstrap();
    const defaultDataType = getUiFolderSettings(uiFolder)?.defaultDataType;
    return defaultDataType ? (dataModels[defaultDataType]?.dataElementId ?? null) : null;
  },
  useDataElementIdForDataType: (dataType: string) => useFormBootstrap().dataModels[dataType]?.dataElementId,
  useGetDataElementIdForDataType: () => {
    const dataModels = useFormBootstrap().dataModels;
    return useCallback((dataType: string) => dataModels[dataType]?.dataElementId, [dataModels]);
  },
  useDataElementIds: () => {
    const dataModels = useFormBootstrap().dataModels;
    return useMemo(
      () => Object.fromEntries(Object.entries(dataModels).map(([dataType, info]) => [dataType, info.dataElementId])),
      [dataModels],
    );
  },

  useStaticOptionsMap: () => useFormBootstrap().staticOptions,
  useInitialValidationIssues: () => useFormBootstrap().initialValidationIssues,
};

const oneHourInMs = 60 * 60 * 1000;

function getPrefillFromSessionStorage(defaultDataType: string | undefined): string | undefined {
  if (!defaultDataType) {
    return undefined;
  }

  const rawParams = sessionStorage.getItem('queryParams');
  if (!rawParams) {
    return undefined;
  }

  const appMetadata = getApplicationMetadata();
  const queryParams: unknown = JSON.parse(rawParams);
  if (!Array.isArray(queryParams)) {
    return undefined;
  }

  const entry = queryParams.find(
    (param) =>
      typeof param === 'object' &&
      param !== null &&
      (param as Record<string, unknown>).dataModelName === defaultDataType &&
      (param as Record<string, unknown>).appId === appMetadata.id,
  ) as Record<string, unknown> | undefined;

  if (!entry?.prefillFields || typeof entry.prefillFields !== 'object') {
    return undefined;
  }

  const createdTime = new Date(entry.created as string).getTime();
  if (Number.isNaN(createdTime) || Date.now() - createdTime > oneHourInMs) {
    return undefined;
  }

  return JSON.stringify(entry.prefillFields);
}
