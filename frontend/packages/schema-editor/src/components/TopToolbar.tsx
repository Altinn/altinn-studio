import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@altinn/altinn-design-system';
import classes from './TopToolbar.module.css';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSize } from '@digdir/design-system-react';
import { Settings } from '@navikt/ds-icons';

interface TopToolbarProps {
  Toolbar: JSX.Element;
  editMode: boolean;
  saveAction?: (payload: any) => void;
  toggleEditMode?: (e: any) => void;
}

export function TopToolbar({ editMode, Toolbar, saveAction, toggleEditMode }: TopToolbarProps) {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);

  return (
    <section className={classes.toolbar} role={'toolbar'}>
      {Toolbar}
      <Button
        id='save-model-button'
        size={ButtonSize.Small}
        onClick={saveAction || (() => undefined)}
        disabled={!editMode || !saveAction}
        icon={<Settings />}
      >
        {t('generate_model_files')}
      </Button>
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
