import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useDataModelReaders } from 'src/features/formData/FormDataReaders';
import { useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useLangToolsDataSources, useSetLangToolsDataSources } from 'src/features/language/LangToolsStore';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { getLanguageFromCode } from 'src/language/languages';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { TextResourceVariablesDataSources } from 'src/features/language/useLanguage';
import type { ILanguage } from 'src/types/shared';

export interface LangDataSources
  extends Omit<TextResourceVariablesDataSources, 'node' | 'currentDataModel' | 'currentDataModelName'> {
  textResources: TextResourceMap;
  selectedLanguage: string;
  language: ILanguage;
}

const emptyObject = {};

export const LangDataSourcesProvider = ({ children }: PropsWithChildren) => {
  const textResources = useTextResources();
  const selectedAppLanguage = useCurrentLanguage();
  const dataModels = useDataModelReaders();
  const _applicationSettings = useLaxApplicationSettings();
  const applicationSettings = _applicationSettings === ContextNotProvided ? emptyObject : _applicationSettings;
  const instanceDataSources = useLaxInstanceDataSources();
  const setDataSources = useSetLangToolsDataSources();

  // This LangDataSourcesProvider is re-rendered very often, and will always 'move' around in the DOM tree wherever
  // RenderStart is rendered. This means that we cannot rely on the memoization of the data sources, as the hooks
  // will all run as if they were new hooks. That's why we take extra care to only update the data sources if
  // something has changed.
  useEffect(() => {
    setDataSources((prev) => {
      if (
        prev?.selectedLanguage === selectedAppLanguage &&
        prev?.textResources === textResources &&
        prev?.dataModels === dataModels &&
        prev?.applicationSettings === applicationSettings &&
        prev?.instanceDataSources === instanceDataSources
      ) {
        return prev;
      }

      return {
        textResources,
        language: getLanguageFromCode(selectedAppLanguage),
        selectedLanguage: selectedAppLanguage,
        dataModels,
        applicationSettings,
        instanceDataSources,
      };
    });
  }, [textResources, selectedAppLanguage, dataModels, applicationSettings, instanceDataSources, setDataSources]);

  const current = useLangToolsDataSources();
  if (!current) {
    // We cannot render <Loader /> here, as that would lead to an infinite loop
    return null;
  }

  return <>{children}</>;
};
