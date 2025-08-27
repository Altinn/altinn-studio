import React, { useEffect, useMemo, useRef, useState } from 'react';
import classes from './TextEditor.module.css';
import type { LangCode, TextResourceEntryDeletion, TextResourceIdMutation } from './types';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { Chip } from '@digdir/designsystemet-react';
import { ArrowsUpDownIcon } from 'libs/studio-icons/src';
import { StudioButton } from '@studio/components-legacy';
import { StudioSearch } from '@studio/components';
import { RightMenu } from './RightMenu';
import { getRandNumber, mapResourceFilesToTableRows } from './utils';
import { defaultLangCode } from './constants';
import { TextList } from './TextList';
import ISO6391 from 'iso-639-1';
import type { ITextResources } from 'app-shared/types/global';
import { useTranslation } from 'react-i18next';

export interface TextEditorProps {
  addLanguage: (language: LangCode) => void;
  availableLanguages: string[];
  deleteLanguage: (language: LangCode) => void;
  searchQuery: string;
  selectedLangCodes: LangCode[];
  setSearchQuery: (searchQuery: string) => void;
  setSelectedLangCodes: (language: LangCode[]) => void;
  textResourceFiles: ITextResources;
  updateTextId: (data: TextResourceIdMutation) => void;
  upsertTextResource: (data: UpsertTextResourceMutation) => void;
}

export const TextEditor = ({
  addLanguage,
  availableLanguages,
  deleteLanguage,
  searchQuery,
  selectedLangCodes,
  setSearchQuery,
  setSelectedLangCodes,
  textResourceFiles,
  updateTextId,
  upsertTextResource,
}: TextEditorProps) => {
  const { t } = useTranslation();
  const [sortTextsAlphabetically, setSortTextsAlphabetically] = useState<boolean>(false);
  const resourceRows = mapResourceFilesToTableRows(textResourceFiles, sortTextsAlphabetically);
  const previousSelectedLanguages = useRef<string[]>([]);

  const availableLangCodesFiltered = useMemo(
    () => availableLanguages?.filter((code) => ISO6391.validate(code)),
    [availableLanguages],
  );

  useEffect(() => {
    const addedLanguage = selectedLangCodes.find(
      (lang) => !previousSelectedLanguages.current.includes(lang),
    );

    if (addedLanguage) {
      const elementToFocus: HTMLElement = document.getElementById('header-lang' + addedLanguage);
      if (elementToFocus) {
        elementToFocus.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
    previousSelectedLanguages.current = selectedLangCodes;
  }, [selectedLangCodes.length, selectedLangCodes]);

  const handleAddNewEntryClick = () => {
    const textId = `id_${getRandNumber()}`;
    availableLangCodesFiltered.forEach((language) =>
      upsertTextResource({ language, textId, translation: '' }),
    );
    setSearchQuery('');
  };

  const removeEntry = ({ textId }: TextResourceEntryDeletion) => {
    try {
      updateTextId({ oldId: textId });
    } catch (e: unknown) {
      console.error('Deleting text failed:\n', e);
    }
  };

  const updateEntryId = ({ oldId, newId }: TextResourceIdMutation) => {
    try {
      updateTextId({ oldId, newId });
    } catch (e: unknown) {
      console.error('Renaming text-id failed:\n', e);
    }
  };
  const handleSearchChange = (event: any) => setSearchQuery(event.target.value);

  return (
    <div className={classes.textEditor}>
      <div className={classes.textEditorMain}>
        <div className={classes.textEditorTopRow}>
          <StudioButton variant='primary' color='first' onClick={handleAddNewEntryClick}>
            {t('text_editor.new_text')}
          </StudioButton>
          <div className={classes.filterAndSearch}>
            <Chip.Toggle
              size='small'
              onClick={() => setSortTextsAlphabetically(!sortTextsAlphabetically)}
              selected={sortTextsAlphabetically}
            >
              {
                <div className={classes.sortAlphabetically}>
                  {t('text_editor.sort_alphabetically')}
                  <ArrowsUpDownIcon />
                </div>
              }
            </Chip.Toggle>
            <StudioSearch
              className={classes.search}
              label={t('text_editor.search_for_text')}
              value={searchQuery}
              onChange={handleSearchChange}
              clearButtonLabel={t('general.search_clear_button_title')}
            />
          </div>
        </div>
        <div className={classes.textEditorBody}>
          <TextList
            removeEntry={removeEntry}
            resourceRows={resourceRows}
            searchQuery={searchQuery}
            updateEntryId={updateEntryId}
            upsertTextResource={upsertTextResource}
            selectedLanguages={selectedLangCodes}
          />
        </div>
      </div>
      <RightMenu
        addLanguage={addLanguage}
        availableLanguages={availableLangCodesFiltered || [defaultLangCode]}
        deleteLanguage={deleteLanguage}
        selectedLanguages={selectedLangCodes}
        setSelectedLanguages={setSelectedLangCodes}
      />
    </div>
  );
};
