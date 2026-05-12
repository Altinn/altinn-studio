/* eslint-disable react-compiler/react-compiler, react-hooks/rules-of-hooks */
import { useCallback, useMemo } from 'react';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { FormStore } from 'src/features/form/FormContext';
import { useDataElementsSelector, useInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useInnerLanguageWithForcedPathSelector } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/hooks/navigation';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import type { ExprFunctionName } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { FormDataSelectorLax } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IApplicationSettings, IInstanceDataSources, IProcess } from 'src/types/shared';

export interface ExpressionDataSources {
  // Static
  applicationSettings: IApplicationSettings | null;

  // Navigation/cookies
  currentLanguage: string;
  currentPage: string | undefined;

  // Instance/process
  dataElementSelector: ReturnType<typeof useDataElementsSelector>;
  instanceDataSources: IInstanceDataSources | null;
  process: IProcess | undefined;

  // Query
  externalApis: ExternalApisResult;

  // FormStore
  codeListSelector: (optionsId: string) => IOptionInternal[] | undefined;
  formDataSelector: FormDataSelectorLax;
  dataModelNames: string[];
  defaultDataType: string | null;
  layoutLookups: LayoutLookups;

  // Complex/Other
  currentDataModelPath: IDataModelReference | undefined;
  langToolsSelector: (dataModelPath: IDataModelReference | undefined) => IUseLanguage;

  // Solves themselves if we always have all expression data sources?
  displayValues: Record<string, string | undefined>;
}

type HookBackedDataSource = Exclude<keyof ExpressionDataSources, 'displayValues'>;
type DerivedDataSource = Exclude<keyof ExpressionDataSources, HookBackedDataSource>;

function typedKeys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

const hooks: { [K in HookBackedDataSource]: () => ExpressionDataSources[K] } = {
  process: () => useProcessQuery().data,
  applicationSettings: () => useApplicationSettings(),
  currentLanguage: () => useCurrentLanguage(),
  currentDataModelPath: () => useCurrentDataModelLocation(),
  layoutLookups: () => FormStore.bootstrap.useLayoutLookups(),
  codeListSelector: () => {
    const staticOptions = FormStore.bootstrap.useStaticOptionsMap();
    return useCallback((optionsId: string) => staticOptions[optionsId]?.options, [staticOptions]);
  },
  formDataSelector: () => FormStore.data.useLaxDebouncedSelector(),
  dataElementSelector: () => useDataElementsSelector(),
  instanceDataSources: () => useInstanceDataSources(),
  defaultDataType: () => FormStore.bootstrap.useDefaultDataType() ?? null,
  dataModelNames: () => FormStore.bootstrap.useReadableDataTypes(),
  externalApis: () => useExternalApis(getApplicationMetadata().externalApiIds ?? []),
  langToolsSelector: () =>
    useInnerLanguageWithForcedPathSelector(
      FormStore.bootstrap.useDefaultDataType(),
      FormStore.bootstrap.useReadableDataTypes(),
      FormStore.data.useDebouncedSelector(),
    ),
  currentPage: () => useNavigationParam('pageKey'),
};

const derivedDataSources: { [K in DerivedDataSource]: true } = {
  displayValues: true,
};

export const ExpressionDataSourcesKeys = [
  ...typedKeys(hooks),
  ...typedKeys(derivedDataSources),
] as const satisfies readonly (keyof ExpressionDataSources)[];

export type DataSourceOverrides = {
  dataSources?: { [K in keyof ExpressionDataSources]?: () => ExpressionDataSources[K] };
  unsupportedDataSources?: Set<keyof ExpressionDataSources>;
  errorSuffix?: string;
};

/**
 * Figure out which data sources are needed to evaluate an expression and return them. This code breaks the
 * rule of hooks linting rule because it calls hooks conditionally. This is safe as long as `toEvaluate` is
 * the same between renders, i.e. that layout configuration/expressions does not change between renders.
 */
