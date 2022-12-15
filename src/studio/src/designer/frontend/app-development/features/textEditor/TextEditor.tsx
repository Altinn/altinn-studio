import React, { useCallback, useEffect, useState } from 'react';
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

  const getLangCodesOrDefault = useCallback(
    () => (appLanguageCodes?.length ? appLanguageCodes : [defaultLangCode]),
    [appLanguageCodes]
  );

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
      selectedLangCode={selectedLangCode}
      availableLanguageCodes={getLangCodesOrDefault()}
      translations={
        translations || {
          language: selectedLangCode,
          resources: [],
        }
      }
      isFetchingTranslations={isFetchingTranslations}
      onSelectedLanguageChange={handleSelectedLanguageChange}
      onTranslationChange={handleTranslationChange}
      onAddLanguage={handleAddLanguage}
      onDeleteLanguage={handleDeleteLanguage}
    />
  );
};
