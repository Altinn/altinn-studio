import React from 'react';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';

import { TextRow } from './TextRow';
import type { Language, Translations } from './types';

import classes from './TextEditor.module.css';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import { getLanguageName, getRandNumber, languageOptions } from './utils';
import { LanguageSelector } from './LanguageSelector';
import { AltinnSpinner } from 'app-shared/components';

export interface ILanguageEditorProps {
  availableLanguageCodes: string[];
  selectedLangCode: string;
  translations: Translations;
  isFetchingTranslations: boolean;
  onTranslationChange: ({ translations }: { translations: Translations }) => void;
  onAddLanguage: (v: Language) => void;
  onDeleteLanguage: (v: Language) => void;
  onSelectedLanguageChange: (v: Language) => void;
}

export const TextEditor = ({
  availableLanguageCodes,
  translations,
  selectedLangCode,
  onAddLanguage,
  onTranslationChange,
  onSelectedLanguageChange,
  onDeleteLanguage,
  isFetchingTranslations,
}: ILanguageEditorProps) => {
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
    };
    updatedLanguage[translationKey] = newValue;

    onTranslationChange({ translations: updatedLanguage });
  };
  const handleSelectChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = target;
    onSelectedLanguageChange({ value });
  };
  const handleAddNewEntryClick = () => {
    const newId = getRandNumber();
    const updatedLanguage = {
      [`id_${newId}`]: '',
      ...translations,
    };

    onTranslationChange({ translations: updatedLanguage });
  };

  const addLanguageOptions = languageOptions.filter(
    (x) => !availableLanguageCodes.includes(x.value)
  );

  return (
    <div className={classes.LanguageEditor}>
      <div className={classes.LanguageEditor__body}>
        {isFetchingTranslations ? (
          <div>
            <AltinnSpinner />
          </div>
        ) : (
          <>
            <div className={classes.LanguageEditor__topRow}>
              <Button
                variant={ButtonVariant.Filled}
                color={ButtonColor.Primary}
                onClick={handleAddNewEntryClick}
              >
                Ny tekst
              </Button>
            </div>
            {translations &&
              Object.keys(translations).map((translationKey) => {
                return (
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
                );
              })}
          </>
        )}
      </div>
      <aside className={classes.LanguageEditor__sidebar}>
        <div className={classes.LanguageEditor__verticalContent}>
          <header>
            <div className={classes['LanguageEditor__title-md']}>Språk</div>
          </header>
          <div>
            Vi anbefaler å legge til oversettelser for bokmål, nynorsk og engelsk. Ved behov kan du
            også legge til andre språk.
          </div>
        </div>
        <div className={classes.LanguageEditor__verticalContent}>
          <div className={classes['LanguageEditor__title-sm']}>Aktive språk:</div>
          <AltinnRadioGroup value={selectedLangCode} className={classes.LanguageEditor__radioGroup}>
            {availableLanguageCodes?.map((value) => {
              const handleDeleteLangClick = () => {
                onDeleteLanguage({ value });
              };
              const name = getLanguageName({ code: value });

              return (
                <div key={value} className={classes.LanguageEditor__radio}>
                  <AltinnRadio value={value} label={name} onChange={handleSelectChange} />
                  <Button
                    data-testid={`delete-${value}`}
                    variant={ButtonVariant.Outline}
                    color={ButtonColor.Danger}
                    onClick={handleDeleteLangClick}
                  >
                    Delete
                  </Button>
                </div>
              );
            })}
          </AltinnRadioGroup>
        </div>
        <div className={classes.LanguageEditor__verticalContent}>
          <div className={classes['LanguageEditor__title-sm']}>Legg til språk:</div>
          <LanguageSelector onAddLanguage={onAddLanguage} options={addLanguageOptions} />
        </div>
      </aside>
    </div>
  );
};
