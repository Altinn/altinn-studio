import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@altinn/altinn-design-system';
import type { ILanguage } from '../types';
import { getTranslation } from '../utils/language';
import { TopToolbarButton } from './TopToolbarButton';
import classes from './TopToolbar.module.css';

interface TopToolbarProps {
  Toolbar: JSX.Element;
  editMode: boolean;
  saveAction?: (payload: any) => void;
  toggleEditMode?: (e: any) => void;
  language: ILanguage;
}

export function TopToolbar({
  editMode,
  Toolbar,
  saveAction,
  toggleEditMode,
  language,
}: TopToolbarProps) {
  const t = (key: string) => getTranslation(key, language);

  return (
    <section className={classes.toolbar} role={'toolbar'}>
      {Toolbar}
      <TopToolbarButton
        id='save-model-button'
        onClick={saveAction || (() => undefined)}
        disabled={!editMode || !saveAction}
        faIcon='ai ai-document'
        iconSize={24}
        className={classes.saveButton}
      >
        {t('generate_model_files')}
      </TopToolbarButton>
      {toggleEditMode && (
        <ToggleButtonGroup selectedValue={editMode ? 'edit' : 'view'} onChange={toggleEditMode}>
          <ToggleButton value='view'>{t('view_mode')}</ToggleButton>
          <ToggleButton value='edit'>{t('edit_mode')}</ToggleButton>
        </ToggleButtonGroup>
      )}
    </section>
  );
}

TopToolbar.defaultProps = {
  saveAction: undefined,
};
