import { makeStyles } from '@material-ui/core';
import { AiOutlineSave } from 'react-icons/ai';
import * as React from 'react';
import { ILanguage } from '../types';
import { getTranslation } from '../utils';
import TopToolbarButton from './TopToolbarButton';

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    background: '#fff',
    padding: 8,
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
    '& > button:last-child': {
      marginLeft: 'auto',
    },
  },
});

interface TopToolbarProps {
  Toolbar: JSX.Element;
  saveAction?: (payload: any) => void;
  language: ILanguage;
}
export default function TopToolbar({ Toolbar, saveAction, language }: TopToolbarProps) {
  const classes = useStyles();
  return (
    <section className={classes.toolbar}>
      {Toolbar}
      <TopToolbarButton
        onClick={saveAction || (() => undefined)}
        disabled={!saveAction}
        startIcon={<AiOutlineSave />}
      >
        {getTranslation('save_data_model', language)}
      </TopToolbarButton>
    </section>
  );
}

TopToolbar.defaultProps = {
  saveAction: undefined,
};
