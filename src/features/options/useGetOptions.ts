import { useEffect, useMemo, useRef } from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useGetOptionsQuery } from 'src/features/options/useGetOptionsQuery';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { duplicateOptionFilter } from 'src/utils/options';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type {
  IDataModelBindingsOptionsSimple,
  IDataModelBindingsSimple,
  IMapping,
  IOption,
  IOptionSourceExternal,
} from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ValueType = 'single' | 'multi';

interface Props<T extends ValueType> {
  valueType: T;

  // Generic props
  node: LayoutNode;
  removeDuplicates?: boolean;
  preselectedOptionIndex?: number;

  dataModelBindings?: IDataModelBindingsOptionsSimple | IDataModelBindingsSimple;

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

type CurrentValue<T extends ValueType> = T extends 'single' ? IOption | undefined : IOption[];
type CurrentValueAsString<T extends ValueType> = T extends 'single' ? string : string[];
type ValueSetter<T extends ValueType> = T extends 'single'
  ? (value: string | IOption) => void
  : (value: string[] | IOption[]) => void;

export interface OptionsResult<T extends ValueType> {
  // The current value, as an option (for single-option components) or an array of options (for multi-option components)
  // It is recommended to use this, and you can also compare this (object) value to the options (array of objects),
  // as the object references themselves are guaranteed to be the same.
  current: CurrentValue<T>;

  // The current value, as a string (for single-option components) or an array of strings (for multi-option components)
  // This is useful if the downstream component you're using does not support options objects. Also, the value is
  // guaranteed to be stringy even if the underlying options JSON and/or data model contains numbers, booleans, etc.
  currentStringy: CurrentValueAsString<T>;

  // Function to set the current value. The value can be either a string or an option object. For multi-option
  // components, you always set the value of all the selected options at the same time, not just one of them.
  setData: ValueSetter<T>;

  // The final list of options deduced from the component settings. This will be an array of objects, where each object
  // has a string-typed 'value' property, regardless of the underlying options configuration.
  options: IOption[];

