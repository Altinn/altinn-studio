import React from 'react';
import classes from './RightMenu.module.css';
import type { LangCode } from './types';
import { LanguageSelector } from './LanguageSelector';
import { getLanguageName, languageOptions } from './utils';

import {
  Button,
  ButtonColor,
  ButtonVariant,
  FieldSet,
  RadioButton,
} from '@altinn/altinn-design-system';

export interface RightMenuProps {
  selectedLangCode: string;
  onSelectedLanguageChange: (langCode: LangCode) => void;
  availableLanguageCodes: string[];
  onAddLanguage: (langCode: LangCode) => void;
  onDeleteLanguage: (langCode: LangCode) => void;
}

export const RightMenu = ({
  selectedLangCode,
  onSelectedLanguageChange,
  availableLanguageCodes,
  onAddLanguage,
  onDeleteLanguage,
}: RightMenuProps) => {
  const addLanguageOptions = languageOptions.filter(
    (x) => !availableLanguageCodes.includes(x.value)
  );
  const canDeleteLanguage = availableLanguageCodes.length > 1;
  const handleSelectChange = ({ target }: React.ChangeEvent<HTMLInputElement>) =>
    onSelectedLanguageChange(target.value);

  // TODO: is fetching translations
  return (
    <aside className={classes.RightMenu__sidebar}>
      <div className={classes.RightMenu__verticalContent}>
        <header>
          <div className={classes['LanguageEditor__title-md']}>Språk</div>
        </header>
        <div>
          Vi anbefaler å legge til oversettelser for bokmål, nynorsk og engelsk. Ved behov kan du
          også legge til andre språk.
        </div>
      </div>
      <div className={classes.RightMenu__verticalContent}>
        <FieldSet legend='Aktive språk:'>
          <div className={classes.RightMenu__radioGroup}>
            {availableLanguageCodes?.map((langCode) => (
              <div key={langCode} className={classes.RightMenu__radio}>
                <RadioButton
                  value={langCode}
                  label={getLanguageName({ code: langCode })}
                  name={'activeLanguages'}
                  onChange={handleSelectChange}
                  checked={langCode === selectedLangCode}
                />
                <Button
                  variant={canDeleteLanguage ? ButtonVariant.Filled : ButtonVariant.Outline}
                  data-testid={`delete-${langCode}`}
                  color={ButtonColor.Danger}
                  onClick={() => onDeleteLanguage(langCode)}
                  disabled={!canDeleteLanguage}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </FieldSet>
      </div>
      <div className={classes.RightMenu__verticalContent}>
        <div className={classes['LanguageEditor__title-sm']}>Legg til språk:</div>
        <LanguageSelector onAddLanguage={onAddLanguage} options={addLanguageOptions} />
      </div>
    </aside>
  );
};
