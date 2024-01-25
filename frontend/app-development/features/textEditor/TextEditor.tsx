import React from 'react';
import type { LangCode } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl, defaultLangCode } from '@altinn/text-editor';
import { StudioPageSpinner } from '@studio/components';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import { useSearchParams } from 'react-router-dom';
import type { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { useLanguagesQuery, useTextResourcesQuery } from '../../hooks/queries';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
  useTextIdMutation,
  useUpsertTextResourceMutation,
} from '../../hooks/mutations';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const TextEditor = () => {
  const { org, app } = useStudioUrlParams();
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

  const { mutate: deleteLanguageMutation } = useDeleteLanguageMutation(org, app);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);

  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  if (isInitialLoadingLang || !textResources) {
    return <StudioPageSpinner />;
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
