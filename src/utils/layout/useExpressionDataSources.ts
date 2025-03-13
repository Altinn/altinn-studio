/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo } from 'react';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDisplayDataFor } from 'src/features/displayData/useDisplayData';
import { ExprFunctionDefinitions } from 'src/features/expressions/expression-functions';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxDataElementsSelectorProps, useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useInnerLanguageWithForcedNodeSelector } from 'src/features/language/useLanguage';
import { useCodeListSelectorProps } from 'src/features/options/CodeListsProvider';
import { useMultipleDelayedSelectors } from 'src/hooks/delayedSelectors';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useInnerDataModelBindingTranspose } from 'src/utils/layout/useDataModelBindingTranspose';
import type { AttachmentsSelector } from 'src/features/attachments/tools';
import type { ExprFunctionName } from 'src/features/expressions/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { DataElementSelector } from 'src/features/instance/InstanceContext';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CodeListSelector } from 'src/features/options/CodeListsProvider';
import type { NodeOptionsSelector } from 'src/features/options/OptionsStorePlugin';
import type { DSProps, DSPropsMatching } from 'src/hooks/delayedSelectors';
import type { FormDataRowsSelector, FormDataSelector } from 'src/layout';
import type { IDataModelReference, ILayoutSet } from 'src/layout/common.generated';
import type { IApplicationSettings, IInstanceDataSources, IProcess } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';
import type { DataModelTransposeSelector } from 'src/utils/layout/useDataModelBindingTranspose';

export interface ExpressionDataSources {
  process?: IProcess;
  instanceDataSources: IInstanceDataSources | null;
  applicationSettings: IApplicationSettings | null;
  dataElementSelector: DataElementSelector;
  dataModelNames: string[];
  formDataSelector: FormDataSelector;
  formDataRowsSelector: FormDataRowsSelector;
  attachmentsSelector: AttachmentsSelector;
  optionsSelector: NodeOptionsSelector;
  langToolsSelector: (node: LayoutNode | string | undefined) => IUseLanguage;
  currentLanguage: string;
  currentLayoutSet: ILayoutSet | null;
  isHiddenSelector: ReturnType<typeof Hidden.useIsHiddenSelector>;
  nodeDataSelector: NodeDataSelector;
  transposeSelector: DataModelTransposeSelector;
  externalApis: ExternalApisResult;
  currentDataModelPath: IDataModelReference | undefined;
  codeListSelector: CodeListSelector;
  layoutLookups: LayoutLookups;
  displayValues: Record<string, string | undefined>;
}

const multiSelectors = {
  formDataSelector: () => FD.useDebouncedSelectorProps(),
  formDataRowsSelector: () => FD.useDebouncedRowsSelectorProps(),
  attachmentsSelector: () => NodesInternal.useAttachmentsSelectorProps(),
  optionsSelector: () => NodesInternal.useNodeOptionsSelectorProps(),
  nodeDataSelector: () => NodesInternal.useNodeDataSelectorProps(),
  isHiddenSelector: () => Hidden.useIsHiddenSelectorProps(),
  dataElementSelector: () => useLaxDataElementsSelectorProps(),
  codeListSelector: () => useCodeListSelectorProps(),
} satisfies {
  [K in keyof ExpressionDataSources]?: DSPropsMatching<ExpressionDataSources[K]>;
};

const directHooks = {
  process: () => useLaxProcessData(),
  applicationSettings: () => useApplicationSettings(),
  currentLanguage: () => useCurrentLanguage(),
  currentDataModelPath: () => useCurrentDataModelLocation(),
  layoutLookups: () => useLayoutLookups(),
  instanceDataSources: (isInGenerator) =>
    isInGenerator ? GeneratorData.useLaxInstanceDataSources() : useLaxInstanceDataSources(),
  currentLayoutSet: (isInGenerator) =>
    (isInGenerator ? GeneratorData.useCurrentLayoutSet() : useCurrentLayoutSet()) ?? null,
  dataModelNames: (isInGenerator) =>
    isInGenerator ? GeneratorData.useReadableDataTypes() : DataModels.useReadableDataTypes(),
  externalApis: (isInGenerator) =>
    isInGenerator ? GeneratorData.useExternalApis() : useExternalApis(useApplicationMetadata().externalApiIds ?? []),
  transposeSelector: () => useInnerDataModelBindingTranspose(NodesInternal.useNodeDataSelector()),
  langToolsSelector: (isInGenerator) =>
    useInnerLanguageWithForcedNodeSelector(
      isInGenerator ? GeneratorData.useDefaultDataType() : DataModels.useDefaultDataType(),
      isInGenerator ? GeneratorData.useReadableDataTypes() : DataModels.useReadableDataTypes(),
      FD.useDebouncedSelector(),
      NodesInternal.useNodeDataSelector(),
    ),
} satisfies { [K in keyof ExpressionDataSources]?: (isInGenerator: boolean) => ExpressionDataSources[K] };

/**
 * Figure out which data sources are needed to evaluate an expression and return them. This code breaks the
 * rule of hooks linting rule because it calls hooks conditionally. This is safe as long as `toEvaluate` is
 * the same between renders, i.e. that layout configuration/expressions does not change between renders.
 */
export function useExpressionDataSources(toEvaluate: unknown): ExpressionDataSources {
  const { neededDataSources, displayValueLookups } = useMemo(() => {
    const functionCalls = new Set<ExprFunctionName>();
    const displayValueLookups = new Set<string>();
    findUsedExpressionFunctions(toEvaluate, functionCalls, displayValueLookups);

    const neededDataSources = new Set<keyof ExpressionDataSources>();
    for (const functionName of functionCalls) {
      const definition = ExprFunctionDefinitions[functionName];
      for (const need of definition.needs) {
        neededDataSources.add(need);
      }
    }

    return { functionCalls, displayValueLookups, neededDataSources };
  }, [toEvaluate]);

  // Build a multiple delayed selector for each needed data source
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toMultipleSelectors: DSProps<any>[] = [];
  for (const key of neededDataSources) {
    if (key in multiSelectors) {
      toMultipleSelectors.push(multiSelectors[key]());
    }
  }

  let combinedIndex = 0;
  const combined = useMultipleDelayedSelectors(...toMultipleSelectors);
  const isInGenerator = GeneratorInternal.useIsInsideGenerator();
  const output: Partial<ExpressionDataSources> = {};

  for (const key of neededDataSources) {
    if (key in multiSelectors) {
      // Ignoring the typing here because it becomes too complex quickly. We don't really need the typing here, as we
      // have already checked the types in `multiSelectors`, so there's no point in doing it again here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output[key] = combined[combinedIndex++] as unknown as any;
    } else if (key in directHooks) {
      output[key] = directHooks[key](isInGenerator);
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
  displayValueLookups: Set<string>,
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
    }

    for (const item of subject) {
      findUsedExpressionFunctions(item, functionCalls, displayValueLookups);
    }
  } else {
    for (const key in subject) {
      findUsedExpressionFunctions(subject[key], functionCalls, displayValueLookups);
    }
  }
}

function isFunctionName(name: string): name is ExprFunctionName {
  return name in ExprFunctionDefinitions;
}
