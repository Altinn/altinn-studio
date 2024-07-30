import React, { useState } from 'react';
import classes from './RightMenu.module.css';
import type { LangCode } from './types';
import { LangSelector } from './LangSelector';
import { getLangName, langOptions } from './utils';
import { Checkbox, Fieldset, Heading } from '@digdir/designsystemet-react';
import { defaultLangCode } from './constants';
import { useTranslation } from 'react-i18next';
import { deleteButtonId } from '@studio/testing/testids';
import { StudioDeleteButton } from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';

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
  const { t } = useTranslation();
  const [langCodeToDelete, setLangCodeToDelete] = useState<string>();

  const handleSelectChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    target.checked
      ? setSelectedLanguages([...selectedLanguages, target.name])
      : setSelectedLanguages(ArrayUtils.removeItemByValue(selectedLanguages, target.name));
  };

  const handleDeleteLanguage = (langCode: LangCode) => {
    setSelectedLanguages(ArrayUtils.removeItemByValue(selectedLanguages, langCode));
    deleteLanguage(langCode);
  };

  return (
    <aside className={classes.RightMenu__sidebar}>
      <div className={classes.RightMenu__verticalContent}>
        <Heading level={2} size='small'>
          {t('schema_editor.language')}
        </Heading>
        <div> {t('schema_editor.language_info_melding')}</div>
      </div>
      <div className={classes.RightMenu__verticalContent}>
        <Fieldset legend={t('schema_editor.active_languages')}>
          <div className={classes.RightMenu__radioGroup}>
            {availableLanguages?.map((langCode) => {
              return (
                <div key={langCode}>
                  <div className={classes.RightMenu__radio}>
                    <Checkbox
                      value={getLangName({ code: langCode })}
                      name={langCode}
                      onChange={handleSelectChange}
                      checked={selectedLanguages.includes(langCode)}
                    >
                      {getLangName({ code: langCode })}
                    </Checkbox>
                    <StudioDeleteButton
                      data-testid={deleteButtonId(langCode)}
                      open={langCode === langCodeToDelete}
                      confirmMessage={t('schema_editor.language_display_confirm_delete')}
                      disabled={!canDeleteLang(langCode)}
                      onDelete={() => handleDeleteLanguage(langCode)}
                      onClick={() =>
                        setLangCodeToDelete((prevState) =>
                          prevState === langCode ? undefined : langCode,
                        )
                      }
                      title={t('general.delete')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Fieldset>
      </div>
      <LangSelector onAddLang={addLanguage} options={addLangOptions} />
    </aside>
  );
};
