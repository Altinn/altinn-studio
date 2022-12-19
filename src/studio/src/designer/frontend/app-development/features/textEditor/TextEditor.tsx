import React, { useCallback, useEffect } from 'react';
import type { TextResourceFile, LangCode } from '@altinn/text-editor';
import { AltinnSpinner } from 'app-shared/components';
import { TextEditor } from '@altinn/text-editor';
import { getOrgApp } from '../../common/hooks';
import { useGetLanguagesQuery } from '../../services/languagesApi';
import {
  useGetAppTextsByLangCodeQuery,
  useUpdateTranslationByLangCodeMutation,
  useDeleteByLangCodeMutation,
  useAddByLangCodeMutation,
  useGetAppTextIdsQuery,
} from '../../services/textsApi';
import { useSearchParams } from 'react-router-dom';
import { deepCopy } from 'app-shared/pure';

const defaultLangCode = 'nb';
export const TextEditorImpl = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLangCode = searchParams.get('lang');
  const setSelectedLangCode = useCallback(
    (langCode: string) => setSearchParams({ ...deepCopy(searchParams), lang: langCode }),
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (!searchParams.has('lang')) {
      setSelectedLangCode(defaultLangCode);
    }
  }, [searchParams, setSelectedLangCode]);

  const orgApp = getOrgApp();
  const { data: appLanguageCodes } = useGetLanguagesQuery(orgApp);
  const {
    data: textIds,
    isLoading: isInitialLoadingTextIds,
    isFetching: isFetchingTextIds,
  } = useGetAppTextIdsQuery(orgApp);

  const { data: translations, isFetching: isFetchingTranslations } = useGetAppTextsByLangCodeQuery(
    {
      ...orgApp,
      langCode: selectedLangCode,
    },
    { skip: !selectedLangCode }
  );

  const [updateLanguage] = useUpdateTranslationByLangCodeMutation();
  const [deleteLanguage] = useDeleteByLangCodeMutation();
  const [addLanguage] = useAddByLangCodeMutation();

  const getLangCodesOrDefault = useCallback(
    () => (appLanguageCodes?.length ? appLanguageCodes : [defaultLangCode]),
    [appLanguageCodes]
  );

  React.useEffect(() => {
    setSelectedLangCode(getLangCodesOrDefault()[0]);
  }, [getLangCodesOrDefault]);

  if (isInitialLoadingTextIds) {
    return (
      <div>
        <AltinnSpinner />
      </div>
    );
  }

  const handleSelectedLanguageChange = (langCode: LangCode) => setSelectedLangCode(langCode);

  const handleAddLanguage = (langCode: LangCode) =>
    addLanguage({
      ...orgApp,
      langCode,
    });

  const handleDeleteLanguage = (langCode: LangCode) =>
    deleteLanguage({
      ...orgApp,
      langCode,
    });

  const handleTranslationChange = (translations: TextResourceFile) =>
    updateLanguage({
      ...orgApp,
      langCode: selectedLangCode,
      data: translations,
    });

  return (
    <TextEditor
      fetchedTextIds={textIds}
      selectedLangCode={selectedLangCode}
      availableLanguageCodes={getLangCodesOrDefault()}
      translations={
        translations || {
          language: selectedLangCode,
          resources: [],
        }
      }
      isFetchingTextIds={isFetchingTextIds}
      isFetchingTranslations={isFetchingTranslations}
      onSelectedLanguageChange={handleSelectedLanguageChange}
      onTranslationChange={handleTranslationChange}
      onAddLanguage={handleAddLanguage}
      onDeleteLanguage={handleDeleteLanguage}
    />
  );
};
