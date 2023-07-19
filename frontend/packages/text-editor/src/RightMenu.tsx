import React, { useState } from 'react';
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
  Popover,
  PopoverVariant,
} from '@digdir/design-system-react';
import { defaultLangCode } from './constants';
import { removeItemByValue } from 'app-shared/utils/arrayUtils';
import { useTranslation } from 'react-i18next';

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
  const [langCodeToDelete, setLangCodeToDelete] = useState<LangCode>();

  const handleSelectChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) =>
    target.checked
      ? setSelectedLanguages([...selectedLanguages, target.name])
      : setSelectedLanguages(removeItemByValue(selectedLanguages, target.name));

  const handleDeleteLanguage = (langCode: LangCode) => {
    if (langCodeToDelete === langCode) {
      setSelectedLanguages(removeItemByValue(selectedLanguages, langCode));
      deleteLanguage(langCode);
    }
    setLangCodeToDelete(null);
  };
  const toggleConfirmDeletePopover = (langCode: LangCode) => {
    setLangCodeToDelete((prevState) => (prevState === langCode ? null : langCode));
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
                <Popover
                  title={'delete'}
                  variant={PopoverVariant.Warning}
                  placement={'left'}
                  open={langCodeToDelete === langCode || false}
                  trigger={
                    <Button
                      variant={
                        canDeleteLang(langCode) ? ButtonVariant.Filled : ButtonVariant.Outline
                      }
                      data-testid={`delete-${langCode}`}
                      color={ButtonColor.Danger}
                      onClick={() => toggleConfirmDeletePopover(langCode)}
                      disabled={!canDeleteLang(langCode)}
                      aria-label={t('schema_editor.language_delete_button')}
                    >
                      {t('schema_editor.language_delete_button')}
                    </Button>
                  }
                >
                  {langCodeToDelete === langCode && (
                    <div>
                      {t('schema_editor.language_display_confirm_delete')}
                      <div className={classes.popoverButtons}>
                        <Button
                          onClick={() => handleDeleteLanguage(langCode)}
                          color={ButtonColor.Danger}
                        >
                          {t('schema_editor.language_confirm_deletion')}
                        </Button>
                        <Button
                          variant={ButtonVariant.Quiet}
                          onClick={() => toggleConfirmDeletePopover(langCode)}
                          color={ButtonColor.Secondary}
                        >
                          {t('schema_editor.textRow-cancel-popover')}
                        </Button>
                      </div>
                    </div>
                  )}
                </Popover>
              </div>
            ))}
          </div>
        </FieldSet>
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
