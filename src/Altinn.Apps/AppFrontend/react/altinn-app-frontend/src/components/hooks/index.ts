import type { IInstanceContext, IDataSources } from "altinn-shared/types";
import { replaceTextResourceParams } from "altinn-shared/utils";
import { buildInstanceContext } from "altinn-shared/utils/instanceContext";
import { useState, useEffect } from "react";
import { shallowEqual } from "react-redux";
import { useAppSelector } from "src/common/hooks";
import type { IMapping, IOptionSource, IOption } from "src/types";
import { getOptionLookupKey, getRelevantFormDataForOptionSource, replaceOptionDataField } from "src/utils/options";

interface IUseGetOptionsParams {
  optionsId: string;
  mapping?: IMapping;
  source?: IOptionSource;
}

export const useGetOptions = ({ optionsId, mapping, source }: IUseGetOptionsParams) => {
  const relevantFormData = useAppSelector(state => getRelevantFormDataForOptionSource(state.formData.formData, source), shallowEqual);
  const instance = useAppSelector(state => state.instanceData.instance);
  const relevantTextResource = useAppSelector(state => state.textResources.resources.find((e => e.id === source?.label)));
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
      dataModel: relevantFormData,
      applicationSettings: applicationSettings,
      instanceContext: instanceContext
    };

    const replacedOptionLabels =
      replaceTextResourceParams([relevantTextResource], dataSources, repeatingGroups);

    const repGroup = Object.values(repeatingGroups).find((group) => {
      return group.dataModelBinding === source.group;
    });


    const newOptions: IOption[] = [];
    for (let i = 0; i <= repGroup.index; i++) {
      const option: IOption = {
        label: replacedOptionLabels[i + 1].value,
        value: replaceOptionDataField(relevantFormData, source.value, i),
      };
      newOptions.push(option);
    }

    setOptions(newOptions);

  }, [applicationSettings, relevantFormData, instance, mapping, optionState, optionsId, repeatingGroups, source, relevantTextResource]);

  return options;
}
