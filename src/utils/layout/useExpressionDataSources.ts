/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo } from 'react';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxDataElementsSelectorProps, useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useInnerLanguageWithForcedPathSelector } from 'src/features/language/useLanguage';
import { useCodeListSelectorProps } from 'src/features/options/CodeListsProvider';
import { useMultipleDelayedSelectors } from 'src/hooks/delayedSelectors';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AttachmentsSelector } from 'src/features/attachments/tools';
import type { ExprFunctionName } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { DataElementSelector } from 'src/features/instance/InstanceContext';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CodeListSelector } from 'src/features/options/CodeListsProvider';
import type { DSProps, DSPropsMatching } from 'src/hooks/delayedSelectors';
import type { FormDataSelector } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IApplicationSettings, IInstanceDataSources, IProcess } from 'src/types/shared';

export interface ExpressionDataSources {
  process?: IProcess;
  instanceDataSources: IInstanceDataSources | null;
  applicationSettings: IApplicationSettings | null;
  dataElementSelector: DataElementSelector;
  dataModelNames: string[];
  formDataSelector: FormDataSelector;
  attachmentsSelector: AttachmentsSelector;
  langToolsSelector: (dataModelPath: IDataModelReference | undefined) => IUseLanguage;
  currentLanguage: string;
  defaultDataType: string | null;
  externalApis: ExternalApisResult;
  currentDataModelPath: IDataModelReference | undefined;
  codeListSelector: CodeListSelector;
  layoutLookups: LayoutLookups;
  displayValues: Record<string, string | undefined>;
  hiddenComponents: Record<string, boolean | undefined>;
}

const multiSelectors = {
  formDataSelector: () => FD.useDebouncedSelectorProps(),
  attachmentsSelector: () => NodesInternal.useAttachmentsSelectorProps(),
  dataElementSelector: () => useLaxDataElementsSelectorProps(),
  codeListSelector: () => useCodeListSelectorProps(),
} satisfies {
  [K in keyof ExpressionDataSources]?: DSPropsMatching<ExpressionDataSources[K]>;
};

const directHooks = {
  process: () => useProcessQuery().data,
  applicationSettings: () => useApplicationSettings(),
  currentLanguage: () => useCurrentLanguage(),
  currentDataModelPath: () => useCurrentDataModelLocation(),
  layoutLookups: () => useLayoutLookups(),
  instanceDataSources: (isInGenerator) =>
    isInGenerator ? GeneratorData.useLaxInstanceDataSources() : useLaxInstanceDataSources(),
  defaultDataType: (isInGenerator) =>
    (isInGenerator ? GeneratorData.useDefaultDataType() : DataModels.useDefaultDataType()) ?? null,
  dataModelNames: (isInGenerator) =>
    isInGenerator ? GeneratorData.useReadableDataTypes() : DataModels.useReadableDataTypes(),
  externalApis: (isInGenerator) =>
    isInGenerator ? GeneratorData.useExternalApis() : useExternalApis(useApplicationMetadata().externalApiIds ?? []),
  langToolsSelector: (isInGenerator) =>
    useInnerLanguageWithForcedPathSelector(
      isInGenerator ? GeneratorData.useDefaultDataType() : DataModels.useDefaultDataType(),
      isInGenerator ? GeneratorData.useReadableDataTypes() : DataModels.useReadableDataTypes(),
      FD.useDebouncedSelector(),
    ),
} satisfies { [K in keyof ExpressionDataSources]?: (isInGenerator: boolean) => ExpressionDataSources[K] };

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
  const { unsupportedDataSources, errorSuffix, dataSources: overriddenDataSources } = overrides ?? {};

  const { neededDataSources, displayValueLookups, componentLookups } = useMemo(() => {
    const functionCalls = new Set<ExprFunctionName>();
    const displayValueLookups = new Set<string>();
    const componentLookups = new Set<string>();
    findUsedExpressionFunctions(toEvaluate, functionCalls, displayValueLookups, componentLookups);

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

    return { functionCalls, displayValueLookups, componentLookups, neededDataSources };
  }, [toEvaluate, unsupportedDataSources, errorSuffix]);

  // Build a multiple delayed selector for each needed data source
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toMultipleSelectors: DSProps<any>[] = [];
  for (const key of neededDataSources) {
    if (key in multiSelectors && !(overrides?.dataSources && key in overrides.dataSources)) {
      toMultipleSelectors.push(multiSelectors[key]());
    }
  }

  let combinedIndex = 0;
  const combined = useMultipleDelayedSelectors(...toMultipleSelectors);
  const isInGenerator = GeneratorInternal.useIsInsideGenerator();
  const output: Partial<ExpressionDataSources> = {};

  for (const key of neededDataSources) {
    if (overriddenDataSources && key in overriddenDataSources) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output[key] = overriddenDataSources[key]!() as unknown as any;
    } else if (key in multiSelectors) {
      // Ignoring the typing here because it becomes too complex quickly. We don't really need the typing here, as we
      // have already checked the types in `multiSelectors`, so there's no point in doing it again here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output[key] = combined[combinedIndex++] as unknown as any;
    } else if (key in directHooks) {
      output[key] = directHooks[key](isInGenerator);
    } else if (key === 'displayValues') {
      output[key] = useDisplayDataFor([...displayValueLookups.values()]);
    } else if (key === 'hiddenComponents') {
      output[key] = useIsHiddenMulti([...componentLookups, ...displayValueLookups]);
    } else {
      throw new Error(`No hook found for data source ${key}`);
    }
  }

  return useShallowMemo(output) as ExpressionDataSources;
}

function findUsedExpressionFunctions(
  subject: unknown,
  functionCalls: Set<ExprFunctionName>,
  displayValueLookups: Set<string>,
  componentLookups: Set<string>,
) {
  if (!subject || typeof subject !== 'object') {
    return;
  }

  if (Array.isArray(subject)) {
    if (subject.length > 0 && typeof subject[0] === 'string' && isFunctionName(subject[0])) {
      functionCalls.add(subject[0]);

      if (subject[0] === 'displayValue' && typeof subject[1] === 'string') {
        displayValueLookups.add(subject[1]);
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
