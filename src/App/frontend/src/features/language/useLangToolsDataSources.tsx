import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useDataModelReaders } from 'src/features/formData/FormDataReaders';
import { useInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { getLanguageFromCode } from 'src/language/languages';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { TextResourceVariablesDataSources } from 'src/features/language/useLanguage';
import type { FixedLanguageList } from 'src/language/languages';

export type LimitedTextResourceVariablesDataSources = Omit<
  TextResourceVariablesDataSources,
  'node' | 'defaultDataType' | 'formDataTypes' | 'formDataSelector' | 'transposeSelector'
>;
export interface LangDataSources extends LimitedTextResourceVariablesDataSources {
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

  return {
    textResources,
    language: getLanguageFromCode(selectedAppLanguage),
    selectedLanguage: selectedAppLanguage,
    dataModels,
    applicationSettings,
    instanceDataSources,
    customTextParameters: null,
  };
}
