import React, { useState } from 'react';
import classes from './RightMenu.module.css';
import type { LangCode } from './types';
import { LangSelector } from './LangSelector';
import { getLangName, langOptions } from './utils';
import { Button, Checkbox, Fieldset } from '@digdir/design-system-react';
import { defaultLangCode } from './constants';
import { removeItemByValue } from 'app-shared/utils/arrayUtils';
import { useTranslation } from 'react-i18next';
import { AltinnConfirmDialog } from 'app-shared/components';
import * as testids from '../../../testing/testids';

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
      : setSelectedLanguages(removeItemByValue(selectedLanguages, target.name));
  };

  const handleDeleteLanguage = (langCode: LangCode) => {
    setSelectedLanguages(removeItemByValue(selectedLanguages, langCode));
    deleteLanguage(langCode);
  };

  return (
    <aside className={classes.RightMenu__sidebar}>
      <div className={classes.RightMenu__verticalContent}>
        <header>
          <div className={classes['LangEditor__title-md']}>{t('schema_editor.language')}</div>
        </header>
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
                    <AltinnConfirmDialog
                      open={langCode === langCodeToDelete}
                      confirmText={t('schema_editor.language_confirm_deletion')}
                      onConfirm={() => handleDeleteLanguage(langCode)}
                      onClose={() => setLangCodeToDelete(undefined)}
                      trigger={
                        <Button
                          variant={canDeleteLang(langCode) ? 'filled' : 'outline'}
                          data-testid={testids.deleteButton(langCode)}
                          color='danger'
                          onClick={() =>
                            setLangCodeToDelete((prevState) =>
                              prevState === langCode ? undefined : langCode,
                            )
                          }
                          disabled={!canDeleteLang(langCode)}
                          aria-label={t('schema_editor.language_delete_button')}
                          size='small'
                        >
                          {t('schema_editor.language_delete_button')}
                        </Button>
                      }
                    >
                      <p>{t('schema_editor.language_display_confirm_delete')}</p>
                    </AltinnConfirmDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </Fieldset>
      </div>
      <div className={classes.RightMenu__verticalContent}>
        <div className={classes['LangEditor__title-sm']}>
          {t('schema_editor.language_add_language')}
        </div>
        <LangSelector onAddLang={addLanguage} options={addLangOptions} />
      </div>
    </aside>
  );
};
