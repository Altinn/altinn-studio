import React from 'react';
import classes from './RightMenu.module.css';
import type { LangCode } from './types';
import { LangSelector } from './LangSelector';
import { getLangName, langOptions } from './utils';

import {
  Button,
  ButtonColor,
  ButtonVariant,
  FieldSet,
  RadioButton,
} from '@altinn/altinn-design-system';
import { defaultLangCode } from './constants';

export interface RightMenuProps {
  selectedLangCode: string;
  onSelectedLangChange: (langCode: LangCode) => void;
  availableLangCodes: string[];
  onAddLang: (langCode: LangCode) => void;
  onDeleteLang: (langCode: LangCode) => void;
}

export const RightMenu = ({
  selectedLangCode,
  onSelectedLangChange,
  availableLangCodes,
  onAddLang,
  onDeleteLang,
}: RightMenuProps) => {
  const addLangOptions = langOptions.filter((x) => !availableLangCodes.includes(x.value));
  const canDeleteLang = (code) => availableLangCodes.length > 1 && code !== defaultLangCode;
  const handleSelectChange = ({ target }: React.ChangeEvent<HTMLInputElement>) =>
    onSelectedLangChange(target.value);

  // TODO: is fetching translations
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
            {availableLangCodes?.map((langCode) => (
              <div key={langCode} className={classes.RightMenu__radio}>
                <RadioButton
                  value={langCode}
                  label={getLangName({ code: langCode })}
                  name={'activeLangs'}
                  onChange={handleSelectChange}
                  checked={langCode === selectedLangCode}
                />
                <Button
                  variant={canDeleteLang(langCode) ? ButtonVariant.Filled : ButtonVariant.Outline}
                  data-testid={`delete-${langCode}`}
                  color={ButtonColor.Danger}
                  onClick={() => onDeleteLang(langCode)}
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
        <LangSelector onAddLang={onAddLang} options={addLangOptions} />
      </div>
    </aside>
  );
};
