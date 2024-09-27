import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import deepEqual from 'fast-deep-equal';

import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { resolveQueryParameters } from 'src/features/options/evalQueryParameters';
import { useGetOptionsQuery } from 'src/features/options/useGetOptionsQuery';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useAsRef } from 'src/hooks/useAsRef';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { useGetAwaitingCommits } from 'src/utils/layout/generator/GeneratorStages';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { filterDuplicateOptions, verifyOptions } from 'src/utils/options';
import type { FDLeafValue } from 'src/features/formData/FormDataWrite';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediateExact, CompWithBehavior } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type OptionsValueType = 'single' | 'multi';

interface FetchOptionsProps {
  valueType: OptionsValueType;
  node: LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>;
}

interface SetOptionsProps {
  valueType: OptionsValueType;
  dataModelBindings?: IDataModelBindingsOptionsSimple;
}

export interface GetOptionsResult {
  // The final list of options deduced from the component settings. This will be an array of objects, where each object
  // has a string-typed 'value' property, regardless of the underlying options configuration.
  options: IOptionInternal[];

  // Whether the options are currently being fetched from the API. This is usually false in normal components, as
  // options are always fetched on page load, but it can be true if the options are fetched dynamically based on
  // mapping or query parameters. In those cases you most likely want to render a spinner.
  isFetching: boolean;
}

export interface SetOptionsResult {
  // This is guaranteed to only contain values that actually exist in the options that are returned.
  // The Combobox component will crash if a value does not exist in the options list.
  // The values are guaranteed to be stringy even if the underlying options JSON and/or data model contains numbers, booleans, etc.
  selectedValues: string[];

  // This is the raw value(s) from the data model. It is not guaranteed to be valid, and may
  // contain values that do not exist in the options list.
  unsafeSelectedValues: string[];

  rawData: string;

  setData: (values: string[]) => void;
}

interface EffectProps {
  node: LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>;
  options: IOptionInternal[] | undefined;
  preselectedOption: IOptionInternal | undefined;
  unsafeSelectedValues: string[];
  setRawData: (key: keyof IDataModelBindingsOptionsSimple, value: FDLeafValue) => void;
  setValues: (values: string[]) => void;
  valueType: OptionsValueType;
  downstreamParameters: string | undefined;
}

const defaultOptions: IOptionInternal[] = [];

type SortOrder = 'asc' | 'desc';
const compareOptionAlphabetically =
  (langAsString: IUseLanguage['langAsString'], sortOrder: SortOrder = 'asc', language: string = 'nb') =>
  (a: IOptionInternal, b: IOptionInternal) => {
    const comparison = langAsString(a.label).localeCompare(langAsString(b.label), language, {
      sensitivity: 'base',
      numeric: true,
    });
    return sortOrder === 'asc' ? comparison : -comparison;
  };

function useSetOptions(props: SetOptionsProps, alwaysOptions: IOptionInternal[]): SetOptionsResult {
  const { valueType, dataModelBindings } = props;
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding ?? '';

  const currentValues = useMemo(
    () => (value && value.length > 0 ? (valueType === 'multi' ? value.split(',') : [value]) : []),
    [value, valueType],
  );

  const selectedValues = useMemo(
    () => currentValues.filter((value) => alwaysOptions.find((option) => option.value === value)),
    [alwaysOptions, currentValues],
  );

  const setData = useCallback(
    (values: string[]) => {
      if (valueType === 'single') {
        setValue('simpleBinding', values.at(0));
      } else if (valueType === 'multi') {
        setValue('simpleBinding', values.join(','));
      }
    },
    [setValue, valueType],
  );

  return {
    rawData: value,
    selectedValues,
    unsafeSelectedValues: currentValues,
    setData,
  };
}
/**
 * If given the 'preselectedOptionIndex' property, we should automatically select the given option index as soon
 * as options are ready. The code is complex to guard against overwriting data that has been set by the user.
 */
function useEffectPreselectedOptionIndex({ node, setValues, preselectedOption, unsafeSelectedValues }: EffectProps) {
  const isNodeHidden = Hidden.useIsHidden(node);
  const isNodesReady = NodesInternal.useIsReady();
  const hasSelectedInitial = useRef(false);
  const hasValue = unsafeSelectedValues.length > 0;
  const shouldSelectOptionAutomatically =
    !hasValue &&
    !hasSelectedInitial.current &&
    preselectedOption !== undefined &&
    isNodesReady &&
    isNodeHidden !== true;

  useEffect(() => {
    if (shouldSelectOptionAutomatically) {
      setValues([preselectedOption.value]);
      hasSelectedInitial.current = true;
    }
  }, [preselectedOption, shouldSelectOptionAutomatically, setValues]);
}