export function useExpressionDataSources(toEvaluate: unknown, overrides?: DataSourceOverrides): ExpressionDataSources {
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const layoutCollection = FormStore.bootstrap.useLayoutCollection();
  const { unsupportedDataSources, errorSuffix, dataSources: overriddenDataSources } = overrides ?? {};

  const { neededDataSources, displayValueLookups } = useMemo(() => {
    const functionCalls = new Set<ExprFunctionName>();
    const displayValueLookups = new Set<string>();
    const componentLookups = new Set<string>();
    findUsedExpressionFunctions(toEvaluate, functionCalls, displayValueLookups, componentLookups);

    // When evaluating if a component is hidden, we look at the component and walk up the parents, all the way to the
    // root component, and then the page it's on. To make sure this works, we have to build expression data sources for
    // all parents as well.
    const traversedComponentLookups = new Set<string>();
    while (componentLookups.size > 0) {
      const lookup = componentLookups.values().next().value;
      if (lookup === undefined) {
        break;
      }

      componentLookups.delete(lookup);
      if (traversedComponentLookups.has(lookup)) {
        continue;
      }

      const component = layoutLookups.getComponent(lookup);
      findUsedExpressionFunctions(component?.hidden, functionCalls, undefined, componentLookups);

      let parent = layoutLookups.componentToParent[lookup];
      while (parent?.type === 'node') {
        const parentComponent = layoutLookups.getComponent(parent.id);
        findUsedExpressionFunctions(parentComponent?.hidden, functionCalls, undefined, componentLookups);
        parent = layoutLookups.componentToParent[parent.id];
      }

      const page = layoutLookups.componentToPage[lookup];
      if (page !== undefined) {
        findUsedExpressionFunctions(layoutCollection[page]?.data.hidden, functionCalls, undefined, componentLookups);
      }

      traversedComponentLookups.add(lookup);
    }

    const neededDataSources = new Set<keyof ExpressionDataSources>();
    for (const functionName of functionCalls) {
      const definition = ExprFunctionDefinitions[functionName];
      for (const need of definition.needs) {
        if (unsupportedDataSources && unsupportedDataSources.has(need)) {
          const message = `Expression: "${functionName}" is not supported in ${errorSuffix ? errorSuffix : 'this context'}.`;
          window.logErrorOnce(message);
          throw new Error(message);
        }

        neededDataSources.add(need);
      }
    }

    return { functionCalls, displayValueLookups, neededDataSources };
  }, [toEvaluate, layoutLookups, layoutCollection, unsupportedDataSources, errorSuffix]);

  const output: Partial<ExpressionDataSources> = {};

  for (const key of neededDataSources) {
    if (overriddenDataSources && key in overriddenDataSources) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output[key] = overriddenDataSources[key]!() as unknown as any;
    } else if (key in hooks) {
      output[key] = hooks[key]();
    } else if (key === 'displayValues') {
      output[key] = useDisplayDataFor([...displayValueLookups.values()]);
    } else {
      throw new Error(`No hook found for data source ${key}`);
    }
  }

  return useShallowMemo(output) as ExpressionDataSources;
}

function findUsedExpressionFunctions(
  subject: unknown,
  functionCalls: Set<ExprFunctionName>,
  displayValueLookups: Set<string> | undefined,
  componentLookups: Set<string>,
) {
  if (!subject || typeof subject !== 'object') {
    return;
  }

  if (Array.isArray(subject)) {
    if (subject.length > 0 && typeof subject[0] === 'string' && isFunctionName(subject[0])) {
      functionCalls.add(subject[0]);

      if (subject[0] === 'displayValue' && typeof subject[1] === 'string') {
        if (!displayValueLookups) {
          throw new Error('Expression function "displayValue" cannot be called in a "hidden" property expression');
        }
        displayValueLookups.add(subject[1]);
        componentLookups.add(subject[1]);
      }

      if (subject[0] === 'component' && typeof subject[1] === 'string') {
        componentLookups.add(subject[1]);
      }
    }

    for (const item of subject) {
      findUsedExpressionFunctions(item, functionCalls, displayValueLookups, componentLookups);
    }
  } else {
    for (const key in subject) {
      findUsedExpressionFunctions(subject[key], functionCalls, displayValueLookups, componentLookups);
    }
  }
}

function isFunctionName(name: string): name is ExprFunctionName {
  return name in ExprFunctionDefinitions;
}
