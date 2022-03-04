import * as React from 'react';
import { makeStyles, Tab } from '@material-ui/core';
import { ILanguage } from '../types';
import { getTranslation } from '../utils';

export interface ISchemaTabProps {
  label: string;
  value: string;
  language: ILanguage;
  hide?: boolean;
}

const useStyles = makeStyles((theme) => ({
  root: {
    minWidth: 70,
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&:selected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
  wrapper: {
    textTransform: 'none',
    fontSize: 16,
    fontWeight: 500
  },
}));

export const SchemaTab = ((props: ISchemaTabProps) => {
  const {
    label, value, hide, language, ...other
  } = props;
  const classes = useStyles();
  return <Tab
    label={getTranslation(label, language)}
    classes={classes}
    id={`inspector-tab-${value}`}
    value={value}
    hidden={hide}
    {...other}
  />;
});
