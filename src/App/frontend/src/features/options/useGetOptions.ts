import { useCallback, useEffect, useMemo } from 'react';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useGetOptionsQuery, useGetOptionsUrl } from 'src/features/options/useGetOptionsQuery';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useSourceOptions } from 'src/features/options/useSourceOptions';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { verifyAndDeduplicateOptions } from 'src/utils/options';
import type { ExprValueArgs } from 'src/features/expressions/types';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediateExact, CompWithBehavior } from 'src/layout/layout';

export type OptionsValueType = 'single' | 'multi';

interface FetchOptionsProps {
  item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>;
}

interface FilteredAndSortedOptionsProps {
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

function useOptionsUrl(item: CompIntermediateExact<CompWithBehavior<'canHaveOptions'>>) {
  const { optionsId, secure, mapping, queryParameters } = item;
  return useGetOptionsUrl(optionsId, mapping, queryParameters, secure);
}

export function useFetchOptions({ item }: FetchOptionsProps) {
  const { options, optionsId, source } = item;

  // Configuration cannot change during runtime, so breaking the rule of hooks here is acceptable. We do this to
  // avoid gathering lots of data for option sources we don't plan on using. It's always one of these
  // three (source, optionsId or static options).

  if (source) {
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const unsorted = useSourceOptions(source);
    return { unsorted, isFetching: false, downstreamParameters: undefined };
  }

  if (optionsId) {
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const url = useOptionsUrl(item);
    if (!url) {
      throw new Error(`Failed to fetch options for node ${item.id}: Unable to construct URL`);
    }

    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { error, isFetching, data } = useGetOptionsQuery(url);

    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLogFetchError(error, item);

    return {
      isFetching,
      unsorted: data?.data ?? defaultOptions,
      downstreamParameters: data?.headers['altinn-downstreamparameters'],
    };
  }

  if (options) {
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const unsorted = useMemo(() => castOptionsToStrings(options), [options]);
    return { unsorted, isFetching: false, downstreamParameters: undefined };
  }

  return { unsorted: defaultOptions, isFetching: false, downstreamParameters: undefined };
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

export function useFilteredAndSortedOptions({ unsorted, valueType, item }: FilteredAndSortedOptionsProps) {
  const { id, sortOrder, optionFilter, dataModelBindings } = item;
  const preselected = 'preselectedOptionIndex' in item ? item.preselectedOptionIndex : undefined;
  const langAsString = useLanguage().langAsString;
  const selectedLanguage = useCurrentLanguage();
  const selectedValues = useSetOptions(
    valueType,
    dataModelBindings as IDataModelBindingsOptionsSimple | undefined,
    unsorted,
  ).selectedValues;
  const dataSources = useExpressionDataSources(optionFilter);

  return useMemo(() => {
    let preselectedOption: IOptionInternal | undefined;
    if (preselected !== undefined) {
      preselectedOption = unsorted[preselected];
    }

    let options = verifyAndDeduplicateOptions(unsorted, valueType === 'multi');

    if (optionFilter !== undefined && ExprValidation.isValid(optionFilter)) {
      options = options.filter((o) => {
        const { dataModelLocation, ...option } = o;
        const valueArguments: ExprValueArgs<IOptionInternal> = {
          data: option,
          defaultKey: 'value',
        };
        const keep = evalExpr(
          optionFilter,
          { ...dataSources, currentDataModelPath: dataModelLocation ?? dataSources.currentDataModelPath },
          { returnType: ExprVal.Boolean, defaultValue: true, valueArguments },
        );
        if (!keep && selectedValues.includes(option.value)) {
          window.logWarnOnce(
            `Node '${id}': Option with value "${option.value}" was selected, but the option filter ` +
              `excludes it. This will cause the option to be deselected. If this was unintentional, add a check ` +
              `for the currently selected option in your optionFilter expression.`,
          );
        }
        return keep;
      });

      // If we have an option filter AND a preselected option, we need to set which option is preselected
      // again at this point. Previously, the preselected option was always just set to the first option in the list
      // before any sorting an filtering was done, but for it to work correctly with optionFilter, we need to set it
      // again here. Just setting it after the filtering is done might break some apps that rely on the old behavior.
      if (preselected !== undefined) {
        preselectedOption = options[preselected];
      }
    }

    // No need to sort if there are 0 or 1 options. Using langAsString() can lead to re-rendering, so
    // we avoid it if we don't need it.
    if (options.length > 1 && sortOrder) {
      options.sort(compareOptionAlphabetically(langAsString, sortOrder, selectedLanguage));
    }

    // Always remove the dataModelLocation at this point. It is only to be used in the filtering process.
    for (const idx in options) {
      // If we mutate the existing option (possibly coming from useSourceOptions) it will break things.
      const { dataModelLocation: _, ...option } = options[idx];
      options[idx] = option;
    }

    return { options, preselectedOption };
  }, [
    id,
    unsorted,
    valueType,
    optionFilter,
    preselected,
    sortOrder,
    dataSources,
    selectedValues,
    langAsString,
    selectedLanguage,
  ]);
}

export function useGetOptions(
  baseComponentId: string,
  valueType: OptionsValueType,
): GetOptionsResult & SetOptionsResult {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId) as IDataModelBindingsOptionsSimple | undefined;
  return useGetOptionsUsingDmb(baseComponentId, valueType, dataModelBindings);
}

export function useGetOptionsUsingDmb(
  baseComponentId: string,
  valueType: OptionsValueType,
  dataModelBindings: IDataModelBindingsOptionsSimple | undefined,
): GetOptionsResult & SetOptionsResult {
  const get = useOptionsFor(baseComponentId, valueType);
  const set = useSetOptions(valueType, dataModelBindings, get.options);

  return useMemo(() => ({ ...get, ...set }), [get, set]);
}
