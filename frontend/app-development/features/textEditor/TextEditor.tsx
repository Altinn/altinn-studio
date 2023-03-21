import React, { useEffect, useState } from 'react';
import type { LangCode, TextResourceFile } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl, defaultLangCode } from '@altinn/text-editor';
import { PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { AltinnSpinner } from 'app-shared/components';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import classes from './TextEditor.module.css';
import { getLocalStorage, setLocalStorage } from 'app-shared/utils/localStorage';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { useTranslation } from 'react-i18next';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
  useTextIdMutation,
  useTextLanguages,
  useTextResources,
  useTranslationByLangCodeMutation,
} from '../../query-hooks/text';

const storageGroupName = 'textEditorStorage';
export const TextEditor = () => {
  const [searchParams, setSearchParams] = useSearchParams({ lang: defaultLangCode });
  const selectedLangCode = searchParams.get('lang');
  const getSearchQuery = () => searchParams.get('search') || '';
  const { org, app } = useParams();
  const { data: appLangCodes } = useTextLanguages(org, app);

  const setSelectedLangCode = (lang: string) => {
    const params: any = { lang };
    if (getSearchQuery().length > 0) {
      params.search = getSearchQuery();
    }
    setSearchParams(params);
  };
  const setSearchQuery = (search: string) => {
    const params: any = { lang: selectedLangCode };
    if (search.length > 0) {
      params.search = search;
    }
    setSearchParams(params);
  };

  const {
    data: translations,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations,
    refetch: refetchTextLang,
  } = useTextResources(org, app, selectedLangCode);

  const { t } = useTranslation();

  /*
   * Temporary fix to make sure to have the latest text-resources fetched.
   * This issue will be fixed when we have implemented React Query with shared state/cache
   */
  useEffect(() => {
    refetchTextLang().then();
  }, [refetchTextLang]);

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorage(storageGroupName, 'hideTextsIntroPage') ?? false
  );

  const { mutate: addLanguageMutation } = useAddLanguageMutation(org, app);
  const handleAddLanguage = (langCode: LangCode) =>
    addLanguageMutation({
      langCode,
      resources: translations.resources.map(({ id, value }) => ({
        id,
        value: ['appName', 'ServiceName'].includes(id) ? value : '',
      })),
    });

  const { mutate: deleteLanguageMutation } = useDeleteLanguageMutation(org, app);
  const handleDeleteLanguage = (langCode: LangCode) => deleteLanguageMutation({ langCode });

  const { mutate: transMutation } = useTranslationByLangCodeMutation(org, app, selectedLangCode);
  const handleTranslationChange = (data: TextResourceFile) => transMutation(data);

  const { mutate: textIdMutation } = useTextIdMutation(org, app);
  const handleTextIdChange = (data: TextResourceIdMutation) => textIdMutation([data]);

  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorage(storageGroupName, 'hideTextsIntroPage', true));

  if (isInitialLoadingLang) {
    return <AltinnSpinner />;
  }
  return (
    <>
      <PopoverPanel
        forceMobileLayout={true}
        variant={PanelVariant.Info}
        open={!hideIntroPage}
        side={'bottom'}
        title={t('text_editor.info_dialog_title')}
        trigger={<span className={'sr-only'} />}
        onOpenChange={() => setHideIntroPage(!hideIntroPage)}
      >
        <p>{t('text_editor.info_dialog_1')}</p>
        <p>
          <Link target={'_blank'} to={`/../designer/${org}/${app}/Text`} relative={'path'}>
            {t('text_editor.info_dialog_nav_to_old')}
          </Link>
        </p>
        <span className={classes.buttons}>
          <Button
            color={ButtonColor.Primary}
            onClick={() => setHideIntroPage(true)}
            variant={ButtonVariant.Outline}
          >
            {t('general.close')}
          </Button>
          <Button
            color={ButtonColor.Secondary}
            onClick={handleHideIntroPageButtonClick}
            variant={ButtonVariant.Outline}
          >
            {t('general.do_not_show_anymore')}
          </Button>
        </span>
      </PopoverPanel>
      <TextEditorImpl
        selectedLangCode={selectedLangCode}
        searchQuery={getSearchQuery()}
        setSelectedLangCode={setSelectedLangCode}
        setSearchQuery={setSearchQuery}
        availableLangCodes={appLangCodes}
        translations={
          translations || {
            language: selectedLangCode,
            resources: [],
          }
        }
        isFetchingTranslations={isFetchingTranslations}
        onTranslationChange={handleTranslationChange}
        onTextIdChange={handleTextIdChange}
        onAddLang={handleAddLanguage}
        onDeleteLang={handleDeleteLanguage}
      />
    </>
  );
};
