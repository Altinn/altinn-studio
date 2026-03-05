import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { PropsWithChildren as ReactPropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { processLayoutSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { getUiFolderSettings } from 'src/features/form/ui';
import { type FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
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
  const { data, isLoading, isError, error } = useFormBootstrapQuery({
    uiFolder,
    dataElementIdOverride,
  });
  const defaultDataType = getUiFolderSettings(uiFolder)?.defaultDataType;
  if (!defaultDataType) {
    throw new Error(`defaultDataType not found for uiFolder: ${uiFolder}`);
  }

  const prevData = useRef(data);
  const dataCounter = useRef(0);
  if (data !== prevData.current) {
    dataCounter.current += 1;
    prevData.current = data;
  }

  const contextValue = useMemo<FormBootstrapContextValue | null>(() => {
    if (!data) {
      return null;
    }

    const { layouts, hiddenLayoutsExpressions, expandedWidthLayouts } = processLayouts(data.layouts, defaultDataType);

    const appMetadata = getApplicationMetadata();
    const dataModels = Object.fromEntries(
      Object.entries(data.dataModels).map(([dataType, value]) => {
        const dataTypeDef = appMetadata.dataTypes.find((dt) => dt.id === dataType);
        const rootElementPath = getRootElementPath(value.schema, dataTypeDef);
        const lookupTool = new SchemaLookupTool(value.schema, rootElementPath);
        const validator = createValidator(value.schema);

        return [
          dataType,
          {
            ...value,
            schemaResult: {
              schema: value.schema,
              rootElementPath,
              lookupTool,
              validator,
            },
          },
        ];
      }),
    );

    const allDataTypes = Object.keys(dataModels);
    const writableDataTypes = allDataTypes.filter((dt) => dataModels[dt].isWritable);
    const staticOptions = Object.fromEntries(
      Object.entries(data.staticOptions ?? {}).map(([optionsId, info]) => [
        optionsId,
        {
          variants: (info.variants ?? []).map((variant) => ({
            queryParameters: variant.queryParameters ?? {},
            options: castOptionsToStrings(variant.options ?? []),
          })),
        },
      ]),
    );

    return {
      uiFolder,
      layouts,
      layoutLookups: makeLayoutLookups(layouts),
      hiddenLayoutsExpressions,
      expandedWidthLayouts,
      layoutSettings: processLayoutSettings(data.layoutSettings),
      dataModels,
      allDataTypes,
      writableDataTypes,
      staticOptions,
      initialValidationIssues: data.validationIssues,
    };
  }, [data, defaultDataType, uiFolder]);

  if (isLoading || !data || !contextValue) {
    return <Loader reason='form-bootstrap' />;
  }

  if (isError || !contextValue) {
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }

    return <DisplayError error={error ?? new Error('Failed to load form bootstrap data')} />;
  }

  return (
    <FormBootstrapContext.Provider
      key={dataCounter.current}
      value={contextValue}
    >
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
  useWritableDataTypes: () => useFormBootstrap().writableDataTypes,
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
