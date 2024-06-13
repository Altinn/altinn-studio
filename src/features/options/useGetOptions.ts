import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useGetOptionsQuery } from 'src/features/options/useGetOptionsQuery';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { filterDuplicateOptions } from 'src/utils/options';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type {
  IDataModelBindingsOptionsSimple,
  IDataModelBindingsSimple,
  IMapping,
  IOptionSourceExternal,
  IRawOption,
} from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const getLabelsForActiveOptions = (selectedOptions: string[], allOptions: IOptionInternal[]): string[] =>
  allOptions.filter((option) => selectedOptions.includes(option.value)).map((option) => option.label);

const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
const useHasChanged = (val: any) => {
  const prevVal = usePrevious(val);
  return prevVal !== val;
};

interface Props {
  valueType: 'single' | 'multi';
  // Generic props
  node: LayoutNode;
  removeDuplicates?: boolean;
  preselectedOptionIndex?: number;

  dataModelBindings?: IDataModelBindingsOptionsSimple | IDataModelBindingsSimple;

  // Simple options, static and pre-defined
  options?: IRawOption[];

  // Fetch options from API
  optionsId?: string;
  secure?: boolean;
  mapping?: IMapping;
  queryParameters?: Record<string, string>;
  source?: IOptionSourceExternal;

  sortOrder?: SortOrder;
}

export interface OptionsResult {
  // This is guaranteed to only contain values that actually exist in the options that are returned.
  // The Combobox component will crash if a value does not exist in the options list.
  // The values are guaranteed to be stringy even if the underlying options JSON and/or data model contains numbers, booleans, etc.
  selectedValues: string[];

  setData: (values: string[]) => void;

  rawData: string;

  // The final list of options deduced from the component settings. This will be an array of objects, where each object
  // has a string-typed 'value' property, regardless of the underlying options configuration.
  options: IOptionInternal[];

  // Whether the options are currently being fetched from the API. This is usually false in normal components, as
  // options are always fetched on page load, but it can be true if the options are fetched dynamically based on
  // mapping or query parameters. In those cases you most likely want to render a spinner.
  isFetching: boolean;

  // Whether there was an error fetching the options from the API. If this is true, you should probably render the unknown error page
  isError: boolean;
}

