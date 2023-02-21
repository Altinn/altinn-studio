import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@altinn/altinn-design-system';
import { TopToolbarButton } from './TopToolbarButton';
import classes from './TopToolbar.module.css';
import { useTranslation } from 'react-i18next';

interface TopToolbarProps {
  Toolbar: JSX.Element;
  editMode: boolean;
  saveAction?: (payload: any) => void;
  toggleEditMode?: (e: any) => void;
}

export function TopToolbar({
  editMode,
  Toolbar,
  saveAction,
  toggleEditMode,
}: TopToolbarProps) {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);

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
