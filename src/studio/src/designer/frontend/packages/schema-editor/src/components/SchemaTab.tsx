import * as React from 'react';
import { Tab, withStyles } from '@material-ui/core';
import { ILanguage } from '../types';
import { getTranslation } from '../utils';

export interface ISchemaTabProps {
  label: string;
  value: string;
  language: ILanguage;
  hide?: boolean;
}

export const SchemaTab = withStyles((theme) => ({
  root: {
    minWidth: 70,
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&$selected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
  selected: {},
}))((props: ISchemaTabProps) => {
  const {
    label, value, hide, language, ...other
  } = props;
  return <Tab
    label={getTranslation(label, language)}
    id={`inspector-tab-${value}`}
    value={value}
    hidden={hide}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...other}
  />;
});