interface EffectProps {
  options: IOptionInternal[] | undefined;
  disable: boolean;
  preselectedOption: IOptionInternal | undefined;
  currentValues: string[];
  setValue: (values: string[]) => void;
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

export function useGetOptions(props: Props): OptionsResult {
  const {
    node,
    valueType: type,
    options,
    optionsId,
    secure,
    removeDuplicates,
    source,
    mapping,
    queryParameters,
    sortOrder,
    dataModelBindings,
    preselectedOptionIndex,
  } = props;
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding ?? '';
  const sourceOptions = useSourceOptions({ source, node });
  const staticOptions = useMemo(() => (optionsId ? undefined : castOptionsToStrings(options)), [options, optionsId]);
  const { data: fetchedOptions, isFetching, isError } = useGetOptionsQuery(optionsId, mapping, queryParameters, secure);
  const { langAsString } = useLanguage();
  const selectedLanguage = useCurrentLanguage();

  const [calculatedOptions, preselectedOption] = useMemo(() => {
    let draft = sourceOptions || fetchedOptions?.data || staticOptions;
    let preselectedOption: IOptionInternal | undefined = undefined;
    if (preselectedOptionIndex !== undefined && draft && draft[preselectedOptionIndex]) {
      // This index uses the original options array, before any filtering or sorting
      preselectedOption = draft[preselectedOptionIndex];
    }

    if (draft && removeDuplicates) {
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
    removeDuplicates,
    selectedLanguage,
    sortOrder,
    sourceOptions,
    staticOptions,
  ]);

  // Log error if fetching options failed
  useEffect(() => {
    if (isError) {
      const optionsId = 'optionsId' in node.item ? `\noptionsId: ${node.item.optionsId}` : '';
      const mapping = 'mapping' in node.item ? `\nmapping: ${JSON.stringify(node.item.mapping)}` : '';
      const queryParameters =
        'queryParameters' in node.item ? `\nqueryParameters: ${JSON.stringify(node.item.queryParameters)}` : '';
      const secure = 'secure' in node.item ? `\nsecure: ${node.item.secure}` : '';

      window.logErrorOnce(
        `Failed to fetch options for node ${node.item.id}${optionsId}${mapping}${queryParameters}${secure}`,
      );
    }
  }, [isError, node.item]);

  const alwaysOptions = calculatedOptions || defaultOptions;

  const downstreamParameters: string = fetchedOptions?.headers['altinn-downstreamparameters'];
  useEffect(() => {
    if (dataModelBindings && 'metadata' in dataModelBindings && dataModelBindings.metadata && downstreamParameters) {
      // The value might be url-encoded
      setValue('metadata' as any, decodeURIComponent(downstreamParameters));
    }
  }, [dataModelBindings, downstreamParameters, setValue]);

  const currentValues = useMemo(() => (value && value.length > 0 ? value.split(',') : []), [value]);

  const selectedValues = useMemo(
    () => currentValues.filter((value) => alwaysOptions.find((option) => option.value === value)),
    [alwaysOptions, currentValues],
  );

  const translatedLabels = useMemo(
    () => getLabelsForActiveOptions(currentValues, calculatedOptions || []).map((label) => langAsString(label)),

    [calculatedOptions, currentValues, langAsString],
  );

  const labelsHaveChanged = useHasChanged(translatedLabels.join(','));

  useEffect(() => {
    if (!(dataModelBindings as IDataModelBindingsOptionsSimple)?.label) {
      return;
    }

    if (!labelsHaveChanged) {
      return;
    }

    if (type === 'single') {
      setValue('label' as any, translatedLabels.at(0));
    } else {
      setValue('label' as any, translatedLabels);
    }
  }, [translatedLabels, labelsHaveChanged, dataModelBindings, setValue, type]);

  const setData = useCallback((values: string[]) => setValue('simpleBinding', values.join(',')), [setValue]);

  const effectProps: EffectProps = useMemo(
    () => ({
      options: calculatedOptions,
      disable: isFetching || !(props.dataModelBindings && 'simpleBinding' in props.dataModelBindings),
      preselectedOption,
      currentValues,
      setValue: setData,
    }),
    [calculatedOptions, currentValues, isFetching, preselectedOption, props.dataModelBindings, setData],
  );

  usePreselectedOptionIndex(effectProps);
  useRemoveStaleValues(effectProps);

  return {
    rawData: value,
    selectedValues,
    setData,
    options: alwaysOptions,
    isFetching: isFetching || !calculatedOptions,
    isError,
  };
}
/**
 * If given the 'preselectedOptionIndex' property, we should automatically select the given option index as soon
 * as options are ready. The code is complex to guard against overwriting data that has been set by the user.
 */
function usePreselectedOptionIndex(props: EffectProps) {
  const { disable, preselectedOption } = props;
  const hasSelectedInitial = useRef(false);
  const hasValue = props.currentValues.length > 0;
  const shouldSelectOptionAutomatically = !disable && !hasValue && !hasSelectedInitial.current;

  useEffect(() => {
    if (shouldSelectOptionAutomatically && preselectedOption !== undefined && !disable) {
      props.setValue([preselectedOption.value]);
      hasSelectedInitial.current = true;
    }
  }, [disable, preselectedOption, props, shouldSelectOptionAutomatically]);
}

/**
 * If options has changed and the values no longer include the current value, we should clear the value.
 * This is especially useful when fetching options from an API with mapping, or when generating options
 * from a repeating group. If the options changed and the selected option (or selected row in a repeating group)
 * is gone, we should not save stale/invalid data, so we clear it.
 */
function useRemoveStaleValues(props: EffectProps) {
  const { options, disable } = props;
  useEffect(() => {
    if (disable) {
      return;
    }

    const { currentValues, setValue } = props;
    const itemsToRemove = currentValues.filter((v) => !options?.find((option) => option.value === v));
    if (itemsToRemove.length > 0) {
      setValue(currentValues.filter((v) => !itemsToRemove.includes(v)));
    }
  }, [disable, options, props]);
}
