import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { PropsWithChildren as ReactPropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { processLayoutSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { type FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { createValidator } from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

const FormBootstrapContext = createContext<FormBootstrapContextValue | null>(null);

interface FormBootstrapProviderProps {
  uiFolderOverride?: string;
  dataElementIdOverride?: string;
}

export function FormBootstrapProvider({
  children,
  uiFolderOverride,
  dataElementIdOverride,
}: ReactPropsWithChildren<FormBootstrapProviderProps>) {
  const { data, isLoading, isError, error } = useFormBootstrapQuery({
    uiFolderOverride,
    dataElementIdOverride,
  });
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

    const defaultDataType = data.metadata.defaultDataType;
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
      schemaVersion: data.schemaVersion,
      layouts,
      layoutLookups: makeLayoutLookups(layouts),
      hiddenLayoutsExpressions,
      expandedWidthLayouts,
      layoutSettings: processLayoutSettings(data.layoutSettings),
      dataModels,
      defaultDataType,
      allDataTypes,
      writableDataTypes,
      staticOptions,
      initialValidationIssues: data.validationIssues,
      metadata: data.metadata,
    };
  }, [data]);

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
  useDefaultDataType: () => useFormBootstrap().defaultDataType,
  useLaxDefaultDataType: () => useLaxFormBootstrap()?.defaultDataType,
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
    const { defaultDataType, dataModels } = useFormBootstrap();
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

function processLayouts(input: ILayoutCollection, dataModelType: string) {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  for (const key of Object.keys(input)) {
    const file = input[key];
    layouts[key] = cleanLayout(file.data.layout, dataModelType);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
  }

  removeDuplicateComponentIds(layouts);
  addLikertItemToLayout(layouts);

  return {
    layouts,
    hiddenLayoutsExpressions,
    expandedWidthLayouts,
  };
}

function removeDuplicateComponentIds(layouts: ILayouts) {
  const seenIds = new Map<string, { pageKey: string; idx: number }>();

  for (const pageKey of Object.keys(layouts)) {
    const page = layouts[pageKey] || [];
    const toRemove: number[] = [];
    for (const [idx, comp] of page.entries()) {
      const prev = seenIds.get(comp.id);
      if (prev) {
        window.logError(
          `Removed duplicate component id '${comp.id}' from page '${pageKey}' at index ${idx} ` +
            `(first found on page '${prev.pageKey})' at index ${prev.idx})`,
        );
        toRemove.push(idx);

        continue;
      }
      seenIds.set(comp.id, { pageKey, idx });
    }
    toRemove.reverse();
    for (const idx of toRemove) {
      page.splice(idx, 1);
    }
  }
}

function addLikertItemToLayout(layouts: ILayouts) {
  for (const pageKey of Object.keys(layouts)) {
    const page = layouts[pageKey] || [];
    for (const comp of page.values()) {
      if (comp.type === 'Likert') {
        const likertItem: CompExternal<'LikertItem'> = {
          id: makeLikertChildId(comp.id),
          type: 'LikertItem',
          textResourceBindings: {
            title: comp.textResourceBindings?.questions,
          },
          dataModelBindings: {
            simpleBinding: comp.dataModelBindings?.answer,
          },
          options: comp.options,
          optionsId: comp.optionsId,
          mapping: comp.mapping,
          required: comp.required,
          secure: comp.secure,
          queryParameters: comp.queryParameters,
          readOnly: comp.readOnly,
          sortOrder: comp.sortOrder,
          showValidations: comp.showValidations,
          grid: comp.grid,
          source: comp.source,
          hidden: comp.hidden,
          pageBreak: comp.pageBreak,
          renderAsSummary: comp.renderAsSummary,
          columns: comp.columns,
        };
        page.push(likertItem);
      }
    }
  }
}
