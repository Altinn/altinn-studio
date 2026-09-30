import { useMemo } from 'react';

import { getLanguageFromCode } from '@app/language';
import type { FixedLanguageList } from '@app/language';

import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useDataModelReaders } from 'src/features/formData/FormDataReaders';
import { useInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { BaseTextResourceVariablesDataSources } from 'src/features/language/useLanguage';

export interface LangDataSources extends BaseTextResourceVariablesDataSources {
  textResources: TextResourceMap;
  selectedLanguage: string;
  language: FixedLanguageList;
}

export function useLangToolsDataSources(): LangDataSources {
  const textResources = useTextResources();
  const selectedAppLanguage = useCurrentLanguage();
  const dataModels = useDataModelReaders();
  const applicationSettings = useApplicationSettings();
  const instanceDataSources = useInstanceDataSources();

  return useMemo(
    () => ({
      textResources,
      language: getLanguageFromCode(selectedAppLanguage),
      selectedLanguage: selectedAppLanguage,
      dataModels,
      applicationSettings,
      instanceDataSources,
      customTextParameters: null,
    }),
    [textResources, selectedAppLanguage, dataModels, applicationSettings, instanceDataSources],
  );
}
