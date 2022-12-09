import React, { useState } from 'react';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';

import type { Language, Translations } from './types';

import classes from './TextEditor.module.css';
import { getLanguageName, getRandNumber } from './utils';
import { AltinnSpinner } from 'app-shared/components';
import type { RightMenuProps } from './RightMenu';
import { RightMenu } from './RightMenu';
import { TextList } from './TextList';

export interface ILanguageEditorProps {
  fetchedTextIds?: string[];
  fetchedTranslations?: Translations;
  isFetchingTextIds: boolean;
  isFetchingTranslations: boolean;
  onTranslationChange: ({ translations }: { translations: Translations }) => void;
  selectedLangCode: string;
  onSelectedLanguageChange: (v: Language) => void;
  availableLanguageCodes: string[];
  onAddLanguage: (v: Language) => void;
  onDeleteLanguage: (v: Language) => void;
}

export const TextEditor = ({
  fetchedTextIds,
  fetchedTranslations,
  selectedLangCode,
  onTranslationChange,
  isFetchingTextIds,
  onSelectedLanguageChange,
  availableLanguageCodes,
  onAddLanguage,
  onDeleteLanguage,
}: ILanguageEditorProps) => {
  const [textIds, setTextIds] = useState<string[]>(fetchedTextIds || []);
  const [translations] = useState<Translations>(fetchedTranslations || {});
  const rightMenuProps: RightMenuProps = {
    selectedLangCode,
    onSelectedLanguageChange,
    availableLanguageCodes,
    onAddLanguage,
    onDeleteLanguage,
  };
  const handleTextIdChange = ({ oldValue, newValue }: { oldValue: string; newValue: string }) => {
    if (oldValue === newValue) {
      return;
    }
    const updatedLanguage = { ...translations };
    updatedLanguage[newValue] = updatedLanguage[oldValue];
    delete updatedLanguage[oldValue];
    onTranslationChange({ translations: updatedLanguage });
    const renamedIds = [...textIds];
    renamedIds.splice(
      textIds.findIndex((v) => v === oldValue),
      1,
      newValue
    );
    setTextIds(renamedIds);
  };

  const languageName = getLanguageName({ code: selectedLangCode });

  const handleTranslationChange = ({ newValue, textId }: { newValue: string; textId: string }) => {
    const updatedLanguage = {
      ...translations,
    };
    updatedLanguage[textId] = newValue;

    onTranslationChange({ translations: updatedLanguage });
  };
  const handleAddNewEntryClick = () => {
    const newId = getRandNumber();
    const newIdList = [`id_${newId}`, ...textIds];
    setTextIds(newIdList);
  };

  const handleDeleteText = (textId: string) => {
    // TODO: do api call to delete text here
    const renamedIds = [...textIds];
    renamedIds.splice(
      textIds.findIndex((v) => v === textId),
      1
    );
    setTextIds(renamedIds);
  };

  return (
    <div className={classes.TextEditor}>
      <div className={classes.TextEditor__body}>
        {isFetchingTextIds ? (
          <div>
            <AltinnSpinner />
          </div>
        ) : (
          <>
            <div className={classes.TextEditor__topRow}>
              <Button
                variant={ButtonVariant.Filled}
                color={ButtonColor.Primary}
                onClick={handleAddNewEntryClick}
              >
                Ny tekst
              </Button>
            </div>
            <TextList
              textIds={textIds}
              languageName={languageName}
              langCode={selectedLangCode}
              translations={translations}
              onTextIdChange={handleTextIdChange}
              onValueChange={handleTranslationChange}
              onDeleteText={handleDeleteText}
            />
          </>
        )}
      </div>
      <RightMenu {...rightMenuProps} />
    </div>
  );
};
