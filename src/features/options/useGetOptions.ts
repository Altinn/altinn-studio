import { useCallback, useEffect, useMemo } from 'react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useGetOptionsQuery, useGetOptionsUrl } from 'src/features/options/useGetOptionsQuery';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { filterDuplicateOptions, verifyOptions } from 'src/utils/options';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediateExact, CompWithBehavior } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type OptionsValueType = 'single' | 'multi';

interface FetchOptionsProps {
  node: LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>;
}

interface SortedOptionsProps {
  unsorted: IOptionInternal[];
  valueType: OptionsValueType;
  item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>;
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

export function useSetOptions(
  valueType: OptionsValueType,
  dataModelBindings: IDataModelBindingsOptionsSimple | undefined,
  options: IOptionInternal[],
): SetOptionsResult {
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding ?? '';

  const currentValues = useMemo(
    () => (value && value.length > 0 ? (valueType === 'multi' ? value.split(',') : [value]) : []),
    [value, valueType],
  );

  const selectedValues = useMemo(
    () => currentValues.filter((value) => options.find((option) => option.value === value)),
    [options, currentValues],
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

function useOptionsUrl(node: LayoutNode, item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>) {
  const { optionsId, secure, mapping, queryParameters } = item;
  return useGetOptionsUrl(node, optionsId, mapping, queryParameters, secure);
}

export function useFetchOptions({ node, item }: FetchOptionsProps) {
  const { options, optionsId, source } = item;
  const url = useOptionsUrl(node, item);

  const sourceOptions = useSourceOptions({ source, node });
  const staticOptions = useMemo(() => (optionsId ? undefined : castOptionsToStrings(options)), [options, optionsId]);
  const { data, isFetching, error } = useGetOptionsQuery(url);
  useLogFetchError(error, item);

  const downstreamParameters: string | undefined = data?.headers['altinn-downstreamparameters'];

  return {
    unsorted: sourceOptions ?? data?.data ?? staticOptions ?? defaultOptions,
    isFetching,
    downstreamParameters,
  };
}

// Log error if fetching options failed
function useLogFetchError(error: Error | null, item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>) {
  useEffect(() => {
    if (error) {
      const { id, optionsId, secure, mapping, queryParameters } = item;
      const _optionsId = optionsId ? `\noptionsId: ${optionsId}` : '';
      const _mapping = mapping ? `\nmapping: ${JSON.stringify(mapping)}` : '';
      const _queryParameters = queryParameters ? `\nqueryParameters: ${JSON.stringify(queryParameters)}` : '';
      const _secure = secure ? `\nsecure: ${secure}` : '';

      window.logErrorOnce(
        `Failed to fetch options for node ${id}${_optionsId}${_mapping}${_queryParameters}${_secure}`,
      );
    }
  }, [error, item]);
}

const emptyArray: never[] = [];
export function useSortedOptions({ unsorted, valueType, item }: SortedOptionsProps) {
  const sortOrder = item.sortOrder;
  const preselectedOptionIndex = 'preselectedOptionIndex' in item ? item.preselectedOptionIndex : undefined;
  const language = useLanguage();
  const langAsString = language.langAsString;
  const selectedLanguage = useCurrentLanguage();

  return useMemo(() => {
    let options = structuredClone(unsorted);
    verifyOptions(options, valueType === 'multi');
    let preselectedOption: IOptionInternal | undefined = undefined;
    if (preselectedOptionIndex !== undefined && options && options[preselectedOptionIndex]) {
      // This index uses the original options array, before any filtering or sorting
      preselectedOption = options[preselectedOptionIndex];
    }

    verifyOptions(options, valueType === 'multi');

    if (!options || options.length === 0) {
      return { options: emptyArray, preselectedOption };
    }

    if (options.length < 2) {
      // No need to sort or filter if there are 0 or 1 options. Using langAsString() can lead to re-rendering, so
      // we avoid it if we don't need it.
      return { options, preselectedOption };
    }

    options = filterDuplicateOptions(options);
    if (sortOrder) {
      options = [...options].sort(compareOptionAlphabetically(langAsString, sortOrder, selectedLanguage));
    }

    return { options, preselectedOption };
  }, [langAsString, preselectedOptionIndex, selectedLanguage, sortOrder, unsorted, valueType]);
}

export function useGetOptions(
  node: LayoutNode<CompWithBehavior<'canHaveOptions'>>,
  valueType: OptionsValueType,
): GetOptionsResult & SetOptionsResult {
  const dataModelBindings = useNodeItem(node, (i) => i.dataModelBindings) as
    | IDataModelBindingsOptionsSimple
    | undefined;

  return useGetOptionsUsingDmb(node, valueType, dataModelBindings);
}

export function useGetOptionsUsingDmb(
  node: LayoutNode<CompWithBehavior<'canHaveOptions'>>,
  valueType: OptionsValueType,
  dataModelBindings: IDataModelBindingsOptionsSimple | undefined,
): GetOptionsResult & SetOptionsResult {
  const get = useNodeOptions(node);
  const set = useSetOptions(valueType, dataModelBindings, get.options);

  return useMemo(() => ({ ...get, ...set }), [get, set]);
}
