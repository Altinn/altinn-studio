import { useEffect, useRef } from 'react';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptionsQuery } from 'src/features/options/useGetOptionsQuery';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { duplicateOptionFilter } from 'src/utils/options';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { IMapping, IOption, IOptionSourceExternal } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ValueType = 'single' | 'multi';
type ValueObj<T extends ValueType> = T extends 'single'
  ? {
      type: T;
      value: string | undefined;
      setValue: (value: string | undefined) => void;
    }
  : {
      type: T;
      values: string[];
      setValues: (value: string[]) => void;
    };

interface Disabled {
  disable: 'I have read the code and know that core functionality will be missing';
}

type ValueProps<T extends ValueType> = ValueObj<T> | Disabled;

interface Props<T extends ValueType> {
  // Generic props
  node: LayoutNode;
  removeDuplicates?: boolean;
  preselectedOptionIndex?: number;

  // The currently selected value(s). Used to clear the value if the options change.
  formData: ValueProps<T>;

  metadata?: Omit<ValueObj<'single'>, 'type' | 'value'>;

  // Simple options, static and pre-defined
  options?: IOption[];

  // Fetch options from API
  optionsId?: string;
  secure?: boolean;
  mapping?: IMapping;
  queryParameters?: Record<string, string>;
  source?: IOptionSourceExternal;

  sortOrder?: SortOrder;
}

export interface OptionsResult {
  options: IOption[];
  isFetching: boolean;
}

const defaultOptions: IOption[] = [];

type SortOrder = 'asc' | 'desc';
const compareOptionAlphabetically =
  (langAsString: IUseLanguage['langAsString'], sortOrder: SortOrder = 'asc', language: string = 'nb') =>
  (a: IOption, b: IOption) => {
    const comparison = langAsString(a.label).localeCompare(langAsString(b.label), language, {
      sensitivity: 'base',
      numeric: true,
    });
    return sortOrder === 'asc' ? comparison : -comparison;
  };

export function useGetOptions<T extends ValueType>(props: Props<T>): OptionsResult {
  const { node, options, optionsId, secure, removeDuplicates, source, mapping, queryParameters, sortOrder, metadata } =
    props;
  const sourceOptions = useSourceOptions({ source, node });
  const staticOptions = optionsId ? undefined : options;
  const { data: fetchedOptions, isFetching } = useGetOptionsQuery(optionsId, mapping, queryParameters, secure);
  const calculatedOptions = sourceOptions || fetchedOptions?.data || staticOptions;
  const { langAsString } = useLanguage();
  const selectedLanguage = useCurrentLanguage();

  const setMetadata = metadata?.setValue;
  const downstreamParameters: string = fetchedOptions?.headers['altinn-downstreamparameters'];
  useEffect(() => {
    if (!!setMetadata && downstreamParameters) {
      setMetadata(downstreamParameters);
    }
  }, [downstreamParameters, setMetadata]);

  usePreselectedOptionIndex(calculatedOptions, props);
  useRemoveStaleValues(calculatedOptions, props);

  const optionsWithoutDuplicates =
    removeDuplicates && calculatedOptions
      ? calculatedOptions.filter(duplicateOptionFilter)
      : calculatedOptions || defaultOptions;

  return {
    options: sortOrder
      ? [...optionsWithoutDuplicates].sort(compareOptionAlphabetically(langAsString, sortOrder, selectedLanguage))
      : optionsWithoutDuplicates,
    isFetching: isFetching || !calculatedOptions,
  };
}
/**
 * If given the 'preselectedOptionIndex' property, we should automatically select the given option index as soon
 * as options are ready. The code is complex to guard against overwriting data that has been set by the user.
 */
function usePreselectedOptionIndex<T extends ValueType>(options: IOption[] | undefined, props: Props<T>) {
  const { preselectedOptionIndex, formData } = props;
  const hasSelectedInitial = useRef(false);

  let hasValue = false;
  let shouldSelectOptionAutomatically = false;
  let option: string | undefined;

  if (!('disable' in formData)) {
    hasValue = formData.type === 'single' ? !!formData.value : formData.values.length > 0;

    shouldSelectOptionAutomatically =
      !hasValue &&
      typeof preselectedOptionIndex !== 'undefined' &&
      preselectedOptionIndex >= 0 &&
      !!options &&
      preselectedOptionIndex < options.length &&
      !hasSelectedInitial.current;
    option =
      shouldSelectOptionAutomatically && options && typeof preselectedOptionIndex !== 'undefined'
        ? options[preselectedOptionIndex].value
        : undefined;
  }

  useEffect(() => {
    if (shouldSelectOptionAutomatically && option !== undefined && !('disable' in formData)) {
      if (formData.type === 'multi') {
        formData.setValues([option]);
      } else {
        formData.setValue(option);
      }
      hasSelectedInitial.current = true;
    }
  }, [formData, option, shouldSelectOptionAutomatically]);
}

/**
 * If options has changed and the values no longer include the current value, we should clear the value.
 * This is especially useful when fetching options from an API with mapping, or when generating options
 * from a repeating group. If the options changed and the selected option (or selected row in a repeating group)
 * is gone, we should not save stale/invalid data, so we clear it.
 */
function useRemoveStaleValues<T extends ValueType>(options: IOption[] | undefined, props: Props<T>) {
  const { formData } = props;

  useEffect(() => {
    if ('disable' in formData) {
      return;
    }

    if (
      options &&
      formData.type === 'single' &&
      formData.value &&
      !options.find((option) => option.value === formData.value)
    ) {
      formData.setValue(undefined);
    }

    if (options && formData.type === 'multi' && formData.values.length > 0) {
      const itemsToRemove = formData.values.filter((value) => !options.find((option) => option.value === value));
      if (itemsToRemove.length > 0) {
        formData.setValues(formData.values.filter((value) => !itemsToRemove.includes(value)));
      }
    }
  }, [formData, options]);
}
