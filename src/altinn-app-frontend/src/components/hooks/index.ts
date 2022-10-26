import { useEffect, useState } from 'react';
import { shallowEqual } from 'react-redux';

import { useAppSelector } from 'src/common/hooks';
import { buildInstanceContext } from 'src/utils/instanceContext';
import {
  getOptionLookupKey,
  getRelevantFormDataForOptionSource,
  setupSourceOptions,
} from 'src/utils/options';
import type { IMapping, IOption, IOptionSource } from 'src/types';

import type { IDataSources, IInstanceContext } from 'altinn-shared/types';

interface IUseGetOptionsParams {
  optionsId: string;
  mapping?: IMapping;
  source?: IOptionSource;
}

export const useGetOptions = ({
  optionsId,
  mapping,
  source,
}: IUseGetOptionsParams) => {
  const relevantFormData = useAppSelector(
    (state) =>
      getRelevantFormDataForOptionSource(state.formData.formData, source),
    shallowEqual,
  );
  const instance = useAppSelector((state) => state.instanceData.instance);
  const relevantTextResource = useAppSelector((state) =>
    state.textResources.resources.find((e) => e.id === source?.label),
  );
  const repeatingGroups = useAppSelector(
    (state) => state.formLayout.uiConfig.repeatingGroups,
  );
  const applicationSettings = useAppSelector(
    (state) => state.applicationSettings?.applicationSettings,
  );
  const optionState = useAppSelector((state) => state.optionState.options);
  const [options, setOptions] = useState<IOption[]>(undefined);

  useEffect(() => {
    if (optionsId) {
      setOptions(
        optionState[getOptionLookupKey({ id: optionsId, mapping })]?.options,
      );
    }

    if (!source || !repeatingGroups) {
      return;
    }

    const instanceContext: IInstanceContext = buildInstanceContext(instance);

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
