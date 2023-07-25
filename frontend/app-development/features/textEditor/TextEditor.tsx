import React, { useEffect, useState } from 'react';
import type { LangCode } from '@altinn/text-editor';
import { TextEditor as TextEditorImpl } from '@altinn/text-editor';
import { PanelVariant, PopoverPanel } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { PageSpinner } from 'app-shared/components';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import classes from './TextEditor.module.css';
import { getLocalStorage, setLocalStorage } from 'app-shared/utils/localStorage';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { useTranslation } from 'react-i18next';
import { useLanguagesQuery, useTextResourcesQuery } from '../../hooks/queries';
import {
  useAddLanguageMutation,
  useDeleteLanguageMutation,
  useTextIdMutation,
  useUpsertTextResourceMutation,
} from '../../hooks/mutations';

const storageGroupName = 'textEditorStorage';

export const TextEditor = () => {
  const [searchParams, setSearchParams] = useSearchParams({ lang: '', search: '' });
  const [selectedLangCodes, setSelectedLangCodes] = useState<LangCode[]>([]);

useEffect(() => {
  const initialSelectedLangCodes = JSON.parse(localStorage.getItem('selectedLanguages')) || [];
  setSelectedLangCodes(initialSelectedLangCodes);
}, []);

useEffect(() => {
  localStorage.setItem('selectedLanguages', JSON.stringify(selectedLangCodes));
}, [selectedLangCodes]);

  const getSearchQuery = () => searchParams.get('search') || '';
  const { org, app } = useParams();

  const { data: appLangCodes } = useLanguagesQuery(org, app);
  const {
    data: textResources,
    isLoading: isInitialLoadingLang,
    isFetching: isFetchingTranslations
  } = useTextResourcesQuery(org, app);

  const setSearchQuery = (search: string) => {
    const params: any = { lang: searchParams.get('lang') };
    if (search.length > 0) {
      params.search = search;
    }
    setSearchParams(params);
  };
  
  const { t } = useTranslation();

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorage(storageGroupName, 'hideTextsIntroPage') ?? false
  );

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

  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorage(storageGroupName, 'hideTextsIntroPage', true));

  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  if (isInitialLoadingLang || isFetchingTranslations || !textResources) {
    return <PageSpinner />;
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
        addLanguage={handleAddLanguage}
        availableLanguages={appLangCodes}
        deleteLanguage={(langCode: LangCode) => deleteLanguageMutation({ langCode })}
        searchQuery={getSearchQuery()}
        selectedLangCodes={selectedLangCodes}
        setSearchQuery={setSearchQuery}
        setSelectedLangCodes={setSelectedLangCodes}
        textResourceFiles={textResources || {}}
        updateTextId={(data: TextResourceIdMutation) => textIdMutation([data])}
        upsertTextResource={upsertTextResource}
      />
    </>
  );
};
