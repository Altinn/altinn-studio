import { useCallback, useEffect, useMemo } from 'react';

import type { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/common.generated';

import { evalExpr } from 'src/features/expressions';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useGetOptionsQuery, useGetOptionsUrl } from 'src/features/options/useGetOptionsQuery';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useSourceOptions } from 'src/features/options/useSourceOptions';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { verifyAndDeduplicateOptions } from 'src/utils/options';
import type { ExprValueArgs } from 'src/features/expressions/types';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { CompExternalExact, CompWithBehavior } from 'src/layout/layout';

export type OptionsValueType = 'single' | 'multi';

interface FetchOptionsProps {
  config: CompExternalExact<CompWithBehavior<'canHaveOptions'>>;
}

interface FilteredAndSortedOptionsProps {
  unsorted: IOptionInternal[];
  valueType: OptionsValueType;
  config: CompExternalExact<CompWithBehavior<'canHaveOptions'>>;
}

export interface GetOptionsResult {
  // The final list of options deduced from the component settings. This will be an array of objects, where each object
  // has a string-typed 'value' property, regardless of the underlying options configuration.
  options: IOptionInternal[];

  // Whether the options are currently being fetched from the API. This is usually false in normal components, as
  // options are always fetched on page load, but it can be true if the options are fetched dynamically based on
  // query parameters. In those cases you most likely want to render a spinner.
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

  return useMemo(
    () => ({
      rawData: value,
      selectedValues,
      unsafeSelectedValues: currentValues,
      setData,
    }),
    [currentValues, selectedValues, setData, value],
  );
}

function useOptionsUrl(config: CompExternalExact<CompWithBehavior<'canHaveOptions'>>) {
  return useGetOptionsUrl(config.optionsId, config.queryParameters, config.secure);
}

function hasDynamicOptionsConfig(config: CompExternalExact<CompWithBehavior<'canHaveOptions'>>) {
  return Boolean(config.queryParameters && Object.keys(config.queryParameters).length > 0);
}

export function useFetchOptions({ config }: FetchOptionsProps) {
  // Configuration cannot change during runtime, so breaking the rule of hooks here is acceptable. We do this to
  // avoid gathering lots of data for option sources we don't plan on using. It's always one of these
  // three (source, optionsId or static options).

  if (config.source) {
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const unsorted = useSourceOptions(config.source);
    return { unsorted, isFetching: false, downstreamParameters: undefined };
  }

  if (config.optionsId) {
    const staticOptions = FormStore.bootstrap.useStaticOptionsMap();
    const bootstrapOptions = staticOptions[config.optionsId];
    const shouldFetchFromApi = hasDynamicOptionsConfig(config);

    if (bootstrapOptions && !shouldFetchFromApi) {
      return {
        isFetching: false,
        unsorted: bootstrapOptions.options,
        downstreamParameters: bootstrapOptions.downstreamParameters ?? undefined,
      };
    }

    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const url = useOptionsUrl(config);
    if (!url) {
      throw new Error(`Failed to fetch options for node ${config.id}: Unable to construct URL`);
    }

    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { error, isFetching, data } = useGetOptionsQuery(url);

    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLogFetchError(error, config);

    return {
      isFetching,
      unsorted: data?.data ?? defaultOptions,
      downstreamParameters: data?.headers['altinn-downstreamparameters'],
    };
  }

  if (config.options) {
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const unsorted = useMemo(() => castOptionsToStrings(config.options ?? []), [config.options]);
    return { unsorted, isFetching: false, downstreamParameters: undefined };
  }

  return { unsorted: defaultOptions, isFetching: false, downstreamParameters: undefined };
}

// Log error if fetching options failed
function useLogFetchError(error: Error | null, config: CompExternalExact<CompWithBehavior<'canHaveOptions'>>) {
  useEffect(() => {
    if (error) {
      const _optionsId = config.optionsId ? `\noptionsId: ${config.optionsId}` : '';
      const _queryParameters = config.queryParameters
        ? `\nqueryParameters: ${JSON.stringify(config.queryParameters)}`
        : '';
      const _secure = config.secure ? `\nsecure: ${config.secure}` : '';

      window.logErrorOnce(`Failed to fetch options for node ${config.id}${_optionsId}${_queryParameters}${_secure}`);
    }
  }, [error, config]);
}

export function useFilteredAndSortedOptions({ unsorted, valueType, config }: FilteredAndSortedOptionsProps) {
  const id = useIndexedId(config.id);
  const dataModelBindings = useDataModelBindingsFor(config.id);
  const preselected = 'preselectedOptionIndex' in config ? config.preselectedOptionIndex : undefined;
  const langAsString = useLanguage().langAsString;
  const selectedLanguage = useCurrentLanguage();
  const selectedValues = useSetOptions(
    valueType,
    dataModelBindings as IDataModelBindingsOptionsSimple | undefined,
    unsorted,
  ).selectedValues;
  const dataSources = useExpressionDataSources(config.optionFilter);

  return useMemo(() => {
    let preselectedOption: IOptionInternal | undefined;
    if (preselected !== undefined) {
      preselectedOption = unsorted[preselected];
    }

    let options = verifyAndDeduplicateOptions(unsorted, valueType === 'multi');

    if (config.optionFilter !== undefined && ExprValidation.isValid(config.optionFilter)) {
      options = options.filter((o) => {
        const { dataModelLocation, ...option } = o;
        const valueArguments: ExprValueArgs<IOptionInternal> = {
          data: option,
          defaultKey: 'value',
        };
        const keep = evalExpr(
          config.optionFilter,
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
    if (options.length > 1 && config.sortOrder) {
      options.sort(compareOptionAlphabetically(langAsString, config.sortOrder, selectedLanguage));
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
    config.optionFilter,
    preselected,
    config.sortOrder,
    dataSources,
    selectedValues,
    langAsString,
    selectedLanguage,
  ]);
}

// TODO(Error handling): If fetching options fails, we just log and PDF generation will still succeed?
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
