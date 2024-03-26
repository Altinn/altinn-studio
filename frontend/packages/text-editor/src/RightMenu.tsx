import React, { useState } from 'react';
import classes from './RightMenu.module.css';
import type { LangCode } from './types';
import { LangSelector } from './LangSelector';
import { getLangName, langOptions } from './utils';
import { Checkbox, Fieldset, Heading } from '@digdir/design-system-react';
import { defaultLangCode } from './constants';
import { useTranslation } from 'react-i18next';
import { AltinnConfirmDialog } from 'app-shared/components';
import * as testids from '../../../testing/testids';
import { StudioButton } from '@studio/components';
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
                    <AltinnConfirmDialog
                      open={langCode === langCodeToDelete}
                      confirmText={t('schema_editor.language_confirm_deletion')}
                      onConfirm={() => handleDeleteLanguage(langCode)}
                      onClose={() => setLangCodeToDelete(undefined)}
                      trigger={
                        <StudioButton
                          variant={canDeleteLang(langCode) ? 'primary' : 'secondary'}
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
                        </StudioButton>
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
      <LangSelector onAddLang={addLanguage} options={addLangOptions} />
    </aside>
  );
};
