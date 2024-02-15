import { useEffect, useMemo, useRef } from 'react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useGetOptionsQuery } from 'src/features/options/useGetOptionsQuery';
import { useSourceOptions } from 'src/hooks/useSourceOptions';
import { duplicateOptionFilter } from 'src/utils/options';
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

type ValueType = 'single' | 'multi';

interface Props<T extends ValueType> {
  valueType: T;

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

type CurrentValue<T extends ValueType> = T extends 'single' ? IOptionInternal | undefined : IOptionInternal[];
type CurrentValueAsString<T extends ValueType> = T extends 'single' ? string : string[];
type ValueSetter<T extends ValueType> = T extends 'single'
  ? (value: string | IOptionInternal) => void
  : (value: string[] | IOptionInternal[]) => void;

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
  options: IOptionInternal[];

  // Whether the options are currently being fetched from the API. This is usually false in normal components, as
  // options are always fetched on page load, but it can be true if the options are fetched dynamically based on
  // mapping or query parameters. In those cases you most likely want to render a spinner.
  isFetching: boolean;
}

interface EffectProps<T extends ValueType> {
  options: IOptionInternal[] | undefined;
  disable: boolean;
  valueType: T;
  preselectedOption: IOptionInternal | undefined;
  currentValue: CurrentValueAsString<T>;
  setValue: ValueSetter<T>;
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
    preselectedOptionIndex,
  } = props;
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const value = formData.simpleBinding ?? '';
  const sourceOptions = useSourceOptions({ source, node });
  const staticOptions = useMemo(() => (optionsId ? undefined : castOptionsToStrings(options)), [options, optionsId]);
  const { data: fetchedOptions, isFetching } = useGetOptionsQuery(optionsId, mapping, queryParameters, secure);
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
      draft = draft.filter(duplicateOptionFilter);
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

  const alwaysOptions = calculatedOptions || defaultOptions;

  const downstreamParameters: string = fetchedOptions?.headers['altinn-downstreamparameters'];
  useEffect(() => {
    if (dataModelBindings && 'metadata' in dataModelBindings && dataModelBindings.metadata && downstreamParameters) {
      setValue('metadata' as any, downstreamParameters);
    }
  }, [dataModelBindings, downstreamParameters, setValue]);

  const current = useMemo(() => {
    if (valueType === 'single') {
      return alwaysOptions.find((option) => String(option.value) === String(value)) as CurrentValue<T>;
    }
    const stringValues = value && value.length > 0 ? value.split(',') : [];
    return alwaysOptions.filter((option) => stringValues.includes(option.value)) as CurrentValue<T>;
  }, [value, valueType, alwaysOptions]);

  const currentStringy = useMemo(() => {
    if (valueType === 'single') {
      return (value || '') as CurrentValueAsString<T>;
    }
    return (value ? value.split(',') : []) as CurrentValueAsString<T>;
  }, [value, valueType]);

  const setData = useMemo(() => {
    if (valueType === 'single') {
      return (value: string | IOptionInternal) =>
        setValue('simpleBinding', typeof value === 'string' ? value : value.value);
    }

    return (value: (string | IOptionInternal)[]) => {
      const asString = value.map((v) => (typeof v === 'string' ? v : v.value)).join(',');
      setValue('simpleBinding', asString);
    };
  }, [setValue, valueType]) as ValueSetter<T>;

  const effectProps: EffectProps<T> = useMemo(
    () => ({
      options: calculatedOptions,
      disable: !(props.dataModelBindings && 'simpleBinding' in props.dataModelBindings),
      valueType,
      preselectedOption,
      currentValue: currentStringy,
      setValue: setData,
    }),
    [calculatedOptions, currentStringy, preselectedOption, props.dataModelBindings, setData, valueType],
  );

  usePreselectedOptionIndex(effectProps);
  useRemoveStaleValues(effectProps);

  return {
    current,
    currentStringy,
    setData,
    options: alwaysOptions,
    isFetching: isFetching || !calculatedOptions,
  };
}
/**
 * If given the 'preselectedOptionIndex' property, we should automatically select the given option index as soon
 * as options are ready. The code is complex to guard against overwriting data that has been set by the user.
 */
function usePreselectedOptionIndex<T extends ValueType>(props: EffectProps<T>) {
  const { disable, preselectedOption } = props;
  const hasSelectedInitial = useRef(false);
  const hasValue = isSingle(props) ? !!props.currentValue : isMulti(props) ? props.currentValue.length > 0 : false;
  const shouldSelectOptionAutomatically = !disable && !hasValue && !hasSelectedInitial.current;

  useEffect(() => {
    if (shouldSelectOptionAutomatically && preselectedOption !== undefined && !disable) {
      if (isMulti(props)) {
        props.setValue([preselectedOption]);
      } else if (isSingle(props)) {
        props.setValue(preselectedOption);
      }
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
function useRemoveStaleValues<T extends ValueType>(props: EffectProps<T>) {
  const { options, disable } = props;
  useEffect(() => {
    if (disable) {
      return;
    }

    if (options && isSingle(props)) {
      const { currentValue, setValue } = props;
      if (currentValue && !options.find((option) => option.value === currentValue)) {
        setValue('');
      }
    } else if (options && isMulti(props)) {
      const { currentValue, setValue } = props;
      const itemsToRemove = currentValue.filter((v) => !options.find((option) => option.value === v));
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
