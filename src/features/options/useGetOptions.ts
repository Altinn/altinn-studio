import { useRef } from 'react';

import { useGetOptionsQuery } from 'src/hooks/queries/useGetOptionsQuery';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { duplicateOptionFilter } from 'src/utils/options';
import type { IMapping, IOption, IOptionSource } from 'src/layout/common.generated';
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

interface Props<T extends ValueType> {
  // Generic props
  node: LayoutNode;
  removeDuplicates?: boolean;
  preselectedOptionIndex?: number;

  // The currently selected value(s). Used to clear the value if the options change.
  formData:
    | ValueObj<T>
    | {
        disable: 'I have read the code and know that core functionality will be missing';
      };

  // Simple options, static and pre-defined
  options?: IOption[];

  // Fetch options from API
  optionsId?: string;
  secure?: boolean;
  mapping?: IMapping;
  queryParameters?: Record<string, string>;

  // Fetch options from repeating group
  source?: IOptionSource;
}

export interface OptionsResult {
  options: IOption[];
  isFetching: boolean;
}

const defaultOptions: IOption[] = [];

export function useGetOptions<T extends ValueType>(props: Props<T>): OptionsResult {
  const { node, options, optionsId, secure, removeDuplicates, source, mapping, queryParameters } = props;
  const sourceOptions = useSourceOptions({ source, node });
  const { data: fetchedOptions, isFetching } = useGetOptionsQuery(optionsId, mapping, queryParameters, secure);
  const staticOptions = optionsId ? undefined : options;
  const calculatedOptions = sourceOptions || fetchedOptions || staticOptions;
  usePreselectedOptionIndex(calculatedOptions, props);
  useRemoveStaleValues(calculatedOptions, props);

  return {
    options:
      removeDuplicates && calculatedOptions
        ? calculatedOptions.filter(duplicateOptionFilter)
        : calculatedOptions || defaultOptions,
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

  if ('disable' in formData) {
    return;
  }

  const hasValue = formData.type === 'multi' ? formData.values.length > 0 : !!formData.value;
  const shouldSelectOptionAutomatically =
    !hasValue &&
    typeof preselectedOptionIndex !== 'undefined' &&
    preselectedOptionIndex >= 0 &&
    options &&
    preselectedOptionIndex < options.length &&
    !hasSelectedInitial.current;

  if (shouldSelectOptionAutomatically) {
    if (formData.type === 'multi') {
      formData.setValues([options[preselectedOptionIndex].value]);
    } else {
      formData.setValue(options[preselectedOptionIndex].value);
    }
    hasSelectedInitial.current = true;
  }
}

/**
 * If options has changed and the values no longer include the current value, we should clear the value.
 * This is especially useful when fetching options from an API with mapping, or when generating options
 * from a repeating group. If the options changed and the selected option (or selected row in a repeating group)
 * is gone, we should not save stale/invalid data, so we clear it.
 */
function useRemoveStaleValues<T extends ValueType>(options: IOption[] | undefined, props: Props<T>) {
  const { formData } = props;

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
}
