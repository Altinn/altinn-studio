import { makeStyles } from '@material-ui/core';
import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@altinn/altinn-design-system';
import type { ILanguage } from '../types';
import { getTranslation } from '../utils/language';
import { TopToolbarButton } from './TopToolbarButton';

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    background: '#fff',
    padding: 8,
    borderBottom: '1px solid #C9C9C9',
    '& > *': { marginRight: '1rem' },
    '& button': {
      color: '#0062BA',
      transition: 'none',
    },
    '& button[class*="selected"]': {
      color: '#FFF',
    },
    '& button[class*="toggle"]': {
      fontSize: '1em',
      paddingTop: 4,
    },
  },
  saveButton: {
    marginLeft: 'auto',
    marginRight: 10,
  },
});

interface TopToolbarProps {
  Toolbar: JSX.Element;
  editMode: boolean;
  saveAction?: (payload: any) => void;
  toggleEditMode?: (e: any) => void;
  language: ILanguage;
}

export function TopToolbar({ editMode, Toolbar, saveAction, toggleEditMode, language }: TopToolbarProps) {
  const classes = useStyles();
  const t = (key: string) => getTranslation(key, language);

  return (
    <section className={classes.toolbar} role={'toolbar'}>
      {Toolbar}
      <TopToolbarButton
        onClick={saveAction || (() => undefined)}
        disabled={!editMode || !saveAction}
        faIcon='fa fa-floppy'
        iconSize={24}
        className={classes.saveButton}
      >
        {t('save_data_model')}
      </TopToolbarButton>
      {toggleEditMode &&
        <ToggleButtonGroup selectedValue={editMode ? 'edit' : 'view'} onChange={toggleEditMode}>
          <ToggleButton value='view'>{t('view_mode')}</ToggleButton>
          <ToggleButton value='edit'>{t('edit_mode')}</ToggleButton>
        </ToggleButtonGroup>
      }
    </section>
  );
}

TopToolbar.defaultProps = {
  saveAction: undefined,
};
