import React from 'react';
import classes from './RightMenu.module.css';
import type { LangCode } from './types';
import { LangSelector } from './LangSelector';
import { getLangName, langOptions } from './utils';

import {
  Button,
  ButtonColor,
  ButtonVariant,
  Checkbox,
  FieldSet,
} from '@digdir/design-system-react';
import { defaultLangCode } from './constants';
import { removeItemByValue } from 'app-shared/utils/arrayUtils';

export interface RightMenuProps {
  addLanguage: (langCode: LangCode) => void;
  availableLanguages: string[];
  deleteLanguage: (langCode: LangCode) => void;
  selectedLanguages: string[];
  setSelectedLanguages: (langCode: LangCode[]) => void;
}

export const RightMenu = ({
  addLanguage,
  availableLanguages,
  deleteLanguage,
  selectedLanguages,
  setSelectedLanguages,
}: RightMenuProps) => {
  const addLangOptions = langOptions.filter((x) => !availableLanguages.includes(x.value));
  const canDeleteLang = (code) => availableLanguages.length > 1 && code !== defaultLangCode;
  const handleSelectChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) =>
    target.checked
      ? setSelectedLanguages([...selectedLanguages, target.name])
      : setSelectedLanguages(removeItemByValue(selectedLanguages, target.name));

  return (
    <aside className={classes.RightMenu__sidebar}>
      <div className={classes.RightMenu__verticalContent}>
        <header>
          <div className={classes['LangEditor__title-md']}>Språk</div>
        </header>
        <div>
          Vi anbefaler å legge til oversettelser for bokmål, nynorsk og engelsk. Ved behov kan du
          også legge til andre språk.
        </div>
      </div>
      <div className={classes.RightMenu__verticalContent}>
        <FieldSet legend='Aktive språk:'>
          <div className={classes.RightMenu__radioGroup}>
            {availableLanguages?.map((langCode) => (
              <div key={langCode} className={classes.RightMenu__radio}>
                <Checkbox
                  label={getLangName({ code: langCode })}
                  name={langCode}
                  onChange={handleSelectChange}
                  checked={selectedLanguages.includes(langCode)}
                />
                <Button
                  variant={canDeleteLang(langCode) ? ButtonVariant.Filled : ButtonVariant.Outline}
                  data-testid={`delete-${langCode}`}
                  color={ButtonColor.Danger}
                  onClick={() => deleteLanguage(langCode)}
                  disabled={!canDeleteLang(langCode)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </FieldSet>
      </div>
      <div className={classes.RightMenu__verticalContent}>
        <div className={classes['LangEditor__title-sm']}>Legg til språk:</div>
        <LangSelector onAddLang={addLanguage} options={addLangOptions} />
      </div>
    </aside>
  );
};
