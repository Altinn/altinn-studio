import { makeStyles } from '@material-ui/core';
import React from 'react';
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
});

interface TopToolbarProps {
  Toolbar: JSX.Element;
  saveAction?: (payload: any) => void;
  language: ILanguage;
}
export function TopToolbar({ Toolbar, saveAction, language }: TopToolbarProps) {
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
    </section>
  );
}

TopToolbar.defaultProps = {
  saveAction: undefined,
};
