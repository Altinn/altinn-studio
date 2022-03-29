import { useRef, useEffect, useState } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { IMapping, IOption, IOptionSource } from 'src/types';
import { getOptionLookupKey } from 'src/utils/options';
import type { RootState, AppDispatch } from '../../store/index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useHasChangedIgnoreUndefined = (val: any) => {
  const prevVal = usePrevious(val);
  if (!val || !prevVal) {
    return false;
  }
  return prevVal !== val;
}

export const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useGetOptions = (optionsId: string, mapping?: IMapping, source?: IOptionSource) => {
  // const formData = useAppSelector(state => state.formData.formData);
  // const textResources = useAppSelector(state => state.textResources.resources);
  const repeatingGroups = useAppSelector(state => state.formLayout.uiConfig.repeatingGroups);
  const optionState = useAppSelector(state => state.optionState.options);
  const [options, setOptions] = useState<IOption[]>(undefined);

  useEffect(() => {
    if (optionsId) {
      setOptions(optionState[getOptionLookupKey(optionsId, mapping)]?.options);
    }

    if (!source || !repeatingGroups) {
      return;
    }

    const repGroup = Object.values(repeatingGroups).find((group) => {
      return group.dataModelBinding === source.group;
    });

    if (!repGroup) {
      return;
    }

    const options: IOption[] = [];
    for (let i = 0; i <= repGroup.count; i ++) {
      const option: IOption = {
        label: source.label,
        value: source.value
      };
      options.push(option);
    }

    setOptions(options);

  }, [mapping, optionState, optionsId, repeatingGroups, source]);

  return options;
}
