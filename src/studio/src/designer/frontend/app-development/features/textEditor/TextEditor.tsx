import React from 'react';

import { TextEditor } from '@altinn/text-editor';
import type { Translations, Language } from '@altinn/text-editor';

import { getOrgApp } from '../../common/hooks';
import {
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
} from '../../services/textsApi';
import { useGetLanguagesQuery } from '../../services/languagesApi';
import { AltinnSpinner } from 'app-shared/components';

export const TextEditorImpl = () => {
  const [selectedLangCode, setSelectedLangCode] = React.useState<string | null>(null);
  const orgApp = getOrgApp();
  const { data: appLanguageCodes, isLoading: isInitialLoadingLangCodes } =
    useGetLanguagesQuery(orgApp);
  const {
    data: translations,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations,
  } = useGetAppTextsByLangCodeQuery(
    {
      ...orgApp,
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
    return (
      <div>
        <AltinnSpinner />
      </div>
    );
  }

  const handleSelectedLanguageChange = ({ value }: Language) => {
    setSelectedLangCode(value);
  };

  const handleTranslationChange = ({ translations }: { translations: Translations }) => {
    updateLanguage({
      ...orgApp,
      langCode: selectedLangCode,
      data: translations,
    });
  };

  const handleAddLanguage = ({ value }: Language) => {
    addLanguage({
      ...orgApp,
      langCode: value,
    });
  };

  const handleDeleteLanguage = ({ value }: Language) => {
    deleteLanguage({
      ...orgApp,
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
