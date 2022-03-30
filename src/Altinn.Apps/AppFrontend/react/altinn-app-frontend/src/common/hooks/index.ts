import type { IDataSources, IInstanceContext } from 'altinn-shared/types';
import { replaceTextResourceParams } from 'altinn-shared/utils';
import { buildInstanceContext } from 'altinn-shared/utils/instanceContext';
import { useRef, useEffect, useState } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { IMapping, IOption, IOptionSource } from 'src/types';
import { getOptionLookupKey, replaceOptionDataField } from 'src/utils/options';
import type { RootState, AppDispatch } from '../../store/index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useHasChangedIgnoreUndefined = (val: any) => {
  const stringifiedVal = JSON.stringify(val);
  const prevVal = usePrevious(stringifiedVal);
  if (!val || !prevVal) {
    return false;
  }
  return prevVal !== stringifiedVal;
}

export const usePrevious = (value: any) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useGetOptions = (optionsId: string, mapping?: IMapping, source?: IOptionSource) => {
  const formData = useAppSelector(state => state.formData.formData);
  const instance = useAppSelector(state => state.instanceData.instance);
  const textResources = useAppSelector(state => state.textResources.resources);
  const repeatingGroups = useAppSelector(state => state.formLayout.uiConfig.repeatingGroups);
  const applicationSettings = useAppSelector(state => state.applicationSettings?.applicationSettings);
  const optionState = useAppSelector(state => state.optionState.options);
  const [options, setOptions] = useState<IOption[]>(undefined);

  useEffect(() => {
    if (optionsId) {
      setOptions(optionState[getOptionLookupKey(optionsId, mapping)]?.options);
    }

    if (!source || !repeatingGroups) {
      return;
    }

    const instanceContext: IInstanceContext = buildInstanceContext(instance);

    const dataSources: IDataSources = {
      dataModel: formData,
      applicationSettings: applicationSettings,
      instanceContext: instanceContext
    };

    const replacedOptionLabels =
      replaceTextResourceParams(textResources.filter((e => e.id === source.label)), dataSources, repeatingGroups);

    const repGroup = Object.values(repeatingGroups).find((group) => {
      return group.dataModelBinding === source.group;
    });


    const newOptions: IOption[] = [];
    for (let i = 0; i <= repGroup.count; i++) {
      const option: IOption = {
        label: replacedOptionLabels[i + 1].value,
        value: replaceOptionDataField(formData, source.value, i),
      };
      newOptions.push(option);
    }

      setOptions(newOptions);

  }, [applicationSettings, formData, instance, mapping, optionState, optionsId, repeatingGroups, source, textResources]);

  return options;
}
