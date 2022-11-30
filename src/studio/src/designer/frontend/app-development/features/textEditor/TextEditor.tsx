import React from 'react';

import { TextEditor } from '@altinn/text-editor';
import type { Translations, Language } from '@altinn/text-editor';

import { getProjectParams } from '../../common/hooks/getProjectParams';
import {
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
} from '../../services/textsApi';
import { useGetLanguagesQuery } from '../../services/languagesApi';

export const TextEditorImpl = () => {
  const [selectedLangCode, setSelectedLangCode] = React.useState<string | null>(null);
  const project = getProjectParams();
  const { data: appLanguageCodes, isLoading: isInitialLoadingLangCodes } = useGetLanguagesQuery(project);
  const {
    data: translations,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations,
  } = useGetAppTextsByLangCodeQuery(
    {
      ...project,
      langCode: selectedLangCode,
    },
    { skip: !selectedLangCode }
  );

  React.useEffect(() => {
    if (!isInitialLoadingLangCodes) {
      setSelectedLangCode(appLanguageCodes[0]);
    }
  }, [appLanguageCodes, isInitialLoadingLangCodes]);

  const [updateLanguage] = useUpdateTranslationByLangCodeMutation();
  const [deleteLanguage] = useDeleteByLangCodeMutation();
  const [addLanguage] = useAddByLangCodeMutation();

  if (isInitialLoadingLang || isInitialLoadingLangCodes) {
    // TODO: apply nicer loading UI
    return <div>Loading</div>;
  }

  const handleSelectedLanguageChange = ({ value }: Language) => {
    setSelectedLangCode(value);
  };

  const handleTranslationChange = ({ translations }: { translations: Translations }) => {
    updateLanguage({
      ...project,
      langCode: selectedLangCode,
      data: translations,
    });
  };

  const handleAddLanguage = ({ value }: Language) => {
    addLanguage({
      ...project,
      langCode: value,
    });
  };

  const handleDeleteLanguage = ({ value }: Language) => {
    deleteLanguage({
      ...project,
      langCode: value,
    });
  };

  return (
    <TextEditor
      selectedLangCode={selectedLangCode}
      availableLanguageCodes={appLanguageCodes}
      translations={translations}
      isFetchingTranslations={isFetchingTranslations}
      onSelectedLanguageChange={handleSelectedLanguageChange}
      onTranslationChange={handleTranslationChange}
      onAddLanguage={handleAddLanguage}
      onDeleteLanguage={handleDeleteLanguage}
    />
  );
};
