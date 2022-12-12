import React from 'react';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';

import { TextRow } from './TextRow';
import type { Language, Translations } from './types';

import classes from './TextEditor.module.css';
import { getLanguageName, getRandNumber } from './utils';
import { AltinnSpinner } from 'app-shared/components';
import type { RightMenuProps } from './RightMenu';
import { RightMenu } from './RightMenu';

export interface ILanguageEditorProps {
  translations: Translations;
  isFetchingTranslations: boolean;
  onTranslationChange: ({ translations }: { translations: Translations }) => void;
  selectedLangCode: string;
  onSelectedLanguageChange: (v: Language) => void;
  availableLanguageCodes: string[];
  onAddLanguage: (v: Language) => void;
  onDeleteLanguage: (v: Language) => void;
}

export const TextEditor = ({
  translations,
  selectedLangCode,
  onTranslationChange,
  isFetchingTranslations,
  onSelectedLanguageChange,
  availableLanguageCodes,
  onAddLanguage,
  onDeleteLanguage,
}: ILanguageEditorProps) => {
  const rightMenuProps: RightMenuProps = {
    selectedLangCode,
    onSelectedLanguageChange,
    availableLanguageCodes,
    onAddLanguage,
    onDeleteLanguage,
  };
  const handleIdChange = ({ oldValue, newValue }: { oldValue: string; newValue: string }) => {
    if (oldValue === newValue) {
      return;
    }
    // TODO: Ensure index does not change, to avoid it looking like the row disappears
    const updatedLanguage = { ...translations };
    updatedLanguage[newValue] = updatedLanguage[oldValue];
    delete updatedLanguage[oldValue];

    onTranslationChange({ translations: updatedLanguage });
  };

  const languageName = getLanguageName({ code: selectedLangCode });

  const handleValueChange = ({
    newValue,
    translationKey,
  }: {
    newValue: string;
    translationKey: string;
  }) => {
    const updatedLanguage = {
      ...translations,
      [translationKey]: newValue,
    };

    onTranslationChange({ translations: updatedLanguage });
  };
  const handleAddNewEntryClick = () => {
    const updatedLanguage = {
      [`id_${getRandNumber()}`]: '',
      ...translations,
    };

    onTranslationChange({ translations: updatedLanguage });
  };

  // TODO: is fetching keys NOT TRANSLATIONS
  return (
    <div className={classes.TextEditor}>
      <div className={classes.TextEditor__body}>
        {isFetchingTranslations ? (
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
            {translations &&
              Object.keys(translations).map((translationKey) => (
                <TextRow
                  key={`${selectedLangCode}.${translationKey}`}
                  languageName={languageName}
                  langCode={selectedLangCode}
                  translationKey={translationKey}
                  translations={translations}
                  onIdChange={handleIdChange}
                  onValueChange={handleValueChange}
                  onTranslationChange={onTranslationChange}
                />
              ))}
          </>
        )}
      </div>
      <RightMenu {...rightMenuProps} />
    </div>
  );
};