/**
 * If options has changed and the values no longer include the current value, we should clear the value.
 * This is especially useful when fetching options from an API with mapping, or when generating options
 * from a repeating group. If the options changed and the selected option (or selected row in a repeating group)
 * is gone, we should not save stale/invalid data, so we clear it.
 */
function useEffectRemoveStaleValues(props: EffectProps) {
  const isNodeHidden = Hidden.useIsHidden(props.node);
  const isNodesReady = NodesInternal.useIsReady();
  const [_, setForceRerender] = useState(0);
  const getAwaiting = useGetAwaitingCommits();
  const ready = isNodesReady && !isNodeHidden;
  const propsAsRef = useAsRef(props);
  const readyAsRef = useAsRef(ready);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function cleanup() {
      timeout !== undefined && clearTimeout(timeout);
    }

    function isReady() {
      if (!readyAsRef.current) {
        return false;
      }
      const awaitingCommits = getAwaiting();
      if (awaitingCommits > 0) {
        // We should not remove values if there are pending commits. We'll force a re-render to delay this check until
        // the pending commits are done. This is needed because getAwaiting() is not reactive.
        timeout = setTimeout(() => setForceRerender((r) => r + 1), 100);
        return false;
      }
      return true;
    }

    if (!isReady()) {
      return cleanup;
    }

    timeout = setTimeout(() => {
      // If you have larger sweeping changes in the data model happening at once, such as a data processing change
      // or a click on a CustomButton, we might not have run the hidden expressions yet when this effect runs.
      // We'll wait a bit to make sure the hidden expressions have run before we remove the values, and if we're
      // hidden at that point, skip the removal.
      const { options, unsafeSelectedValues, setValues } = propsAsRef.current;
      if (!options || !isReady()) {
        return;
      }
      const itemsToRemove = unsafeSelectedValues.filter((v) => !options?.find((option) => option.value === v));
      if (itemsToRemove.length > 0) {
        setValues(unsafeSelectedValues.filter((v) => !itemsToRemove.includes(v)));
      }
    }, 200);

    return cleanup;
  }, [getAwaiting, readyAsRef, propsAsRef, ready]);
}

/**
 * This effect is responsible for setting the label/display value in the data model.
 */
function useEffectStoreLabel({ node, item, options, unsafeSelectedValues, valueType, setRawData }: EffectProps) {
  const isNodeHidden = Hidden.useIsHidden(node);
  const isNodesReady = NodesInternal.useIsReady();
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const { langAsString } = useLanguage();
  const formData = FD.useFreshBindings(dataModelBindings, 'raw');

  const translatedLabels = useMemo(
    () =>
      options
        ?.filter((option) => unsafeSelectedValues.includes(option.value))
        .map((option) => option.label)
        .map((label) => langAsString(label)),
    [langAsString, options, unsafeSelectedValues],
  );

  const labelsHaveChanged = !deepEqual(translatedLabels, 'label' in formData ? formData.label : undefined);
  const shouldSetData =
    labelsHaveChanged && !isNodeHidden && isNodesReady && dataModelBindings && 'label' in dataModelBindings;

  useEffect(() => {
    if (!shouldSetData) {
      return;
    }

    if (!translatedLabels || translatedLabels.length === 0) {
      setRawData('label', undefined);
      return;
    } else if (valueType === 'single') {
      setRawData('label', translatedLabels.at(0));
    } else {
      setRawData('label', translatedLabels);
    }
  }, [setRawData, shouldSetData, translatedLabels, valueType]);
}

function useEffectSetDownstreamParameters({ item, downstreamParameters, setRawData }: EffectProps) {
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  useEffect(() => {
    if (dataModelBindings && 'metadata' in dataModelBindings && dataModelBindings.metadata && downstreamParameters) {
      // The value might be url-encoded
      setRawData('metadata', decodeURIComponent(downstreamParameters));
    }
  }, [dataModelBindings, downstreamParameters, setRawData]);
}

