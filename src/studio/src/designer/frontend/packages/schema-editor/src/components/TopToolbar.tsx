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
      '&:last-child': {
        marginLeft: 'auto',
        marginRight: 0
      }
    },
  },
  switchLabel: {
    fontSize: '16px',
  },
  switchLabelRoot: {
    marginLeft: '0',
  },
  switchInput: {
    fontSize: '16px',
    marginTop: '10px',
  },
  switch: {
    background: 'none',
    marginLeft: 24,
    '&:hover': {
      border: '2px solid #008FD6',
    }
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

  return (
    <section className={classes.toolbar} role={'toolbar'}>
      {Toolbar}
      <TopToolbarButton
        onClick={saveAction || (() => undefined)}
        disabled={!saveAction}
        faIcon='fa fa-floppy'
        iconSize={24}
      >
        {getTranslation('save_data_model', language)}
      </TopToolbarButton>
      {toggleEditMode &&
        <ToggleButtonGroup selectedValue={editMode ? 'edit' : 'view'} onChange={toggleEditMode}>
          <ToggleButton value='view'>View</ToggleButton>
          <ToggleButton value='edit'>Edit</ToggleButton>
        </ToggleButtonGroup>
      }
    </section>
  );
}

TopToolbar.defaultProps = {
  saveAction: undefined,
};
