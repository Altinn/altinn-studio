import React from 'react';
import type { LangCode } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl, defaultLangCode } from '@altinn/text-editor';
import { StudioPageSpinner } from '@studio/components';
import { useLocalStorage } from '@studio/components/src/hooks/useLocalStorage';
import { useSearchParams } from 'react-router-dom';
import type { TextResourceIdMutation } from '@altinn/text-editor/types';
import { useLanguagesQuery, useTextResourcesQuery } from '../../hooks/queries';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
  useTextIdMutation,
} from '../../hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

export const TextEditor = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const [searchParams, setSearchParams] = useSearchParams({ lang: '', search: '' });

  const selectedLanguagesStorageKey = `${org}:${app}:selectedLanguages`;
  const [selectedLangCodes, setSelectedLangCodes] = useLocalStorage<string[]>(
    selectedLanguagesStorageKey,
    [defaultLangCode],
  );
  const getSearchQuery = () => searchParams.get('search') || '';

  const { data: appLangCodes } = useLanguagesQuery(org, app);
  const { data: textResources, isPending: isInitialLoadingLang } = useTextResourcesQuery(org, app);

  const setSearchQuery = (search: string) => {
    setSearchParams(search.length > 0 ? { search } : {});
  };

  const { mutate: addLanguageMutation } = useAddLanguageMutation(org, app);
  const handleAddLanguage = (language: LangCode) =>
    addLanguageMutation({
      language,
      resources: Object.values(textResources)[0].map(({ id, value }) => ({
        id,
        value: ['appName', 'ServiceName'].includes(id) ? value : '',
      })),
    });

  const notCoveredFunction = () => {
    if (true) {
      handleAddLanguage('norsk');
    }
    console.log('wow');
  };
  const coveredFunction = () => {
    console.log('covered');
    setSearchQuery('search');
  };
  coveredFunction();

  const { mutate: deleteLanguageMutation } = useDeleteLanguageMutation(org, app);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);

  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  if (isInitialLoadingLang || !textResources) {
    return <StudioPageSpinner spinnerTitle={t('text_editor.loading_page')} />;
  }

  return (
    <TextEditorImpl
      addLanguage={handleAddLanguage}
      availableLanguages={appLangCodes}
      deleteLanguage={(langCode: LangCode) => deleteLanguageMutation({ langCode })}
      searchQuery={getSearchQuery()}
      selectedLangCodes={selectedLangCodes}
      setSearchQuery={setSearchQuery}
      setSelectedLangCodes={setSelectedLangCodes}
      textResourceFiles={textResources}
      updateTextId={(data: TextResourceIdMutation) => textIdMutation([data])}
      upsertTextResource={upsertTextResource}
    />
  );
};
