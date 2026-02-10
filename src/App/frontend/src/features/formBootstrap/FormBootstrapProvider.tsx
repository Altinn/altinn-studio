import React, { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren as ReactPropsWithChildren } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { ContextNotProvided } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { cleanLayout } from 'src/features/form/layout/cleanLayout';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { applyLayoutQuirks } from 'src/features/form/layout/quirks';
import { type FormBootstrapContextValue, type ProcessedLayoutSettings } from 'src/features/formBootstrap/types';
import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { createValidator } from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';
import type { CompExternal, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

const FormBootstrapContext = createContext<FormBootstrapContextValue | null>(null);

interface FormBootstrapProviderProps {
  layoutSetIdOverride?: string;
  dataElementIdOverride?: string;
}

export function FormBootstrapProvider({
  children,
  layoutSetIdOverride,
  dataElementIdOverride,
}: ReactPropsWithChildren<FormBootstrapProviderProps>) {
  const { data, isLoading, isError, error } = useFormBootstrapQuery({
    layoutSetIdOverride,
    dataElementIdOverride,
  });

  const contextValue = useMemo<FormBootstrapContextValue | null>(() => {
    if (!data) {
      return null;
    }

    const defaultDataType = data.metadata.defaultDataType;
    const { layouts, hiddenLayoutsExpressions, expandedWidthLayouts } = processLayouts(
      data.layouts,
      data.metadata.layoutSetId,
      defaultDataType,
    );

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
      Object.entries(data.staticOptions ?? {}).map(([optionsId, options]) => [
        optionsId,
        castOptionsToStrings(options),
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

  if (isLoading) {
    return <Loader reason='form-bootstrap' />;
  }

  if (isError || !contextValue) {
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }

    return <DisplayError error={error ?? new Error('Failed to load form bootstrap data')} />;
  }

  return <FormBootstrapContext.Provider value={contextValue}>{children}</FormBootstrapContext.Provider>;
}

export function useFormBootstrap(): FormBootstrapContextValue {
  const ctx = useContext(FormBootstrapContext);
  if (!ctx) {
    throw new Error('useFormBootstrap must be used within FormBootstrapProvider');
  }
  return ctx;
}

export function useLaxFormBootstrap(): FormBootstrapContextValue | typeof ContextNotProvided {
  return useContext(FormBootstrapContext) ?? ContextNotProvided;
}

export const FormBootstrap = {
  useLayouts: () => useFormBootstrap().layouts,
  useLayoutLookups: () => useFormBootstrap().layoutLookups,
  useHiddenLayoutsExpressions: () => useFormBootstrap().hiddenLayoutsExpressions,
  useExpandedWidthLayouts: () => useFormBootstrap().expandedWidthLayouts,
  useLayoutSettings: () => useFormBootstrap().layoutSettings,

  useDataModels: () => useFormBootstrap().dataModels,
  useDefaultDataType: () => useFormBootstrap().defaultDataType,
  useReadableDataTypes: () => useFormBootstrap().allDataTypes,
  useWritableDataTypes: () => useFormBootstrap().writableDataTypes,

  useStaticOptionsMap: () => useFormBootstrap().staticOptions,
  useInitialValidationIssues: () => useFormBootstrap().initialValidationIssues,
};

function processLayoutSettings(settings: unknown): ProcessedLayoutSettings {
  if (!settings || typeof settings !== 'object' || !('pages' in settings)) {
    return {
      order: [],
      groups: [],
      pageSettings: {},
      pdfLayoutName: undefined,
    };
  }

  const typed = settings as {
    pages: {
      order?: string[];
      groups?: Array<Record<string, unknown>>;
      autoSaveBehavior?: GlobalPageSettings['autoSaveBehavior'];
      expandedWidth?: boolean;
      hideCloseButton?: boolean;
      showExpandWidthButton?: boolean;
      showLanguageSelector?: boolean;
      showProgress?: boolean;
      taskNavigation?: GlobalPageSettings['taskNavigation'];
      pdfLayoutName?: string;
    };
  };

  if (!typed.pages.order && !typed.pages.groups) {
    const msg = 'Missing page order, specify one of `pages.order` or `pages.groups` in Settings.json';
    window.logError(msg);
    throw new Error(msg);
  }

  if (typed.pages.order && typed.pages.groups) {
    const msg = 'Specify one of `pages.order` or `pages.groups` in Settings.json';
    window.logError(msg);
    throw new Error(msg);
  }

  const groupedOrder = (typed.pages.groups ?? []).flatMap((group) => {
    const maybeOrder = 'order' in group ? group.order : undefined;
    return Array.isArray(maybeOrder) ? maybeOrder.filter((page): page is string => typeof page === 'string') : [];
  });
  const order = typed.pages.order ?? groupedOrder;

  return {
    order,
    groups: typed.pages.groups?.map((group) => ({ ...group, id: uuidv4() })) as ProcessedLayoutSettings['groups'],
    pageSettings: omitUndefined({
      autoSaveBehavior: typed.pages.autoSaveBehavior,
      expandedWidth: typed.pages.expandedWidth,
      hideCloseButton: typed.pages.hideCloseButton,
      showExpandWidthButton: typed.pages.showExpandWidthButton,
      showLanguageSelector: typed.pages.showLanguageSelector,
      showProgress: typed.pages.showProgress,
      taskNavigation: typed.pages.taskNavigation?.map((group) => ({ ...group, id: uuidv4() })),
    }),
    pdfLayoutName: typed.pages.pdfLayoutName,
  };
}

function omitUndefined<T extends { [key: string]: unknown }>(obj: T): Partial<T> {
  return Object.keys(obj).reduce((newObj, key) => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
    return newObj;
  }, {});
}

function processLayouts(input: ILayoutCollection, layoutSetId: string, dataModelType: string) {
  const layouts: ILayouts = {};
  const hiddenLayoutsExpressions: IHiddenLayoutsExternal = {};
  const expandedWidthLayouts: IExpandedWidthLayouts = {};
  for (const key of Object.keys(input)) {
    const file = input[key];
    layouts[key] = cleanLayout(file.data.layout, dataModelType);
    hiddenLayoutsExpressions[key] = file.data.hidden;
    expandedWidthLayouts[key] = file.data.expandedWidth;
  }

  const withQuirksFixed = applyLayoutQuirks(layouts, layoutSetId);
  removeDuplicateComponentIds(withQuirksFixed, layoutSetId);
  addLikertItemToLayout(withQuirksFixed);

  return {
    layouts: withQuirksFixed,
    hiddenLayoutsExpressions,
    expandedWidthLayouts,
  };
}

function removeDuplicateComponentIds(layouts: ILayouts, layoutSetId: string) {
  const seenIds = new Map<string, { pageKey: string; idx: number }>();
  const quirksCode = {
    verifyAndApplyEarly: new Set<string>(),
    verifyAndApplyLate: new Set<string>(),
    logMessages: new Set<string>(),
  };

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

        quirksCode.verifyAndApplyEarly.add(`assert(layouts['${prev.pageKey}']![${prev.idx}].id === '${comp.id}');`);
        quirksCode.verifyAndApplyEarly.add(`assert(layouts['${pageKey}']![${idx}].id === '${comp.id}');`);
        quirksCode.verifyAndApplyLate.add(`layouts['${pageKey}']![${idx}].id = '${comp.id}Duplicate';`);
        quirksCode.logMessages.add(
          `\`Renamed component id '${comp.id}' to '${comp.id}Duplicate' on page '${pageKey}'\``,
        );

        continue;
      }
      seenIds.set(comp.id, { pageKey, idx });
    }
    toRemove.reverse();
    for (const idx of toRemove) {
      page.splice(idx, 1);
    }
  }

  if (quirksCode.verifyAndApplyEarly.size) {
    const code: string[] = [];
    code.push('{');
    code.push('  verifyAndApply: (layouts) => {');
    code.push(`    ${[...quirksCode.verifyAndApplyEarly.values()].join('\n    ')}`);
    code.push('');
    code.push(`    ${[...quirksCode.verifyAndApplyLate.values()].join('\n    ')}`);
    code.push('  },');
    code.push('  logMessages: [');
    code.push(`    ${[...quirksCode.logMessages.values()].join(',\n    ')}`);
    code.push('  ],');
    code.push('}');
    const fullKey = `${window.org}/${window.app}/${layoutSetId}`;
    const _fullCode = `'${fullKey}': ${code.join('\n')},`;
    void _fullCode;
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
