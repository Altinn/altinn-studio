import { useEffect, useState } from 'react';
import { shallowEqual } from 'react-redux';

import { useAppSelector } from 'src/common/hooks';
import { buildInstanceContext } from 'src/utils/instanceContext';
import { getOptionLookupKey, getRelevantFormDataForOptionSource, setupSourceOptions } from 'src/utils/options';
import type { IMapping, IOption, IOptionSource } from 'src/types';

import type { IDataSources } from 'altinn-shared/types';

interface IUseGetOptionsParams {
  optionsId: string | undefined;
  mapping?: IMapping;
  source?: IOptionSource;
}

export const useGetOptions = ({ optionsId, mapping, source }: IUseGetOptionsParams) => {
  const relevantFormData = useAppSelector(
    (state) => source && getRelevantFormDataForOptionSource(state.formData.formData, source),
    shallowEqual,
  );
  const instance = useAppSelector((state) => state.instanceData.instance);
  const relevantTextResource = useAppSelector(
    (state) => source && state.textResources.resources.find((e) => e.id === source.label),
  );
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const applicationSettings = useAppSelector((state) => state.applicationSettings?.applicationSettings);
  const optionState = useAppSelector((state) => state.optionState.options);
  const [options, setOptions] = useState<IOption[] | undefined>(undefined);

  useEffect(() => {
    if (optionsId) {
      const key = getOptionLookupKey({ id: optionsId, mapping });
      setOptions(optionState[key]?.options);
    }

    if (!source || !repeatingGroups || !relevantTextResource) {
      return;
    }

    const instanceContext = buildInstanceContext(instance);

    const dataSources: IDataSources = {
      dataModel: relevantFormData,
      applicationSettings: applicationSettings,
      instanceContext: instanceContext,
    };

    setOptions(
      setupSourceOptions({
        source,
        relevantTextResource,
        relevantFormData,
        repeatingGroups,
        dataSources,
      }),
    );
  }, [
    applicationSettings,
    relevantFormData,
    instance,
    mapping,
    optionState,
    optionsId,
    repeatingGroups,
    source,
    relevantTextResource,
  ]);

  return options;
};

export { useDisplayData } from './useDisplayData';