export function useFetchOptions({ node, valueType, item }: FetchOptionsProps): GetOptionsResult {
  const { options, optionsId, secure, source, mapping, queryParameters, sortOrder, dataModelBindings } = item;

  const dataSources = useExpressionDataSources();
  const resolvedQueryParameters = resolveQueryParameters(queryParameters, node, dataSources);

  const preselectedOptionIndex = 'preselectedOptionIndex' in item ? item.preselectedOptionIndex : undefined;
  const { langAsString } = useLanguage();
  const selectedLanguage = useCurrentLanguage();
  const setLeafValue = FD.useSetLeafValue();

  const setRawData = useCallback(
    (key: keyof IDataModelBindingsOptionsSimple, newValue: FDLeafValue) => {
      if (!dataModelBindings || !(key in dataModelBindings)) {
        return;
      }

      setLeafValue({
        reference: dataModelBindings[key],
        newValue,
      });
    },
    [dataModelBindings, setLeafValue],
  );

  const sourceOptions = useSourceOptions({ source, node });
  const staticOptions = useMemo(() => (optionsId ? undefined : castOptionsToStrings(options)), [options, optionsId]);
  const {
    data: fetchedOptions,
    isFetching,
    isError,
  } = useGetOptionsQuery(optionsId, mapping, resolvedQueryParameters, secure);

  const [calculatedOptions, preselectedOption] = useMemo(() => {
    let draft = sourceOptions || fetchedOptions?.data || staticOptions;
    verifyOptions(draft, valueType === 'multi');
    let preselectedOption: IOptionInternal | undefined = undefined;
    if (preselectedOptionIndex !== undefined && draft && draft[preselectedOptionIndex]) {
      // This index uses the original options array, before any filtering or sorting
      preselectedOption = draft[preselectedOptionIndex];
    }

    verifyOptions(draft, valueType === 'multi');

    if (draft && draft.length < 2) {
      // No need to sort or filter if there are 0 or 1 options. Using langAsString() can lead to re-rendering, so
      // we avoid it if we don't need it.
      return [draft, preselectedOption];
    }

    if (draft) {
      draft = filterDuplicateOptions(draft);
    }
    if (draft && sortOrder) {
      draft = [...draft].sort(compareOptionAlphabetically(langAsString, sortOrder, selectedLanguage));
    }

    return [draft, preselectedOption];
  }, [
    fetchedOptions?.data,
    langAsString,
    preselectedOptionIndex,
    selectedLanguage,
    sortOrder,
    sourceOptions,
    staticOptions,
    valueType,
  ]);

  // Log error if fetching options failed
  useEffect(() => {
    if (isError) {
      const _optionsId = optionsId ? `\noptionsId: ${optionsId}` : '';
      const _mapping = mapping ? `\nmapping: ${JSON.stringify(mapping)}` : '';
      const _queryParameters = queryParameters ? `\nqueryParameters: ${JSON.stringify(queryParameters)}` : '';
      const _secure = secure ? `\nsecure: ${secure}` : '';

      window.logErrorOnce(
        `Failed to fetch options for node ${node.id}${_optionsId}${_mapping}${_queryParameters}${_secure}`,
      );
    }
  }, [isError, mapping, node, optionsId, queryParameters, secure]);

  const alwaysOptions = calculatedOptions || defaultOptions;
  const { unsafeSelectedValues, setData } = useSetOptions(
    { valueType, dataModelBindings: dataModelBindings as IDataModelBindingsOptionsSimple },
    alwaysOptions,
  );

  const downstreamParameters: string | undefined = fetchedOptions?.headers['altinn-downstreamparameters'];
  const effectProps: EffectProps = useMemo(
    () => ({
      node,
      item,
      options: calculatedOptions,
      valueType,
      preselectedOption,
      unsafeSelectedValues,
      setRawData,
      setValues: setData,
      downstreamParameters,
    }),
    [
      node,
      item,
      calculatedOptions,
      valueType,
      preselectedOption,
      unsafeSelectedValues,
      setRawData,
      setData,
      downstreamParameters,
    ],
  );

  useEffectPreselectedOptionIndex(effectProps);
  useEffectRemoveStaleValues(effectProps);
  useEffectStoreLabel(effectProps);
  useEffectSetDownstreamParameters(effectProps);

  return {
    options: alwaysOptions,
    isFetching,
  };
}

export function useGetOptions(
  node: LayoutNode<CompWithBehavior<'canHaveOptions'>>,
  valueType: OptionsValueType,
): GetOptionsResult & SetOptionsResult {
  const dataModelBindings = useNodeItem(node, (i) => i.dataModelBindings) as
    | IDataModelBindingsOptionsSimple
    | undefined;

  const get = useNodeOptions(node);
  const set = useSetOptions({ valueType, dataModelBindings }, get.options);

  return useMemo(() => ({ ...get, ...set }), [get, set]);
}