  // Whether the options are currently being fetched from the API. This is usually false in normal components, as
  // options are always fetched on page load, but it can be true if the options are fetched dynamically based on
  // mapping or query parameters. In those cases you most likely want to render a spinner.
  isFetching: boolean;
}

interface EffectProps<T extends ValueType> {
  options: IOption[] | undefined;
  disable: boolean;
  valueType: T;
  preselectedOptionIndex?: number;
  currentValue: CurrentValue<T>;
  setValue: ValueSetter<T>;
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

export function useGetOptions<T extends ValueType>(props: Props<T>): OptionsResult<T> {
  const {
    node,
    options,
    optionsId,
    secure,
    removeDuplicates,
    source,
    mapping,
    queryParameters,
    sortOrder,
    dataModelBindings,
    valueType,
  } = props;
  const value = FD.usePickFreshString(dataModelBindings?.simpleBinding);
  const setDataUpstream = FD.useSetForBindings(dataModelBindings);
  const sourceOptions = useSourceOptions({ source, node });
  const staticOptions = optionsId ? undefined : options;
  const { data: fetchedOptions, isFetching } = useGetOptionsQuery(optionsId, mapping, queryParameters, secure);
  const calculatedOptions = sourceOptions || fetchedOptions?.data || castOptionsToStrings(staticOptions);
  const { langAsString } = useLanguage();
  const selectedLanguage = useCurrentLanguage();

  const downstreamParameters: string = fetchedOptions?.headers['altinn-downstreamparameters'];
  useEffect(() => {
    if (dataModelBindings && 'metadata' in dataModelBindings && dataModelBindings.metadata && downstreamParameters) {
      setDataUpstream('metadata' as any, downstreamParameters);
    }
  }, [dataModelBindings, downstreamParameters, setDataUpstream]);

  const optionsWithoutDuplicates =
    removeDuplicates && calculatedOptions
      ? calculatedOptions.filter(duplicateOptionFilter)
      : calculatedOptions || defaultOptions;

  const current = useMemo(() => {
    if (valueType === 'single') {
      return optionsWithoutDuplicates.find((option) => String(option.value) === String(value)) as CurrentValue<T>;
    }
    const stringValues = value && value.length > 0 ? value.split(',') : [];
    return optionsWithoutDuplicates.filter((option) => stringValues.includes(option.value)) as CurrentValue<T>;
  }, [value, valueType, optionsWithoutDuplicates]);

  const currentStringy = useMemo(() => {
    if (valueType === 'single') {
      return (value || '') as CurrentValueAsString<T>;
    }
    return (value ? value.split(',') : []) as CurrentValueAsString<T>;
  }, [value, valueType]);

  const setData = useMemo(() => {
    if (valueType === 'single') {
      return (value: string | IOption) =>
        setDataUpstream('simpleBinding', typeof value === 'string' ? value : value.value);
    }

    return (value: (string | IOption)[]) => {
      const asString = value.map((v) => (typeof v === 'string' ? v : v.value)).join(',');
      setDataUpstream('simpleBinding', asString);
    };
  }, [setDataUpstream, valueType]) as ValueSetter<T>;

  const effectProps: EffectProps<T> = useMemo(
    () => ({
      options: calculatedOptions,
      disable: !(props.dataModelBindings && 'simpleBinding' in props.dataModelBindings),
      valueType,
      preselectedOptionIndex: props.preselectedOptionIndex,
      currentValue: current,
      setValue: setData,
    }),
    [calculatedOptions, current, props.dataModelBindings, props.preselectedOptionIndex, setData, valueType],
  );

  usePreselectedOptionIndex(effectProps);
  useRemoveStaleValues(effectProps);

  return {
    current,
    currentStringy,
    setData,
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
function usePreselectedOptionIndex<T extends ValueType>(props: EffectProps<T>) {
  const { options, disable, preselectedOptionIndex } = props;
  const hasSelectedInitial = useRef(false);

  let hasValue = false;
  let shouldSelectOptionAutomatically = false;
  let option: string | undefined;

  if (!disable) {
    hasValue = isSingle(props) ? !!props.currentValue : isMulti(props) ? props.currentValue.length > 0 : false;

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
    if (shouldSelectOptionAutomatically && option !== undefined && !disable) {
      if (isMulti(props)) {
        props.setValue([option]);
      } else if (isSingle(props)) {
        props.setValue(option);
      }
      hasSelectedInitial.current = true;
    }
  }, [disable, option, props, shouldSelectOptionAutomatically]);
}

/**
 * If options has changed and the values no longer include the current value, we should clear the value.
 * This is especially useful when fetching options from an API with mapping, or when generating options
 * from a repeating group. If the options changed and the selected option (or selected row in a repeating group)
 * is gone, we should not save stale/invalid data, so we clear it.
 */
function useRemoveStaleValues<T extends ValueType>(props: EffectProps<T>) {
  const { options, disable } = props;
  useEffect(() => {
    if (disable) {
      return;
    }

    if (options && isSingle(props)) {
      const { currentValue, setValue } = props;
      if (currentValue && !options.find((option) => option.value === currentValue.value)) {
        setValue('');
      }
    } else if (options && isMulti(props)) {
      const { currentValue, setValue } = props;
      const itemsToRemove = currentValue.filter((v) => !options.find((option) => option.value === v.value));
      if (itemsToRemove.length > 0) {
        setValue(currentValue.filter((v) => !itemsToRemove.includes(v)));
      }
    }
  }, [disable, options, props]);
}

function isSingle(props: EffectProps<ValueType>): props is EffectProps<'single'> {
  return props.valueType === 'single';
}

function isMulti(props: EffectProps<ValueType>): props is EffectProps<'multi'> {
  return props.valueType === 'multi';
}
